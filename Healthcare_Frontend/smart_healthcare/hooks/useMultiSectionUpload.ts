import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { reportApi } from "@/lib/api/report.api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SectionStatus =
  | "idle"         // no files chosen yet
  | "uploading"    // POST /images/upload in flight
  | "processing"   // BullMQ job running (waiting for socket event)
  | "done"         // worker finished, reportId resolved
  | "error";       // upload or processing failed

export interface UploadSection {
  sectionId: string;   // uuid — local only, never sent to backend
  files: File[];
  status: SectionStatus;
  jobId?: string;      // returned by POST /images/upload
  reportId?: string;   // resolved via task:completed socket event
  reportName?: string; // resolved via task:completed socket event
  errorMsg?: string;
}

export interface UseMultiSectionUploadReturn {
  sections: UploadSection[];
  /** Add a new blank section at the end */
  addSection: () => void;
  /** Remove a section (only if idle or error) */
  removeSection: (sectionId: string) => void;
  /** Set the files for a section and immediately trigger upload */
  uploadSection: (sectionId: string, files: File[]) => Promise<void>;
  /** True while analyzeSelected is in flight */
  isAnalyzing: boolean;
  /** Number of sections that have fully completed (have a reportId) */
  completedReportCount: number;
  /** The resolved MongoDB Report IDs — pass these to analyzeByIds */
  completedReportIds: string[];
  /** Trigger POST /analysis/reports with all resolved reportIds */
  analyzeSelected: () => Promise<any>;
  /** The final analysis result returned from the backend */
  analysisResult: any | null;
  analysisError: string | null;
  /** Reset everything — useful when the user wants to start fresh */
  reset: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function makeBlankSection(): UploadSection {
  return { sectionId: makeId(), files: [], status: "idle" };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * useMultiSectionUpload
 *
 * Manages the "current session" upload flow:
 *   1. User adds sections (one per report document, e.g. blood test, MRI)
 *   2. Each section independently uploads its images via POST /images/upload
 *   3. A Socket.IO listener watches for `task:completed` events from the worker
 *      and resolves the MongoDB reportId for the matching jobId
 *   4. When all desired sections are done, `analyzeSelected()` calls
 *      POST /analysis/reports with the collected reportIds
 *
 * The socket uses cookie-based auth (withCredentials: true) — no token needed.
 */
export function useMultiSectionUpload(): UseMultiSectionUploadReturn {
  const [sections, setSections] = useState<UploadSection[]>([makeBlankSection()]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Keep a ref so socket callbacks always see fresh sections state
  const sectionsRef = useRef(sections);
  useEffect(() => { sectionsRef.current = sections; }, [sections]);

  const socketRef = useRef<Socket | null>(null);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    const AI_URL = process.env.NEXT_PUBLIC_API_AI || "http://localhost:8000"; // kept for HTTP calls

    // Socket must NOT use AI_URL ("/api/ai" in Docker) — that becomes a
    // Socket.IO *namespace* and "/api/ai" does NOT exist on the server.
    // NEXT_PUBLIC_SOCKET_URL:
    //   • Local dev  → "http://localhost:4006"  (direct to ai-service)
    //   • Docker     → "" (blank)  → falls back to window.origin → Nginx /socket.io/ → ai-service:4006
    const SOCKET_URL =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" ? window.location.origin : "http://localhost:8000");

    const socket = io(SOCKET_URL, {
      withCredentials: true, // backend reads JWT from cookie
      // polling first — required for Nginx WebSocket upgrade handshake
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Worker emits task:completed → { jobId, result: { savedReportId, reportName, ... } }
    socket.on("task:completed", (data: { jobId: string; result: any }) => {
      const { jobId, result } = data;
      setSections((prev) =>
        prev.map((s) => {
          if (s.jobId !== jobId) return s;
          return {
            ...s,
            status: "done",
            reportId: result?.savedReportId ?? result?.reportId,
            reportName: result?.reportName,
          };
        })
      );
    });

    // Worker emits task:failed → { jobId, error }
    socket.on("task:failed", (data: { jobId: string; error: string }) => {
      const { jobId, error } = data;
      setSections((prev) =>
        prev.map((s) => {
          if (s.jobId !== jobId) return s;
          return { ...s, status: "error", errorMsg: error };
        })
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Section actions ────────────────────────────────────────────────────────

  const addSection = useCallback(() => {
    setSections((prev) => [...prev, makeBlankSection()]);
  }, []);

  const removeSection = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev.filter((s) => {
        // Only allow removing sections that are idle or errored
        if (s.sectionId !== sectionId) return true;
        return s.status === "uploading" || s.status === "processing" || s.status === "done";
      })
    );
  }, []);

  const uploadSection = useCallback(
    async (sectionId: string, files: File[]) => {
      if (!files || files.length === 0) return;

      // Mark as uploading and attach files
      setSections((prev) =>
        prev.map((s) =>
          s.sectionId === sectionId
            ? { ...s, files, status: "uploading", errorMsg: undefined }
            : s
        )
      );

      try {
        const { jobId } = await reportApi.uploadSection(files);

        // Mark as processing and store jobId (socket will resolve it to reportId)
        setSections((prev) =>
          prev.map((s) =>
            s.sectionId === sectionId
              ? { ...s, status: "processing", jobId }
              : s
          )
        );
      } catch (err: any) {
        setSections((prev) =>
          prev.map((s) =>
            s.sectionId === sectionId
              ? { ...s, status: "error", errorMsg: err?.message || "Upload failed" }
              : s
          )
        );
      }
    },
    []
  );

  // ── Derived values ─────────────────────────────────────────────────────────

  const completedSections = sections.filter(
    (s) => s.status === "done" && s.reportId
  );
  const completedReportCount = completedSections.length;
  const completedReportIds = completedSections.map((s) => s.reportId as string);

  // ── Analyze ──────────────────────────────────────────────────────────────

  const analyzeSelected = useCallback(async () => {
    const ids = sectionsRef.current
      .filter((s) => s.status === "done" && s.reportId)
      .map((s) => s.reportId as string);

    if (ids.length === 0) {
      setAnalysisError("No completed reports to analyze yet.");
      return null;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await reportApi.analyzeByIds(ids);
      setAnalysisResult(result);
      return result;
    } catch (err: any) {
      setAnalysisError(err?.message || "Analysis failed.");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    setSections([makeBlankSection()]);
    setIsAnalyzing(false);
    setAnalysisResult(null);
    setAnalysisError(null);
  }, []);

  return {
    sections,
    addSection,
    removeSection,
    uploadSection,
    isAnalyzing,
    completedReportCount,
    completedReportIds,
    analyzeSelected,
    analysisResult,
    analysisError,
    reset,
  };
}
