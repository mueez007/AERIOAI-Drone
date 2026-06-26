"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/constants";

interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h (0-1 normalized)
}

interface Props {
  streamUrl: string;
  isRecording: boolean;
  detections?: Detection[];
}

export default function LiveFeedCanvas({ streamUrl, isRecording, detections = [] }: Props) {
  const videoRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [recordDuration, setRecordDuration] = useState(0);

  // Time tracker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
      const timeStr = now.toLocaleTimeString("en-US", { hour12: false });
      setCurrentTime(`${dateStr} ${timeStr}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Recording duration tracker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => setRecordDuration(d => d + 1), 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Draw bounding boxes on canvas whenever detections change
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = videoRef.current;
    if (!canvas || !img || !loaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to the image display size
    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const COLORS: Record<string, string> = {
      person: "#34D399",
      vehicle: "#60A5FA",
      car: "#60A5FA",
      truck: "#FBBF24",
      default: "#A78BFA",
    };

    detections.forEach((det) => {
      const [nx, ny, nw, nh] = det.bbox;
      const x = nx * canvas.width;
      const y = ny * canvas.height;
      const w = nw * canvas.width;
      const h = nh * canvas.height;
      const color = COLORS[det.label.toLowerCase()] || COLORS.default;
      const pct = Math.round(det.confidence * 100);

      // Box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);

      // Corner accent marks
      const cs = 10; // corner size
      ctx.lineWidth = 3;
      [
        [x, y, x + cs, y, x, y + cs],
        [x + w - cs, y, x + w, y, x + w, y + cs],
        [x, y + h - cs, x, y + h, x + cs, y + h],
        [x + w - cs, y + h, x + w, y + h, x + w, y + h - cs],
      ].forEach(([x1, y1, x2, y2, x3, y3]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.strokeStyle = color;
        ctx.stroke();
      });

      // Label pill
      const label = `${det.label} ${pct}%`;
      ctx.font = "bold 11px Inter, sans-serif";
      const tw = ctx.measureText(label).width;
      const ph = 20, pw = tw + 10, pr = 4;
      const lx = x, ly = y - ph - 2;

      // Pill background
      ctx.fillStyle = color + "DD";
      ctx.beginPath();
      ctx.roundRect(lx, ly, pw, ph, pr);
      ctx.fill();

      // Label text
      ctx.fillStyle = "#000";
      ctx.fillText(label, lx + 5, ly + 14);
    });
  }, [detections, loaded]);

  const renderStream = () => {
    if (error) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 gap-4 absolute inset-0 z-0">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white/60 text-sm font-medium">No Signal</p>
            <p className="text-white/30 text-xs mt-1">Drone camera offline</p>
          </div>
        </div>
      );
    }
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={videoRef}
          src={streamUrl}
          alt="Live drone feed"
          className="w-full h-full object-cover absolute inset-0 z-0"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{ mixBlendMode: "normal" }}
        />
      </>
    );
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {renderStream()}

      {/* Timestamp overlay (Camera style burn-in) */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <span className="text-white text-sm font-mono font-bold tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
          {currentTime || "Loading..."}
        </span>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/10 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          <span className="text-white text-[11px] font-bold tracking-widest font-mono">
            REC {formatDuration(recordDuration)}
          </span>
        </div>
      )}
    </div>
  );
}
