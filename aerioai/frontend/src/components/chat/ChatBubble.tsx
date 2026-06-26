"use client";

interface Props {
  role: "user" | "ai";
  content: string;
  timestamp?: string;
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '@/lib/constants';

export default function ChatBubble({ role, content, timestamp }: Props) {
  const isUser = role === "user";

  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0071E3] to-[#5E5CE6] flex items-center justify-center shrink-0 mb-1">
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Bubble */}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "rounded-br-sm bg-[var(--accent-cyan)] text-white shadow-md"
              : "rounded-bl-sm bg-[var(--glass-bg)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-sm backdrop-blur-md prose prose-invert max-w-none"
          }`}
        >
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              img: ({ node, ...props }) => {
                const src = props.src?.startsWith('/') ? `${API_BASE_URL}${props.src}` : props.src;
                return (
                  <img {...props} src={src} className="max-w-full max-h-64 object-contain rounded-lg my-2 cursor-pointer hover:opacity-90 transition-opacity shadow-md" onClick={() => window.open(src as string, '_blank')} />
                );
              },
              a: ({ node, ...props }) => {
                const href = props.href?.startsWith('/') ? `${API_BASE_URL}${props.href}` : props.href;
                const isVideo = props.href?.includes("/api/camera/download");
                if (isVideo) {
                  return (
                    <span className="block my-2 bg-black/20 p-2 rounded-xl">
                      <video src={href} controls className="max-w-full max-h-64 rounded-lg shadow-md" preload="metadata" />
                      <a {...props} href={href} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-2 inline-flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Video
                      </a>
                    </span>
                  );
                }
                return <a {...props} href={href} className="text-blue-400 hover:underline break-all" target="_blank" rel="noopener noreferrer" />;
              }
            }}
          >
            {content}
          </ReactMarkdown>
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] text-[var(--text-muted)] px-1">{timestamp}</span>
        )}
      </div>
    </div>
  );
}
