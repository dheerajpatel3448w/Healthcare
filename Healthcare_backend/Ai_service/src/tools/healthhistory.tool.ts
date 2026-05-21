import { tool } from "@openai/agents";
import { z } from "zod";
import mongoose from "mongoose";
import { Report } from "../models/report.model.js";
import { ReportAnalysis } from "../models/overallreprot.model.js";
import { Appointment } from "../models/Appointment.model.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: extract a numeric value from a mixed analysis object by key
// ─────────────────────────────────────────────────────────────────────────────
function extractMetricValue(analysis: any, metricName: string): number | null {
  if (!analysis || typeof analysis !== "object") return null;

  const lowerMetric = metricName.toLowerCase();

  // Walk all keys in analysis recursively to find a value that matches
  const walk = (obj: any): number | null => {
    for (const key of Object.keys(obj)) {
      const keyLower = key.toLowerCase();
      if (keyLower.includes(lowerMetric) || lowerMetric.includes(keyLower)) {
        const val = obj[key];
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsed = parseFloat(val.replace(/[^\d.]/g, ""));
          if (!isNaN(parsed)) return parsed;
        }
      }
      if (typeof obj[key] === "object" && obj[key] !== null) {
        const nested = walk(obj[key]);
        if (nested !== null) return nested;
      }
    }
    return null;
  };

  return walk(analysis);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute linear trend direction from an array of { date, value }
// ─────────────────────────────────────────────────────────────────────────────
function computeTrend(
  dataPoints: { date: Date; value: number }[]
): { trend: string; percentageChange: number } {
  if (dataPoints.length < 2) return { trend: "insufficient_data", percentageChange: 0 };

  const sorted = [...dataPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
  if (sorted.length < 2) return { trend: "insufficient_data", percentageChange: 0 };
  const firstPt = sorted[0] as { date: Date; value: number };
  const lastPt  = sorted[sorted.length - 1] as { date: Date; value: number };
  const first = firstPt.value;
  const last  = lastPt.value;


  if (first === 0) return { trend: "stable", percentageChange: 0 };

  const percentageChange = ((last - first) / first) * 100;

  // Determine direction
  let trend: string;
  const variances = sorted.map((p, i) =>
    i === 0 ? 0 : p.value - (sorted[i - 1] as { date: Date; value: number }).value
  );
  const positiveChanges = variances.filter((v) => v > 0).length;
  const negativeChanges = variances.filter((v) => v < 0).length;

  if (Math.abs(percentageChange) < 5) {
    trend = "stable";
  } else if (positiveChanges > negativeChanges * 2) {
    trend = "improving"; // rising consistently
  } else if (negativeChanges > positiveChanges * 2) {
    trend = "declining"; // falling consistently
  } else {
    trend = "fluctuating";
  }

  return { trend, percentageChange: parseFloat(percentageChange.toFixed(1)) };
}

// ─────────────────────────────────────────────────────────────────────────────
// ✅ TOOL 1: fetch_medical_timeline
// Foundation tool — builds a unified chronological timeline of ALL medical events
// (reports + appointments + analyses). All other tools depend on this context.
// ─────────────────────────────────────────────────────────────────────────────
export const fetchMedicalTimelineTool = tool({
  name: "fetch_medical_timeline",
  description:
    "Fetch the complete chronological medical history of a user: all reports, ReportAnalysis entries, and appointment history. This is the foundation tool — call it FIRST before any other health history tool.",
  parameters: z.object({
    userId: z.string().describe("The user's MongoDB ObjectId."),
    limitReports: z
      .number()
      .optional().nullable()
      .default(10)
      .describe("Maximum number of reports to include. Default 10.")
  }),
  execute: async ({ userId, limitReports }) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          totalEvents: 0,
          timeline: [],
          message: "Invalid or missing userId. Cannot fetch medical timeline."
        };
      }
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Fetch reports (sorted newest first, limited, then reversed for chronological timeline)
      const reports = await Report.find({ patientId: userObjectId })
        .select("reportName reportType uploadedAt analysis extractedText")
        .sort({ uploadedAt: -1 })
        .limit(limitReports ?? 10)
        .lean();
      reports.reverse();

      // Fetch ReportAnalysis sessions (sorted newest first, limited to 5, then reversed)
      const analyses = await ReportAnalysis.find({ patientId: userObjectId })
        .select("reports.reportId finalAnalysis createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      analyses.reverse();

      // Fetch appointments (sorted newest first, limited to 10, then reversed)
      const appointments = await Appointment.find({
        userId: userObjectId,
        status: { $in: ["completed", "scheduled", "rescheduled"] }
      })
        .select("appointmentDate status consultationType reason doctorId")
        .populate("doctorId", "specialization")
        .sort({ appointmentDate: -1 })
        .limit(10)
        .lean();
      appointments.reverse();

      // Build unified timeline entries
      const timelineEntries: {
        date: Date;
        source: "report" | "analysis" | "appointment";
        type: string;
        id: string;
        summary: string;
        rawData?: any;
      }[] = [];

      for (const r of reports) {
        // Trim analysis to save massive token space. Do NOT return the parameters list in timeline!
        const trimmedAnalysis = r.analysis ? {
          summary: r.analysis.summary || "",
          conditionDetected: r.analysis.conditionDetected || "None detected",
          findings: r.analysis.findings || []
        } : null;

        timelineEntries.push({
          date: r.uploadedAt,
          source: "report",
          type: r.reportType,
          id: r._id.toString(),
          summary: `${r.reportType.toUpperCase()} Report: "${r.reportName || "Unnamed"}"`,
          rawData: trimmedAnalysis ? { report_analysis: trimmedAnalysis } : null
        });
      }

      for (const a of analyses) {
        // Trim finalAnalysis to only keep key summaries
        const trimmedFinal = a.finalAnalysis ? {
          overall_health_assessment: a.finalAnalysis.overall_health_assessment || "",
          likely_health_issue: a.finalAnalysis.likely_health_issue || "",
          confidence_score: a.finalAnalysis.confidence_score ?? 1
        } : null;

        timelineEntries.push({
          date: a.createdAt,
          source: "analysis",
          type: "combined_analysis",
          id: a._id.toString(),
          summary: `Combined AI Analysis session covering ${a.reports?.length ?? 0} report(s)`,
          rawData: trimmedFinal ? { final_analysis: trimmedFinal } : null
        });
      }

      for (const appt of appointments) {
        const doctor = appt.doctorId as any;
        timelineEntries.push({
          date: appt.appointmentDate,
          source: "appointment",
          type: appt.consultationType || "consultation",
          id: appt._id.toString(),
          summary: `${appt.status} appointment — ${doctor?.specialization || "Unknown specialist"} (${appt.reason || "No reason specified"})`,
          rawData: null
        });
      }

      // Sort entire timeline chronologically
      timelineEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Compute date range
      const firstEvent = timelineEntries[0]?.date;
      const lastEvent = timelineEntries[timelineEntries.length - 1]?.date;
      const spanDays = firstEvent && lastEvent
        ? Math.round((lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        success: true,
        totalEvents: timelineEntries.length,
        totalReports: reports.length,
        totalAnalysisSessions: analyses.length,
        totalAppointments: appointments.length,
        spanDays,
        firstEventDate: firstEvent ?? null,
        lastEventDate: lastEvent ?? null,
        timeline: timelineEntries
      };
    } catch (error: any) {
      console.error("fetchMedicalTimelineTool error:", error);
      return {
        success: false,
        totalEvents: 0,
        timeline: [],
        message: "Failed to fetch medical timeline."
      };
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ✅ TOOL 2: detect_health_trends
// Metric-level trend detection across time.
// Scans all lab report analyses for a specific metric (e.g. Hemoglobin, Glucose)
// and computes whether it is improving, declining, stable, or fluctuating.
// ─────────────────────────────────────────────────────────────────────────────
export const detectHealthTrendsTool = tool({
  name: "detect_health_trends",
  description:
    "Detect the trend of a specific health metric over time across all past lab reports (e.g. Hemoglobin, Blood Glucose, Creatinine, WBC). Returns data points, trend direction, and percentage change. Call this for any metric the user or symptom agent wants tracked.",
  parameters: z.object({
    userId: z.string().describe("The user's MongoDB ObjectId."),
    metricNames: z
      .array(z.string())
      .describe(
        "One or more metric names to track, e.g. ['Hemoglobin', 'Blood Glucose', 'Systolic BP']. Provide the most likely names as they appear in lab reports."
      )
  }),
  execute: async ({ userId, metricNames }) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          trends: [],
          message: "Invalid or missing userId. Cannot detect health trends."
        };
      }
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Only scan lab reports (limited to latest 15 reports for trend analysis)
      const labReports = await Report.find({
        patientId: userObjectId,
        reportType: "lab"
      })
        .select("uploadedAt analysis reportName")
        .sort({ uploadedAt: -1 })
        .limit(15)
        .lean();
      labReports.reverse();

      if (!labReports || labReports.length === 0) {
        return {
          success: false,
          message: "No lab reports found for trend analysis.",
          trends: []
        };
      }

      const trends = metricNames.map((metricName) => {
        const dataPoints: { date: Date; value: number; reportName: string }[] = [];

        for (const report of labReports) {
          if (!report.analysis) continue;
          const value = extractMetricValue(report.analysis, metricName);
          if (value !== null) {
            dataPoints.push({
              date: report.uploadedAt,
              value,
              reportName: report.reportName || "Unnamed Report"
            });
          }
        }

        if (dataPoints.length === 0) {
          return {
            metric: metricName,
            dataPoints: [],
            trend: "not_found",
            percentageChange: 0,
            clinicalNote: `No values found for "${metricName}" in any lab report.`
          };
        }

        const { trend, percentageChange } = computeTrend(dataPoints);

        // Generate clinical note (safe — dataPoints.length > 0 is checked above)
        const first = dataPoints[0]!;
        const last = dataPoints[dataPoints.length - 1]!;
        let clinicalNote = `${metricName}: ${first.value} (${new Date(first.date).toLocaleDateString("en-IN")}) → ${last.value} (${new Date(last.date).toLocaleDateString("en-IN")}). `;

        if (trend === "declining")
          clinicalNote += `⬇️ Declining by ${Math.abs(percentageChange)}%. Warrants attention.`;
        else if (trend === "improving")
          clinicalNote += `⬆️ Improving by ${percentageChange}%. Positive trajectory.`;
        else if (trend === "stable")
          clinicalNote += `➡️ Stable. No significant change.`;
        else if (trend === "fluctuating")
          clinicalNote += `↕️ Fluctuating. Values inconsistent — check for lifestyle or treatment changes.`;

        return {
          metric: metricName,
          dataPoints,
          trend,
          percentageChange,
          firstReading: first,
          latestReading: last,
          totalReadings: dataPoints.length,
          clinicalNote
        };
      });

      return {
        success: true,
        totalReportsScanned: labReports.length,
        trends
      };
    } catch (error: any) {
      console.error("detectHealthTrendsTool error:", error);
      return {
        success: false,
        trends: [],
        message: "Trend detection failed."
      };
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ✅ TOOL 3: detect_risk_patterns
// Long-term risk pattern recognition engine.
// Scans the full history to identify recurring conditions, repeat specialist
// visits, chronic abnormal values, and patterns across ALL report types.
// ─────────────────────────────────────────────────────────────────────────────
export const detectRiskPatternsTool = tool({
  name: "detect_risk_patterns",
  description:
    "Scan the user's complete medical history to detect long-term risk patterns: recurring conditions, consistently abnormal values, repeat specialist visits, or systematic health deterioration. Returns structured risk patterns with severity, firstSeen, lastSeen, and frequency.",
  parameters: z.object({
    userId: z.string().describe("The user's MongoDB ObjectId.")
  }),
  execute: async ({ userId }) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          patterns: [],
          message: "Invalid or missing userId. Cannot detect risk patterns."
        };
      }
      const userObjectId = new mongoose.Types.ObjectId(userId);

      // Fetch everything needed for pattern detection (limited to protect context window size)
      const [reports, appointments, analyses] = await Promise.all([
        Report.find({ patientId: userObjectId })
          .select("reportType uploadedAt analysis reportName")
          .sort({ uploadedAt: -1 })
          .limit(20)
          .lean(),
        Appointment.find({
          userId: userObjectId,
          status: { $in: ["completed", "scheduled", "rescheduled"] }
        })
          .select("appointmentDate reason doctorId")
          .populate("doctorId", "specialization")
          .sort({ appointmentDate: -1 })
          .limit(20)
          .lean(),
        ReportAnalysis.find({ patientId: userObjectId })
          .select("finalAnalysis createdAt")
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      ]);

      // Reverse to maintain oldest-to-newest chronological order for pattern detection
      reports.reverse();
      appointments.reverse();
      analyses.reverse();

      const detectedPatterns: {
        pattern: string;
        category: string;
        frequency: number;
        firstSeen: Date;
        lastSeen: Date;
        riskLevel: "low" | "moderate" | "high";
        evidence: string[];
      }[] = [];

      // ── Pattern 1: Recurring Specialist Visits ────────────────────────────
      const specialistVisits: Record<string, Date[]> = {};
      for (const appt of appointments) {
        const doctor = appt.doctorId as any;
        const spec = doctor?.specialization || "Unknown";
        if (!specialistVisits[spec]) specialistVisits[spec] = [];
        specialistVisits[spec].push(appt.appointmentDate);
      }

      for (const [spec, dates] of Object.entries(specialistVisits)) {
        if (dates.length >= 2) {
          const firstDate = dates[0]!;
          const lastDate  = dates[dates.length - 1]!;
          detectedPatterns.push({
            pattern: `Recurring visits to ${spec}`,
            category: "repeat_specialist_visit",
            frequency: dates.length,
            firstSeen: firstDate,
            lastSeen: lastDate,
            riskLevel: dates.length >= 4 ? "high" : dates.length >= 3 ? "moderate" : "low",
            evidence: [`Visited ${spec} ${dates.length} time(s) since ${firstDate.toLocaleDateString("en-IN")}`]
          });
        }
      }

      // ── Pattern 2: Chronic Abnormal Lab Values ────────────────────────────
      const CHRONIC_RISK_KEYWORDS = [
        { keywords: ["anemia", "low hemoglobin", "low hb"], label: "Chronic Anemia Trend", risk: "high" as const },
        { keywords: ["high glucose", "diabetes", "hba1c", "high sugar"], label: "Diabetes / Hyperglycemia Trend", risk: "high" as const },
        { keywords: ["high bp", "hypertension", "elevated blood pressure"], label: "Hypertension Pattern", risk: "high" as const },
        { keywords: ["high cholesterol", "elevated ldl", "dyslipidemia"], label: "Dyslipidemia Risk Pattern", risk: "moderate" as const },
        { keywords: ["low vitamin d", "vitamin deficiency"], label: "Vitamin Deficiency Pattern", risk: "low" as const },
        { keywords: ["elevated creatinine", "kidney", "renal"], label: "Renal Function Concern", risk: "high" as const },
        { keywords: ["elevated liver", "alt", "ast", "sgot", "sgpt"], label: "Liver Enzyme Elevation", risk: "moderate" as const },
        { keywords: ["thyroid", "tsh", "hypothyroid", "hyperthyroid"], label: "Thyroid Abnormality", risk: "moderate" as const },
        { keywords: ["infection", "elevated wbc", "high wbc", "leucocytosis"], label: "Recurring Infections / Elevated WBC", risk: "moderate" as const }
      ];

      for (const pattern of CHRONIC_RISK_KEYWORDS) {
        const matchDates: Date[] = [];
        const evidence: string[] = [];

        for (const report of reports) {
          const text = (
            JSON.stringify(report.analysis || {}) + " " + ""
          ).toLowerCase();

          if (pattern.keywords.some((kw) => text.includes(kw))) {
            matchDates.push(report.uploadedAt);
            evidence.push(`"${report.reportName || report.reportType}" (${report.uploadedAt.toLocaleDateString("en-IN")})`);
          }
        }

        // Also check appointment reasons
        for (const appt of appointments) {
          const reason = (appt.reason || "").toLowerCase();
          if (pattern.keywords.some((kw) => reason.includes(kw))) {
            matchDates.push(appt.appointmentDate);
            evidence.push(`Appointment reason: "${appt.reason}" (${appt.appointmentDate.toLocaleDateString("en-IN")})`);
          }
        }

        if (matchDates.length >= 2) {
          const sortedDates = matchDates.sort((a, b) => a.getTime() - b.getTime());
          const sdFirst = sortedDates[0]!;
          const sdLast  = sortedDates[sortedDates.length - 1]!;
          detectedPatterns.push({
            pattern: pattern.label,
            category: "chronic_condition_signal",
            frequency: matchDates.length,
            firstSeen: sdFirst,
            lastSeen: sdLast,
            riskLevel: pattern.risk,
            evidence: evidence.slice(0, 5)
          });
        }
      }

      // ── Pattern 3: Worsening trend from finalAnalysis ─────────────────────
      const worseningMentions: Date[] = [];
      for (const analysis of analyses) {
        const text = JSON.stringify(analysis.finalAnalysis || {}).toLowerCase();
        if (text.includes("worsen") || text.includes("deteriorat") || text.includes("critical")) {
          worseningMentions.push(analysis.createdAt);
        }
      }

      if (worseningMentions.length >= 1) {
        const wmFirst = worseningMentions[0]!;
        const wmLast  = worseningMentions[worseningMentions.length - 1]!;
        detectedPatterns.push({
          pattern: "Worsening Health Trajectory in AI Analyses",
          category: "deterioration_signal",
          frequency: worseningMentions.length,
          firstSeen: wmFirst,
          lastSeen: wmLast,
          riskLevel: worseningMentions.length >= 3 ? "high" : "moderate",
          evidence: [`${worseningMentions.length} AI analysis session(s) flagged worsening or critical conditions`]
        });
      }

      // Sort by riskLevel descending
      const riskOrder = { high: 3, moderate: 2, low: 1 };
      detectedPatterns.sort(
        (a, b) => riskOrder[b.riskLevel] - riskOrder[a.riskLevel]
      );

      return {
        success: true,
        totalPatterns: detectedPatterns.length,
        highRiskPatterns: detectedPatterns.filter((p) => p.riskLevel === "high").length,
        patterns: detectedPatterns,
        summary:
          detectedPatterns.length === 0
            ? "No significant recurring risk patterns detected in health history."
            : `Detected ${detectedPatterns.length} pattern(s): ${detectedPatterns.map((p) => p.pattern).join("; ")}.`
      };
    } catch (error: any) {
      console.error("detectRiskPatternsTool error:", error);
      return {
        success: false,
        patterns: [],
        message: "Risk pattern detection failed."
      };
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ✅ TOOL 4: get_health_context_for_symptom
// The Context Provider — the most important tool for downstream agents.
// Given a list of symptom keywords, scans full history to find correlated
// historical signals and returns a ready-to-inject context summary string.
// Symptom Agent / HealthBrain calls this to enrich clinical decision making.
//
// Example:
//   Input:  symptoms = ["fatigue", "breathlessness"]
//   Output: correlation_strength: "strong"
//           matched_evidence: ["Hb 8.2 in last lab report", "Visited Hematologist 2x"]
//           context_summary: "Patient has a strong history correlating with current symptoms..."
// ─────────────────────────────────────────────────────────────────────────────
export const getHealthContextForSymptomTool = tool({
  name: "get_health_context_for_symptom",
  description:
    "Given the user's current symptoms, scan their full medical history to find correlated past findings, abnormal values, and specialist visits. Returns a correlation strength score and a ready-to-use clinical context summary for the Symptom Agent or HealthBrain. ALWAYS call this when current symptoms are present to enrich the clinical analysis.",
  parameters: z.object({
    userId: z.string().describe("The user's MongoDB ObjectId."),
    symptomKeywords: z
      .array(z.string())
      .describe(
        "Current symptom keywords to correlate against history, e.g. ['fatigue', 'breathlessness', 'chest pain', 'low energy']"
      )
  }),
  execute: async ({ userId, symptomKeywords }) => {
    try {
      if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return {
          success: false,
          correlationStrength: "none",
          correlationScore: 0,
          matchedEvidence: [],
          context_summary: "Invalid or missing userId. Cannot check historical health context.",
          message: "Invalid or missing userId."
        };
      }
      const userObjectId = new mongoose.Types.ObjectId(userId);
      const lowerKeywords = symptomKeywords.map((k) => k.toLowerCase());

      // Fetch all data sources for correlation
      const [reports, appointments, analyses] = await Promise.all([
        Report.find({ patientId: userObjectId })
          .select("reportType uploadedAt analysis reportName extractedText")
          .sort({ uploadedAt: -1 })
          .limit(20)
          .lean(),
        Appointment.find({
          userId: userObjectId,
          status: { $in: ["completed", "scheduled", "rescheduled"] }
        })
          .select("appointmentDate reason doctorId")
          .populate("doctorId", "specialization")
          .sort({ appointmentDate: -1 })
          .limit(10)
          .lean(),
        ReportAnalysis.findOne({ patientId: userObjectId })
          .sort({ createdAt: -1 })
          .lean()
      ]);

      const matchedEvidence: string[] = [];
      let correlationScore = 0;

      // ── Correlate symptoms with lab report analysis fields ─────────────────
      // Symptom → likely correlated lab markers
      const symptomToMarkers: Record<string, string[]> = {
        fatigue:        ["hemoglobin", "hb", "iron", "ferritin", "thyroid", "tsh", "vitamin b12", "glucose"],
        breathlessness: ["hemoglobin", "hb", "spo2", "oxygen", "peak flow", "fev"],
        "chest pain":   ["troponin", "ecg", "ck-mb", "ldl", "cholesterol", "bp"],
        weakness:       ["potassium", "sodium", "hemoglobin", "glucose", "thyroid"],
        dizziness:      ["bp", "blood pressure", "hemoglobin", "glucose", "sodium"],
        headache:       ["bp", "blood pressure", "glucose", "tsh"],
        swelling:       ["creatinine", "urea", "albumin", "kidney", "sodium"],
        jaundice:       ["bilirubin", "alt", "ast", "sgpt", "sgot", "liver"],
        "weight loss":  ["thyroid", "glucose", "hba1c", "cancer marker"],
        palpitation:    ["thyroid", "tsh", "potassium", "hemoglobin", "ecg"]
      };

      for (const symptom of lowerKeywords) {
        const markers = symptomToMarkers[symptom] || [];

        for (const report of reports) {
          const reportText = (
            JSON.stringify(report.analysis || {}) + " " +
            (report.extractedText || "").slice(0, 1000)
          ).toLowerCase();

          for (const marker of markers) {
            if (reportText.includes(marker)) {
              const evidenceStr = `"${report.reportName || report.reportType}" (${report.uploadedAt.toLocaleDateString("en-IN")}) contains ${marker} data — relevant to reported ${symptom}`;
              if (!matchedEvidence.includes(evidenceStr)) {
                matchedEvidence.push(evidenceStr);
                correlationScore += 2;
              }
            }
          }

          // Direct keyword match in report text
          for (const kw of lowerKeywords) {
            if (reportText.includes(kw)) {
              const evidenceStr = `"${report.reportName || report.reportType}" directly mentions "${kw}"`;
              if (!matchedEvidence.includes(evidenceStr)) {
                matchedEvidence.push(evidenceStr);
                correlationScore += 3;
              }
            }
          }
        }
      }

      // ── Correlate with appointment reasons ─────────────────────────────────
      for (const appt of appointments) {
        const reason = (appt.reason || "").toLowerCase();
        const doctor = appt.doctorId as any;

        for (const kw of lowerKeywords) {
          if (reason.includes(kw)) {
            matchedEvidence.push(
              `Past appointment reason was "${appt.reason}" (${new Date(appt.appointmentDate).toLocaleDateString("en-IN")}) — directly matches current symptom "${kw}"`
            );
            correlationScore += 4; // strong signal — same symptom before
          }
        }
      }

      // ── Correlate with recent AI analysis ─────────────────────────────────
      if (analyses?.finalAnalysis) {
        const finalText = JSON.stringify(analyses.finalAnalysis).toLowerCase();
        for (const kw of lowerKeywords) {
          if (finalText.includes(kw)) {
            matchedEvidence.push(
              `Recent AI report analysis flagged or mentioned "${kw}" — consistent with current presentation`
            );
            correlationScore += 3;
          }
        }
      }

      // ── Compute correlation strength ───────────────────────────────────────
      let correlationStrength: "strong" | "moderate" | "weak" | "none";
      if (correlationScore >= 12)      correlationStrength = "strong";
      else if (correlationScore >= 6)  correlationStrength = "moderate";
      else if (correlationScore >= 2)  correlationStrength = "weak";
      else                              correlationStrength = "none";

      // ── Build context summary string ───────────────────────────────────────
      const evidenceSummary = matchedEvidence.slice(0, 8).join("\n• ");
      const context_summary =
        correlationStrength === "none"
          ? `No historical medical evidence correlating with symptoms: ${symptomKeywords.join(", ")}. Analysis proceeding based on current symptoms only.`
          : `[${correlationStrength.toUpperCase()} HISTORICAL CORRELATION DETECTED]\n` +
            `Symptoms: ${symptomKeywords.join(", ")}\n` +
            `Correlation score: ${correlationScore}\n` +
            `Evidence from past history:\n• ${evidenceSummary}`;

      return {
        success: true,
        symptomKeywords,
        correlationStrength,
        correlationScore,
        matchedEvidence: matchedEvidence.slice(0, 8),
        context_summary,
        totalReportsChecked: reports.length,
        totalAppointmentsChecked: appointments.length
      };
    } catch (error: any) {
      console.error("getHealthContextForSymptomTool error:", error);
      return {
        success: false,
        correlationStrength: "none",
        correlationScore: 0,
        matchedEvidence: [],
        context_summary:
          "Historical correlation check failed. Proceeding based on current symptoms only.",
        message: "Error in health context retrieval."
      };
    }
  }
});
