"use client";

import React from "react";
import { AiStatusStep } from "@/hooks/useNovaChat";
import { motion } from "framer-motion";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingIndicatorProps {
  status: AiStatusStep;
  agentName: string | null;
}

export function ThinkingIndicator({ status, agentName }: ThinkingIndicatorProps) {
  if (status === "idle" || status === "completed" || status === "error") {
    return null;
  }

  // Interpret system status into user-friendly text
  let statusText = "Nova is thinking...";
  let isAction = false;
  let accentColor = "from-cyan-500 to-blue-500";
  let glowColor = "shadow-[0_0_20px_rgba(6,182,212,0.4)]";
  let textColor = "text-cyan-400";
  let borderColor = "border-cyan-500/40";

  switch (status) {
    case "improving_query":
      statusText = "Analyzing intent...";
      break;
    case "generating":
      statusText = "Synthesizing response...";
      accentColor = "from-purple-500 to-violet-500";
      glowColor = "shadow-[0_0_20px_rgba(168,85,247,0.4)]";
      textColor = "text-purple-400";
      borderColor = "border-purple-500/40";
      break;
    case "tool_called":
    case "handoff_requested":
      statusText = "Accessing secure records...";
      accentColor = "from-emerald-500 to-teal-500";
      glowColor = "shadow-[0_0_20px_rgba(16,185,129,0.4)]";
      textColor = "text-emerald-400";
      borderColor = "border-emerald-500/40";
      isAction = true;
      break;
    case "tool_output":
    case "handoff_occurred":
      statusText = "Processing data...";
      accentColor = "from-indigo-500 to-cyan-500";
      glowColor = "shadow-[0_0_20px_rgba(99,102,241,0.4)]";
      textColor = "text-indigo-400";
      borderColor = "border-indigo-500/40";
      isAction = true;
      break;
    default:
      break;
  }

  return (
    <div className="flex w-full justify-start mb-6 mt-2 ml-4">
      <div className={cn(
        "flex items-center gap-4 max-w-[85%] bg-black/60 backdrop-blur-xl border pl-2 pr-6 py-3 rounded-full transition-all duration-500",
        borderColor,
        glowColor
      )}>
        {/* Pulsing Neural Core */}
        <div className="relative flex items-center justify-center w-10 h-10">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={cn("absolute inset-0 rounded-full bg-gradient-to-br blur-md opacity-60 mix-blend-screen", accentColor)}
          />
          <div className="relative w-8 h-8 bg-black rounded-full border border-white/20 flex items-center justify-center z-10 shadow-inner">
             <BrainCircuit className={cn("w-4 h-4 drop-shadow-[0_0_5px_currentColor]", textColor)} />
          </div>
        </div>
        
        <div className="flex flex-col justify-center">
          <div className="flex items-center gap-2">
            {agentName && agentName !== "HealthBrain" && (
              <span className={cn(
                "text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r bg-clip-text text-transparent drop-shadow-md",
                accentColor
              )}>
                {agentName}
              </span>
            )}
          </div>
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className={cn(
              "text-xs font-semibold tracking-widest uppercase drop-shadow-sm leading-none mt-1 whitespace-nowrap",
              textColor
            )}
          >
            {statusText}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
