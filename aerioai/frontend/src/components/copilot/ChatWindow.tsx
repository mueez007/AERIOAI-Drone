"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import Loader from "@/components/ui/Loader";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatWindowProps {
  messages: Message[];
  loading?: boolean;
  className?: string;
}

export default function ChatWindow({ messages, loading, className }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  return (
    <div className={cn("flex-1 overflow-y-auto p-4 space-y-4", className)}>
      {messages.length === 0 && (
        <div className="text-center py-8">
          <span className="text-3xl">🤖</span>
          <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">Start a conversation with AERIOAI</p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-3 animate-fade-in",
            msg.role === "user" && "flex-row-reverse"
          )}
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Avatar */}
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
              msg.role === "assistant"
                ? "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-green)] text-black"
                : "bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
            )}
          >
            {msg.role === "assistant" ? "AI" : "U"}
          </div>

          {/* Bubble */}
          <div
            className={cn(
              "max-w-[80%] p-3 rounded-xl text-xs",
              msg.role === "assistant"
                ? "bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]"
                : "bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]/30 text-[var(--text-primary)]"
            )}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
            <p className="text-[9px] text-[var(--text-muted)] mt-1.5 opacity-60">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}

      {loading && (
        <div className="flex gap-3 animate-fade-in">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-green)] flex items-center justify-center text-[10px] font-bold text-black">
            AI
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
            <Loader variant="dots" size="sm" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
