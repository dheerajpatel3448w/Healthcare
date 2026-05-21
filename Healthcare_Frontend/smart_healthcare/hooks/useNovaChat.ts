import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { patientApi } from "@/lib/api/patient.api";
import axios from "axios";

export type MessageRole = "user" | "ai";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
}

export type AiStatusStep = 
  | "idle" 
  | "improving_query" 
  | "verifying_doctor" 
  | "generating" 
  | "tool_called" 
  | "tool_output" 
  | "handoff_requested" 
  | "handoff_occurred"
  | "completed"
  | "error";

export interface UseNovaChatReturn {
  messages: ChatMessage[];
  isThinking: boolean;
  statusStep: AiStatusStep;
  activeAgent: string | null;
  submitQuery: (query: string) => void;
  isLoadingHistory: boolean;
}

export function useNovaChat(): UseNovaChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [statusStep, setStatusStep] = useState<AiStatusStep>("idle");
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Load History on Mount ──────────────────────────────────────────────────
  useEffect(() => {
    let isCancelled = false;

    async function loadHistory() {
      try {
        const AI_API = process.env.NEXT_PUBLIC_API_AI || "http://localhost:8000";
        const res = await axios.get(`${AI_API}/ai/history`, { withCredentials: true });
        
        if (!isCancelled && res.data?.history) {
          // History comes back newest-first, we need oldest-first for chat UI
          const formatted: ChatMessage[] = [];
          
          [...res.data.history].reverse().forEach((item: any) => {
            formatted.push({
              id: `usr_${item._id}`,
              role: "user",
              content: item.userQuery,
              timestamp: item.timestamp,
            });
            formatted.push({
              id: `ai_${item._id}`,
              role: "ai",
              content: item.aiResponse,
              timestamp: item.timestamp,
            });
          });
          
          setMessages(formatted);
        }
      } catch (err) {
        console.error("Failed to load AI history:", err);
      } finally {
        if (!isCancelled) setIsLoadingHistory(false);
      }
    }

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, []);

  // ── Socket Connection ──────────────────────────────────────────────────────
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
      withCredentials: true,
      // polling first — required for Nginx WebSocket upgrade handshake
      transports: ["polling", "websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // 1. Status lifecycle
    socket.on("ai:status", ({ step }: { step: AiStatusStep }) => {
      setStatusStep(step);
    });

    // 2. Active agent updates (handoffs)
    socket.on("ai:agent_update", ({ agentName }: { agentName: string }) => {
      setActiveAgent(agentName);
    });

    // 3. Token streaming (character by character)
    socket.on("ai:token", ({ delta }: { delta: string }) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (!lastMsg || lastMsg.role !== "ai") return prev;

        const updatedMessages = [...prev];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMsg,
          content: lastMsg.content + delta,
        };
        return updatedMessages;
      });
    });

    // 4. Stream completed
    socket.on("ai:done", () => {
      setIsThinking(false);
      setStatusStep("completed");
      setTimeout(() => setStatusStep("idle"), 2000);
      setActiveAgent(null);
    });

    // 5. Error handling
    socket.on("ai:error", ({ message }: { message: string }) => {
      setIsThinking(false);
      setStatusStep("error");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "ai",
          content: `**Error:** ${message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
      setTimeout(() => setStatusStep("idle"), 4000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ── Action Handlers ────────────────────────────────────────────────────────
  const submitQuery = useCallback((query: string) => {
    if (!query.trim() || !socketRef.current) return;

    // 1. Instantly append user message to UI
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: Date.now().toString() + "_u",
        role: "user",
        content: query,
        timestamp: new Date().toISOString(),
      },
      // 2. Append empty AI message placeholder for the stream
      {
        id: Date.now().toString() + "_ai",
        role: "ai",
        content: "",
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(newMessages);

    // 3. Reset statuses
    setIsThinking(true);
    setStatusStep("improving_query");
    setActiveAgent("HealthBrain");

    // 4. Emit query
    socketRef.current.emit("ai:query", { query });
  }, [messages]);

  return {
    messages,
    isThinking,
    statusStep,
    activeAgent,
    submitQuery,
    isLoadingHistory,
  };
}
