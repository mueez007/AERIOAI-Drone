"use client";

import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  className?: string;
}

export default function MessageBubble({
  role,
  content,
  timestamp,
  className,
}: MessageBubbleProps) {
  const isAssistant = role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        !isAssistant && "flex-row-reverse",
        className
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
          isAssistant
            ? "bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-green)] text-black"
            : "bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]"
        )}
      >
        {isAssistant ? "AI" : "U"}
      </div>

      {/* Content */}
      <div className="max-w-[75%] space-y-1">
        <div
          className={cn(
            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
            isAssistant
              ? "bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-tl-sm"
              : "bg-gradient-to-br from-[var(--accent-cyan)]/20 to-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/20 text-[var(--text-primary)] rounded-tr-sm"
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        <p
          className={cn(
            "text-[10px] text-[var(--text-muted)]",
            isAssistant ? "text-left" : "text-right"
          )}
        >
          {new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
