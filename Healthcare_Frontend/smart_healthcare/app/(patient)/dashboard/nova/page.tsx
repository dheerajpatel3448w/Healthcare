"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNovaChat } from "@/hooks/useNovaChat";
import { MessageBubble } from "@/components/patient/nova/MessageBubble";
import { ThinkingIndicator } from "@/components/patient/nova/ThinkingIndicator";
import { ThreeBackground } from "@/components/patient/nova/ThreeBackground";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, BrainCircuit, Activity, ArrowLeft } from "lucide-react";
import { Toaster, toast } from "sonner";
import { useWindowSize } from "react-use";
import * as Tooltip from "@radix-ui/react-tooltip";

export default function NovaAIPage() {
  const router = useRouter();
  const { messages, submitQuery, isThinking, statusStep, activeAgent, isLoadingHistory } = useNovaChat();
  const [inputValue, setInputValue] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();

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
    // Re-focus input after send on desktop
    if (width > 768) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const suggestedPrompts = [
    "Analyze my recent lab report",
    "What do my symptoms mean?",
    "Schedule a follow-up appointment",
    "Explain my current medication",
  ];

  return (
    <div className="relative flex flex-col h-[calc(100vh-120px)] w-full rounded-[2.5rem] border border-white/5 bg-black overflow-hidden shadow-[0_0_80px_rgba(6,182,212,0.15)]">
      
      {/* Interactive 3D Background */}
      <ThreeBackground />

      {/* Ambient Cyberpunk Glows */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex items-center justify-between px-8 py-6 bg-black/40 backdrop-blur-2xl border-b border-white/10 shrink-0">
        <div className="flex items-center gap-6">
          <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all text-zinc-400 hover:text-cyan-400 group backdrop-blur-md"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-300" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content 
                  className="bg-black/90 backdrop-blur-md border border-cyan-500/40 text-cyan-100 text-xs px-3 py-1.5 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)] font-medium tracking-wide z-50"
                  sideOffset={5}
                >
                  Back to Dashboard
                  <Tooltip.Arrow className="fill-cyan-500/40" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
          
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="w-14 h-14 rounded-full bg-black/60 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] group-hover:border-cyan-400 backdrop-blur-xl transition-all duration-500">
                <BrainCircuit className="w-7 h-7 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              </div>
              {/* Online indicator */}
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-cyan-400 rounded-full border-[3px] border-black shadow-[0_0_10px_rgba(6,182,212,1)] animate-pulse" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">Nova AI</h1>
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">
                Next-Gen Medical Assistant
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Chat Area ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-cyan-900/50 scrollbar-track-transparent">
        {isLoadingHistory ? (
          <div className="flex h-full items-center justify-center space-y-6 flex-col opacity-80">
            <motion.div 
               animate={{ rotate: 360 }}
               transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
               className="relative w-16 h-16"
            >
              <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
              <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
            </motion.div>
            <span className="text-sm text-cyan-400/80 animate-pulse font-medium tracking-widest uppercase">Initializing Neural Link...</span>
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
              <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-[60px] animate-pulse group-hover:bg-cyan-400/30 transition-all duration-700" />
              <div className="absolute inset-4 bg-purple-500/20 rounded-full blur-[30px]" />
              <div className="relative w-28 h-28 rounded-full bg-black/60 backdrop-blur-xl border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] flex items-center justify-center group-hover:border-cyan-400/60 transition-all duration-700 group-hover:scale-105">
                <Sparkles className="w-12 h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl sm:text-5xl font-light tracking-tighter text-white drop-shadow-2xl">
                I am <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">Nova.</span>
              </h2>
              <p className="text-lg text-zinc-400 leading-relaxed mx-auto max-w-xl font-light">
                Your highly advanced medical intelligence. I analyze deep clinical data, extract insights from labs, and guide your health decisions with precision.
              </p>
            </div>

            {/* Suggested Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-8">
              {suggestedPrompts.map((prompt, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setInputValue(prompt); inputRef.current?.focus(); }}
                  className="px-6 py-4 text-sm font-medium text-zinc-300 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl hover:bg-cyan-950/40 hover:border-cyan-500/50 hover:text-cyan-100 hover:shadow-[0_0_30px_rgba(6,182,212,0.2)] transition-all text-left flex items-center gap-4 group"
                >
                  <Activity className="w-5 h-5 text-cyan-500/60 shrink-0 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.8)] transition-all" />
                  {prompt}
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col min-h-full justify-end max-w-4xl mx-auto">
            <div className="space-y-10 pb-6">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 30, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <MessageBubble message={msg} />
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {/* Animated Thinking Indicator */}
              <AnimatePresence>
                {isThinking && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                    transition={{ duration: 0.4 }}
                  >
                    <ThinkingIndicator status={statusStep} agentName={activeAgent} />
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Dummy div to scroll to bottom */}
              <div ref={endOfMessagesRef} className="h-4" />
            </div>
          </div>
        )}
      </div>

      {/* ─── Input Area ───────────────────────────────────────────────────── */}
      <div className="relative z-20 pb-8 pt-4 px-4 sm:px-8 bg-gradient-to-t from-black via-black/90 to-transparent shrink-0 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto relative group">
          {/* Outer glow ring on focus */}
          <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/30 via-purple-500/30 to-cyan-500/30 rounded-[2.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
          
          <div className="relative flex items-end gap-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-2 pr-3 shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all duration-300 group-focus-within:border-cyan-500/50 group-focus-within:bg-black/80">
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
              placeholder="Initialize query..."
              className="flex-1 max-h-40 min-h-[50px] bg-transparent text-base sm:text-lg text-white placeholder-zinc-600 resize-none py-4 px-6 focus:outline-none scrollbar-thin scrollbar-thumb-cyan-900/80 leading-relaxed font-medium"
              disabled={isThinking || isLoadingHistory}
            />
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isThinking || isLoadingHistory}
              className={`w-14 h-14 flex-shrink-0 flex items-center justify-center rounded-full transition-all duration-500 mb-0.5
                ${inputValue.trim() && !isThinking
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_30px_rgba(6,182,212,0.6)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] hover:scale-110"
                  : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/10"
                }`}
            >
              <Send className={`w-6 h-6 ml-0.5 ${inputValue.trim() && !isThinking ? "drop-shadow-md text-black" : ""}`} />
            </button>
          </div>
        </div>
        <div className="text-center mt-5">
           <span className="text-[10px] sm:text-xs text-zinc-600 font-medium tracking-[0.1em] uppercase">
             Nova AI System // Medical Intelligence // Beta Core v1.0.4
           </span>
        </div>
      </div>
      
      {/* Toast Notifications */}
      <Toaster theme="dark" toastOptions={{ className: 'bg-black/80 backdrop-blur-xl border border-cyan-500/30 text-cyan-50 shadow-[0_0_30px_rgba(6,182,212,0.2)]' }} />
    </div>
  );
}
