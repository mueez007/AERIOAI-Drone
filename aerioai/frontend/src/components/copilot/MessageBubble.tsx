"use client";

import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '@/lib/constants';

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
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ node, ...props }) => {
                const src = props.src?.startsWith('/') ? `${API_BASE_URL}${props.src}` : props.src;
                return (
                  <img {...props} src={src} className="max-w-full max-h-32 object-contain rounded-lg my-1 cursor-pointer hover:opacity-90 transition-opacity shadow-sm" onClick={() => window.open(src as string, '_blank')} />
                );
              },
              a: ({ node, ...props }) => {
                const href = props.href?.startsWith('/') ? `${API_BASE_URL}${props.href}` : props.href;
                const isVideo = props.href?.includes("/api/camera/download");
                if (isVideo) {
                  return (
                    <span className="block my-1 bg-black/20 p-1 rounded-xl">
                      <video src={href} controls className="max-w-full max-h-32 rounded-lg shadow-sm" preload="metadata" />
                    </span>
                  );
                }
                return <a {...props} href={href} className="text-[var(--accent-cyan)] hover:underline break-all" target="_blank" rel="noopener noreferrer" />;
              },
              p: ({ node, ...props }) => <p {...props} className="whitespace-pre-wrap" />
            }}
          >
            {content}
          </ReactMarkdown>
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
