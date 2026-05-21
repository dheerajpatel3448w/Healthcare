"use client";

import React, { useState, useRef, useEffect } from "react";
import { useDoctorChat } from "@/hooks/useDoctorChat";
import { DoctorMessageBubble } from "@/components/doctor/ai/DoctorMessageBubble";
import { DoctorThinkingIndicator } from "@/components/doctor/ai/DoctorThinkingIndicator";
import { ThreeBackground } from "@/components/patient/nova/ThreeBackground";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Send, ArrowLeft } from "lucide-react";
import { Toaster } from "sonner";

export default function DoctorAIPage() {
  const router = useRouter();
  const { messages, submitQuery, isThinking, statusStep, activeAgent, isLoadingHistory } = useDoctorChat();
  const [inputValue, setInputValue] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, statusStep]);

  // Handle Input Submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || isThinking) return;
    submitQuery(inputValue);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-120px)] w-full max-w-5xl mx-auto rounded-[2.5rem] border border-white/5 bg-black overflow-hidden shadow-[0_0_80px_rgba(20,184,166,0.15)]">
      
      {/* Interactive 3D Background */}
      <ThreeBackground />

      {/* Ambient Cyberpunk Glows for Doctor (Teal/Emerald Theme) */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-teal-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 bg-black/40 backdrop-blur-2xl border-b border-white/10 shrink-0">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push("/dashboard/doctor")}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-teal-500/50 hover:shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all text-zinc-400 hover:text-teal-400 group backdrop-blur-md"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
          </button>
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="w-14 h-14 rounded-full bg-black/60 border border-teal-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(20,184,166,0.3)] group-hover:shadow-[0_0_40px_rgba(20,184,166,0.6)] group-hover:border-teal-400 backdrop-blur-xl transition-all duration-500">
                <BrainCircuit className="w-7 h-7 text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-teal-400 rounded-full border-[3px] border-black shadow-[0_0_10px_rgba(20,184,166,1)] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Doctor Brain AI</h1>
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-teal-400 drop-shadow-[0_0_5px_rgba(20,184,166,0.5)]">
                Clinical Intelligence Engine
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Chat Area ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-teal-900/50 scrollbar-track-transparent">
        {isLoadingHistory ? (
          <div className="flex h-full items-center justify-center space-y-6 flex-col opacity-80">
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="relative w-16 h-16"
            >
              <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
              <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
            </motion.div>
            <span className="text-sm text-teal-400/80 animate-pulse font-medium tracking-widest uppercase">Syncing Medical Database...</span>
          </div>
        ) : messages.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col h-full items-center justify-center gap-10 text-center px-4 max-w-3xl mx-auto mt-[-5vh]"
          >
            {/* Massive Glowing Core */}
            <div className="relative w-40 h-40 flex items-center justify-center group">
              <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-[60px] animate-pulse group-hover:bg-teal-400/30 transition-all duration-700" />
              <div className="absolute inset-4 bg-cyan-500/20 rounded-full blur-[30px]" />
              <div className="relative w-28 h-28 rounded-full bg-black/60 backdrop-blur-xl border border-teal-500/30 shadow-[0_0_50px_rgba(20,184,166,0.2)] flex items-center justify-center group-hover:border-teal-400/60 transition-all duration-700 group-hover:scale-105">
                <BrainCircuit className="w-12 h-12 text-teal-400 drop-shadow-[0_0_15px_rgba(20,184,166,0.8)]" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl sm:text-4xl font-light tracking-tighter text-white drop-shadow-2xl">
                Ready for <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400 drop-shadow-[0_0_20px_rgba(20,184,166,0.5)]">Clinical Analysis.</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed mx-auto max-w-xl font-light">
                I can help analyze lab results, cross-reference treatments, and query your patient schedules. What would you like to explore today?
              </p>
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col min-h-full justify-end">
            <div className="space-y-10 pb-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <DoctorMessageBubble message={msg} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <AnimatePresence>
                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                  >
                    <DoctorThinkingIndicator status={statusStep} agentName={activeAgent} />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div ref={endOfMessagesRef} className="h-4" />
            </div>
          </div>
        )}
      </div>

      {/* ─── Input Area ───────────────────────────────────────────────────── */}
      <div className="relative z-20 pb-8 pt-4 px-4 sm:px-8 bg-gradient-to-t from-black via-black/90 to-transparent shrink-0 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto relative group">
          {/* Outer glow ring on focus */}
          <div className="absolute -inset-2 bg-gradient-to-r from-teal-500/30 via-cyan-500/30 to-teal-500/30 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
          
          <div className="relative flex items-end gap-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 pr-3 shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all duration-300 group-focus-within:border-teal-500/50 group-focus-within:bg-black/80">
            <textarea
              ref={inputRef}
              tabIndex={0}
              rows={1}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
              }}
              onKeyDown={handleKeyDown}
              placeholder="Initialize clinical query..."
              className="flex-1 max-h-40 min-h-[50px] bg-transparent text-base sm:text-lg text-white placeholder-zinc-600 resize-none py-4 px-6 focus:outline-none scrollbar-thin scrollbar-thumb-teal-900/80 leading-relaxed font-medium"
              disabled={isThinking || isLoadingHistory}
            />
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isThinking || isLoadingHistory}
              className={`w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-500 mb-0.5
                ${inputValue.trim() && !isThinking
                  ? "bg-teal-500 hover:bg-teal-400 text-black shadow-[0_0_30px_rgba(20,184,166,0.6)] hover:shadow-[0_0_40px_rgba(20,184,166,0.8)] hover:scale-110"
                  : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/10"
                }`}
            >
              <Send className={`w-6 h-6 ml-0.5 ${inputValue.trim() && !isThinking ? "drop-shadow-md text-black" : ""}`} />
            </button>
          </div>
        </div>
        <div className="text-center mt-5">
           <span className="text-[10px] sm:text-xs text-zinc-600 font-medium tracking-[0.1em] uppercase">
             Doctor Brain System // Diagnostic Node // Secured Connection
           </span>
        </div>
      </div>
      
      <Toaster theme="dark" toastOptions={{ className: 'bg-black/80 backdrop-blur-xl border border-teal-500/30 text-teal-50 shadow-[0_0_30px_rgba(20,184,166,0.2)]' }} />
    </div>
  );
}
