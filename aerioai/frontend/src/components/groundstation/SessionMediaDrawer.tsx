"use client";

import { useState } from "react";
import { SessionMediaItem } from "./types";
import { formatTimestamp } from "@/lib/utils";
import api from "@/lib/api";

interface SessionMediaDrawerProps {
  sessionMedia: SessionMediaItem[];
  isRecording: boolean;
  onCapture: () => Promise<void>;
  onToggleRecord: () => void;
  isCapturing?: boolean;
}

export default function SessionMediaDrawer({
  sessionMedia,
  isRecording,
  onCapture,
  onToggleRecord,
  isCapturing = false,
}: SessionMediaDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const savePath = "media/photos | media/videos";

  return (
    <>
      {/* ── Floating Capture Controls Bar ── */}
      <div className="flex items-center gap-2 bg-black/70 backdrop-blur-2xl p-1.5 rounded-full border border-white/10 shadow-2xl pointer-events-auto">
        {/* Explicit Capture Photo */}
        <button
          onClick={onCapture}
          disabled={isCapturing}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all disabled:opacity-50"
          title="Explicitly captures one high-resolution photo"
        >
          {isCapturing ? (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg className="w-4 h-4 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
          )}
          <span>CAPTURE</span>
        </button>

        {/* Explicit Record Video */}
        {isRecording ? (
          <button
            onClick={onToggleRecord}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600/90 hover:bg-red-700 active:scale-95 text-white text-xs font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.7)] animate-pulse"
          >
            <span className="w-2.5 h-2.5 rounded-sm bg-white" />
            <span>STOP ({sessionMedia.filter(m => m.type === "video").length + 1})</span>
          </button>
        ) : (
          <button
            onClick={onToggleRecord}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all"
            title="Start explicit MP4 video recording to drone storage"
          >
            <span className="w-2.5 h-2.5 rounded-full border-2 border-red-500 bg-red-500/40" />
            <span>RECORD</span>
          </button>
        )}

        {/* Session Media Tray Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
            isOpen ? "bg-[var(--accent-cyan)] text-white" : "bg-black/50 text-gray-300 hover:text-white"
          }`}
          title="Inspect media captured in current session"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span>SESSION ({sessionMedia.length})</span>
        </button>
      </div>

      {/* ── Slide-over Drawer for Current Session Media Only ── */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[1000] w-full max-w-md bg-[#0c0d14]/95 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col p-6 animate-fade-in text-[var(--text-primary)]">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-white/10 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">Session Media Vault</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]">
                  ACTIVE FLIGHT
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Showing media captured in this session only (no permanent auto-saves)
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-all"
            >
              ✕
            </button>
          </div>

          {/* Configured Save Destination Indicator */}
          <div className="my-4 p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1 text-xs font-mono">
            <div className="flex justify-between items-center text-[var(--text-muted)]">
              <span>STORAGE DESTINATION:</span>
              <span className="text-[var(--accent-green)]">MOUNTED</span>
            </div>
            <div className="text-[var(--accent-cyan)] font-bold truncate">
              {savePath}
            </div>
            <span className="text-[10px] text-gray-500">
              Only explicitly triggered captures are committed to disk.
            </span>
          </div>

          {/* Media Items List */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
            {sessionMedia.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-[var(--text-muted)] gap-2">
                <span className="text-3xl opacity-50">📷</span>
                <p className="text-sm font-bold">No captures in this session</p>
                <p className="text-xs max-w-xs">
                  Press <b>CAPTURE</b> or <b>RECORD</b> above to save manual snapshots or flight clips.
                </p>
              </div>
            ) : (
              sessionMedia.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-xs font-bold text-[var(--accent-cyan)] shrink-0">
                      {item.type === "photo" ? "JPG" : "MP4"}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate text-[var(--text-primary)]">{item.filename}</p>
                      <p className="text-[10px] font-mono text-[var(--text-muted)]">
                        {formatTimestamp(item.capturedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={api.getMediaDownloadUrl(item.id)}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded bg-[var(--accent-cyan)]/20 hover:bg-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:text-white text-[11px] font-bold font-mono transition-all"
                    >
                      OPEN
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
