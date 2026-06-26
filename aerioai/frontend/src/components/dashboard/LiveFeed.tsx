"use client";

import { useState, useRef, useEffect } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface LiveFeedProps {
  streamUrl: string;
  isRecording?: boolean;
  onCapture?: () => void;
  onRecordToggle?: () => void;
  className?: string;
}

export default function LiveFeed({
  streamUrl,
  isRecording = false,
  onCapture,
  onRecordToggle,
  className,
}: LiveFeedProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Auto-hide overlay after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setOverlayVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Card
      className={cn(
        "relative overflow-hidden scan-line",
        fullscreen && "fixed inset-4 z-[90]",
        className
      )}
      padding="none"
    >
      {/* Live Feed */}
      <div className="relative bg-black">
        <img
          ref={imgRef}
          src={streamUrl}
          alt="Live drone feed"
          className="w-full h-auto min-h-[300px] lg:min-h-[400px] object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='480'%3E%3Crect fill='%230A0A0A' width='640' height='480'/%3E%3Ctext fill='%2300FFFF' font-family='monospace' font-size='20' x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle'%3ENO SIGNAL%3C/text%3E%3C/svg%3E";
          }}
        />

        {/* Top Overlay */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 p-3 flex items-center justify-between transition-opacity duration-500",
            overlayVisible ? "opacity-100" : "opacity-0 hover:opacity-100"
          )}
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          <div className="flex items-center gap-3">
            <div className="live-indicator">
              <span className={cn("live-dot", !isRecording && "active")} />
              <span className="text-xs font-mono text-white tracking-wider">
                {isRecording ? "REC" : "LIVE"}
              </span>
            </div>
            <Badge variant="green" size="sm">HD</Badge>
          </div>
          <span className="text-[10px] font-mono text-white/60 tracking-wider">
            {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        {/* Bottom Controls */}
        <div
          className={cn(
            "absolute bottom-0 left-0 right-0 p-3 flex items-center justify-center gap-2 transition-opacity duration-500",
            overlayVisible ? "opacity-100" : "opacity-0 hover:opacity-100"
          )}
          style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)" }}
        >
          {onCapture && (
            <button
              onClick={onCapture}
              className="btn-command text-[10px]"
              title="Capture Photo"
            >
              📸 Capture
            </button>
          )}
          {onRecordToggle && (
            <button
              onClick={onRecordToggle}
              className={cn(
                "btn-command text-[10px]",
                isRecording && "active"
              )}
              title={isRecording ? "Stop Recording" : "Start Recording"}
            >
              {isRecording ? "⏹ Stop" : "⏺ Record"}
            </button>
          )}
          <button
            onClick={() => setFullscreen(!fullscreen)}
            className="btn-command text-[10px]"
            title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {fullscreen ? "⊠" : "⊞"}
          </button>
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[var(--accent-red)] animate-pulse" />
            <span className="text-xs font-mono text-[var(--accent-red)] font-bold tracking-wider">REC</span>
          </div>
        )}
      </div>
    </Card>
  );
}
