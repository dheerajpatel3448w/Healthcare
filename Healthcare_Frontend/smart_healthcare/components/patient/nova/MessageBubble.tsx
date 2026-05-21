"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { ChatMessage } from "@/hooks/useNovaChat";
import { User, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex w-full mb-6 group", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex gap-3 max-w-[85%] sm:max-w-[75%]", isUser ? "flex-row-reverse" : "flex-row")}>
        
        {/* Avatar */}
        <div className={cn(
          "flex flex-shrink-0 items-center justify-center w-10 h-10 rounded-full border transition-all duration-300 backdrop-blur-md",
          isUser 
            ? "bg-black/60 border-cyan-900/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
            : "bg-black/80 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.6)]"
        )}>
          {isUser ? <User className="w-5 h-5 text-cyan-100" /> : <Sparkles className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />}
        </div>

        {/* Bubble */}
        <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
          <div className="flex items-center gap-2 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-500/70 drop-shadow-md">
              {isUser ? "You" : "Nova AI"}
            </span>
            <span className="w-1 h-1 rounded-full bg-cyan-800" />
            <span className="text-[10px] text-cyan-600/50 font-medium tracking-wide">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className={cn(
            "px-5 py-4 relative backdrop-blur-xl rounded-2xl",
            isUser 
              ? "bg-cyan-950/40 text-cyan-50 rounded-tr-sm border border-cyan-500/20 shadow-[0_4px_20px_-5px_rgba(6,182,212,0.2)]" 
              : "bg-black/60 text-zinc-200 rounded-tl-sm border border-white/10 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.5)]"
          )}>
            {/* Markdown Content */}
            <div className={cn(
              "prose prose-sm sm:prose-base max-w-none leading-relaxed prose-invert",
              !isUser && "prose-p:text-zinc-300 prose-headings:text-cyan-50 font-medium tracking-wide prose-strong:text-cyan-100 prose-strong:drop-shadow-sm prose-a:text-cyan-400 prose-code:text-cyan-300"
            )}>
               {/* Make sure we display something if the stream hasn't yielded tokens yet */}
              {!isUser && message.content === "" ? (
                <div className="flex gap-1.5 py-1 px-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-bounce drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-500 animate-bounce drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" style={{ animationDelay: "300ms" }} />
                </div>
              ) : (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <div className="mb-4 last:mb-0 leading-relaxed font-light tracking-wide">{children}</div>,
                    a: ({ node, ...props }) => <a className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-400/30 hover:decoration-cyan-400 transition-colors drop-shadow-sm" {...props} />,
                    code(props) {
                      const { children, className, node, ref, ...rest } = props;
                      const match = /language-(\w+)/.exec(className || "");
                      return match ? (
                        <div className="rounded-xl overflow-hidden border border-white/10 my-4 shadow-2xl">
                          <div className="bg-black/80 px-4 py-1.5 border-b border-white/5 flex items-center gap-2">
                             <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                             </div>
                             <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest ml-2">{match[1]}</span>
                          </div>
                          <SyntaxHighlighter
                            {...rest}
                            PreTag="div"
                            children={String(children).replace(/\n$/, "")}
                            language={match[1]}
                            style={vscDarkPlus as any}
                            customStyle={{ margin: 0, padding: '1.5rem', background: 'rgba(0,0,0,0.4)' }}
                          />
                        </div>
                      ) : (
                        <code {...rest} className="bg-cyan-950/40 text-cyan-200 border border-cyan-500/20 px-1.5 py-0.5 rounded-md text-sm font-mono shadow-inner">
                          {children}
                        </code>
                      );
                    },
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-6 border border-cyan-500/20 rounded-xl bg-black/40 shadow-[0_0_20px_rgba(6,182,212,0.05)] backdrop-blur-md">
                        <table className="min-w-full divide-y divide-white/5 text-sm">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-cyan-950/30 border-b border-cyan-500/30">{children}</thead>,
                    th: ({ children }) => <th className="px-5 py-4 text-left font-semibold text-cyan-100 tracking-wider text-xs uppercase">{children}</th>,
                    td: ({ children }) => <td className="px-5 py-3 whitespace-nowrap text-zinc-300 font-light border-t border-white/5">{children}</td>,
                    ul: ({ children }) => <ul className="space-y-2 marker:text-cyan-500/70 ml-4 mb-4 list-disc">{children}</ul>,
                    ol: ({ children }) => <ol className="space-y-2 marker:text-cyan-500/70 ml-4 mb-4 list-decimal font-medium">{children}</ol>,
                    strong: ({ children }) => <strong className="font-semibold text-cyan-50 drop-shadow-[0_0_8px_rgba(6,182,212,0.3)]">{children}</strong>,
                    blockquote: ({ children }) => <blockquote className="border-l-2 border-cyan-500/50 pl-4 py-1 my-4 bg-cyan-950/20 rounded-r-lg italic text-cyan-100/80">{children}</blockquote>
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
