"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface Detection {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h (0-1 normalized)
  mask_polygon?: number[][] | null; // [[norm_x, norm_y], ...] normalized silhouette points
  track_id?: number | null;
}

interface Props {
  streamUrl: string;
  isRecording: boolean;
  detections?: Detection[];
  altitude?: number | null;
  altitudeUnit?: string;
  altitudeType?: "REL (HOME)" | "MSL (BARO)";
  speed?: number | null; // in m/s
  heading?: number | null; // in degrees 0-359
  attitude?: { roll: number; pitch: number; yaw?: number } | null;
  satellites?: number;
  batteryPct?: number | null;
  isConnected?: boolean;
  isSimulated?: boolean;
  isStale?: boolean;
  telemetrySource?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  detectionOverlaysEnabled?: boolean;
  onToggleDetectionOverlays?: () => void;

  // Camera Vision Pipeline Controls
  missionMode?: string;
  isLiveTracking?: boolean;
  trackingStatus?: "loading" | "ready" | "running" | "unavailable" | "error" | "stopping" | "stopped";
  onToggleLiveTracking?: () => void;
  isHumanMaskEnabled?: boolean;
  maskStatus?: "off" | "loading" | "active" | "unavailable";
  onToggleHumanMask?: () => void;
  isObjectDetectionEnabled?: boolean;
  onToggleObjectDetection?: () => void;
  inferenceFps?: number;
  meanInferenceMs?: number;
}

export default function LiveFeedCanvas({
  streamUrl,
  isRecording,
  detections = [],
  altitude = null,
  altitudeUnit = "m",
  altitudeType = "REL (HOME)",
  speed = null,
  heading = null,
  attitude = null,
  satellites = 0,
  batteryPct = null,
  isConnected = true,
  isSimulated = true,
  isStale = false,
  telemetrySource = "SIMULATED",
  onFullscreenChange,
  detectionOverlaysEnabled = true,
  onToggleDetectionOverlays,
  missionMode,
  isLiveTracking = false,
  trackingStatus = "stopped",
  onToggleLiveTracking,
  isHumanMaskEnabled = false,
  maskStatus = "off",
  onToggleHumanMask,
  isObjectDetectionEnabled = false,
  onToggleObjectDetection,
  inferenceFps = 0,
  meanInferenceMs = 0,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [recordDuration, setRecordDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      timer = setInterval(() => setRecordDuration((d) => d + 1), 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Native Fullscreen API Event Listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = Boolean(
        document.fullscreenElement === containerRef.current ||
        (document as any).webkitFullscreenElement === containerRef.current
      );
      setIsFullscreen(isNowFullscreen);
      onFullscreenChange?.(isNowFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  // Toggle Native Fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any)?.webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any)?.webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle notice:", err);
    }
  }, []);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Draw bounding boxes and human segmentation masks on canvas whenever detections change
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = videoRef.current;
    if (!canvas || !img || !loaded) {
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = img.clientWidth;
    canvas.height = img.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (detections.length === 0) return;

    // Precise coordinate transformation accounting for object-cover vs object-contain
    const naturalW = img.naturalWidth || canvas.width;
    const naturalH = img.naturalHeight || canvas.height;
    const naturalAspect = naturalW / naturalH;
    const clientAspect = canvas.width / canvas.height;

    let displayedW = canvas.width;
    let displayedH = canvas.height;
    let offsetX = 0;
    let offsetY = 0;

    if (isFullscreen) {
      // object-contain in fullscreen
      if (clientAspect > naturalAspect) {
        displayedH = canvas.height;
        displayedW = displayedH * naturalAspect;
        offsetX = (canvas.width - displayedW) / 2;
        offsetY = 0;
      } else {
        displayedW = canvas.width;
        displayedH = displayedW / naturalAspect;
        offsetX = 0;
        offsetY = (canvas.height - displayedH) / 2;
      }
    } else {
      // object-cover in normal dashboard panel
      if (clientAspect > naturalAspect) {
        displayedW = canvas.width;
        displayedH = displayedW / naturalAspect;
        offsetX = 0;
        offsetY = (canvas.height - displayedH) / 2;
      } else {
        displayedH = canvas.height;
        displayedW = displayedH * naturalAspect;
        offsetX = (canvas.width - displayedW) / 2;
        offsetY = 0;
      }
    }

    // 1. Render Human Segmentation Masks (if enabled)
    if (isHumanMaskEnabled) {
      detections.forEach((det) => {
        if (det.mask_polygon && det.mask_polygon.length >= 3) {
          ctx.beginPath();
          det.mask_polygon.forEach(([px, py], idx) => {
            const mx = offsetX + px * displayedW;
            const my = offsetY + py * displayedH;
            if (idx === 0) ctx.moveTo(mx, my);
            else ctx.lineTo(mx, my);
          });
          ctx.closePath();

          // Restrained translucent emerald green fill
          ctx.fillStyle = "rgba(52, 211, 153, 0.32)";
          ctx.fill();

          // Crisp contour stroke
          ctx.strokeStyle = "rgba(52, 211, 153, 0.85)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      });
    }

    // 2. Render Rectangular Bounding Boxes (if enabled)
    if (detectionOverlaysEnabled) {
      const COLORS: Record<string, string> = {
        person: "#34D399",
        vehicle: "#60A5FA",
        car: "#60A5FA",
        truck: "#FBBF24",
        bus: "#F59E0B",
        motorcycle: "#38BDF8",
        bicycle: "#C084FC",
        default: "#60A5FA",
      };

      detections.forEach((det) => {
        const [nx, ny, nw, nh] = det.bbox;
        const x = offsetX + nx * displayedW;
        const y = offsetY + ny * displayedH;
        const w = nw * displayedW;
        const h = nh * displayedH;
        
        const lowerLabel = det.label.toLowerCase();
        let color = COLORS.default;
        if (lowerLabel.includes("person")) color = COLORS.person;
        else if (lowerLabel.includes("car")) color = COLORS.car;
        else if (lowerLabel.includes("truck")) color = COLORS.truck;
        else if (lowerLabel.includes("bus")) color = COLORS.bus;
        else if (lowerLabel.includes("motorcycle")) color = COLORS.motorcycle;
        else if (lowerLabel.includes("bicycle")) color = COLORS.bicycle;
        else if (lowerLabel.includes("vehicle")) color = COLORS.vehicle;

        const pct = Math.round(det.confidence * 100);

        // Bounding Box Rectangle
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // Corner accent marks
        const cs = 8;
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

        // Label pill with Track ID if available
        const label = det.track_id !== undefined && det.track_id !== null
          ? `TRK #${det.track_id} · ${det.label} ${pct}%`
          : `${det.label} ${pct}%`;

        ctx.font = "bold 10px Inter, sans-serif";
        const tw = ctx.measureText(label).width;
        const ph = 18, pw = tw + 8, pr = 3;
        const lx = x, ly = Math.max(0, y - ph - 2);

        ctx.fillStyle = color + "CC";
        ctx.beginPath();
        ctx.roundRect(lx, ly, pw, ph, pr);
        ctx.fill();

        ctx.fillStyle = "#000";
        ctx.fillText(label, lx + 4, ly + 12);
      });
    }
  }, [detections, loaded, detectionOverlaysEnabled, isHumanMaskEnabled, isFullscreen]);

  // Validated Telemetry Computations
  const hasHeading = heading !== null && heading !== undefined && !isNaN(heading);
  const normHeading = hasHeading ? ((heading % 360) + 360) % 360 : 0;
  const cardinal = getHeadingCardinal(normHeading);

  const displayAlt = altitude !== null && altitude !== undefined ? altitude : (isSimulated ? 50.0 : null);
  const displaySpeed = speed !== null && speed !== undefined ? speed : (isSimulated ? 5.2 : null);

  const roll = attitude?.roll ?? 0;
  const clampedRoll = Math.max(-25, Math.min(25, roll));

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
            <p className="text-white/30 text-xs mt-1">Camera offline • Standby for sync</p>
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
          className={`w-full h-full absolute inset-0 z-0 ${isFullscreen ? "object-contain" : "object-cover"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none ${
        isFullscreen ? "flex items-center justify-center" : ""
      }`}
    >
      {renderStream()}

      {/* ─────────────────────────────────────────────────────────────
          INTEGRATED DRONE FLIGHT HUD (DJI-Style Reference)
          ───────────────────────────────────────────────────────────── */}

      {/* 1. TOP TELEMETRY STATUS RIBBON OVER VIDEO */}
      <div className="absolute top-3 inset-x-3 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Stream, Detection, Human Mask & AI Overlays */}
        <div className="flex items-center flex-wrap gap-2 pointer-events-auto">
          <span className="px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            LIVE FEED
          </span>

          {/* 1. START DETECTION / STOP DETECTION */}
          {onToggleLiveTracking && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (trackingStatus !== "unavailable" && trackingStatus !== "loading" && trackingStatus !== "stopping") {
                  onToggleLiveTracking();
                }
              }}
              disabled={trackingStatus === "unavailable" || trackingStatus === "loading" || trackingStatus === "stopping"}
              title={isLiveTracking ? "Click to Stop Live Detection & Tracking" : "Click to Start Live Detection & Tracking"}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                trackingStatus === "running"
                  ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300 hover:bg-red-500/25 hover:border-red-500/50 hover:text-red-300"
                  : trackingStatus === "loading" || trackingStatus === "stopping"
                  ? "bg-amber-500/25 border-amber-500/50 text-amber-300 cursor-wait"
                  : trackingStatus === "error"
                  ? "bg-red-500/25 border-red-500/50 text-red-300 hover:bg-red-500/35"
                  : trackingStatus === "unavailable"
                  ? "bg-gray-850 border-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-black/60 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  trackingStatus === "running"
                    ? "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]"
                    : trackingStatus === "loading" || trackingStatus === "stopping"
                    ? "bg-amber-400 animate-ping"
                    : trackingStatus === "error"
                    ? "bg-red-400"
                    : "bg-gray-500"
                }`}
              />
              {trackingStatus === "running"
                ? "STOP DETECTION"
                : trackingStatus === "loading"
                ? "STARTING..."
                : trackingStatus === "stopping"
                ? "STOPPING..."
                : trackingStatus === "error"
                ? "DETECTION ERROR"
                : trackingStatus === "unavailable"
                ? "DETECTION UNAVAILABLE"
                : "START DETECTION"}
            </button>
          )}

          {/* 2. BOXES ON / BOXES OFF */}
          {onToggleDetectionOverlays && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleDetectionOverlays();
              }}
              title={detectionOverlaysEnabled ? "Hide Bounding Boxes" : "Show Bounding Boxes"}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                detectionOverlaysEnabled
                  ? "bg-[var(--accent-cyan)]/25 border-[var(--accent-cyan)]/50 text-[var(--accent-cyan)] hover:bg-[var(--accent-cyan)]/35"
                  : "bg-black/60 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${detectionOverlaysEnabled ? "bg-[var(--accent-cyan)]" : "bg-gray-500"}`} />
              {detectionOverlaysEnabled ? "BOXES ON" : "BOXES OFF"}
            </button>
          )}

          {/* 3. HUMAN MASK ON / HUMAN MASK OFF */}
          {onToggleHumanMask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (maskStatus !== "unavailable" && maskStatus !== "loading") onToggleHumanMask();
              }}
              disabled={maskStatus === "unavailable" || maskStatus === "loading"}
              title={
                maskStatus === "unavailable"
                  ? "Pretrained instance segmentation model unavailable"
                  : isHumanMaskEnabled
                  ? "Click to Hide Human Silhouette Mask"
                  : "Click to Display Human Silhouette Mask"
              }
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all shadow-lg flex items-center gap-1.5 ${
                maskStatus === "active"
                  ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/35 cursor-pointer"
                  : maskStatus === "loading"
                  ? "bg-amber-500/25 border-amber-500/50 text-amber-300 cursor-wait"
                  : maskStatus === "unavailable"
                  ? "bg-black/40 border-white/5 text-gray-600 cursor-not-allowed opacity-60"
                  : "bg-black/60 border-white/10 text-gray-400 hover:text-white hover:border-white/20 cursor-pointer"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  maskStatus === "active"
                    ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                    : maskStatus === "loading"
                    ? "bg-amber-400 animate-ping"
                    : "bg-gray-500"
                }`}
              />
              {maskStatus === "active"
                ? "HUMAN MASK ON"
                : maskStatus === "loading"
                ? "MASK LOADING"
                : maskStatus === "unavailable"
                ? "MASK UNAVAILABLE"
                : "HUMAN MASK OFF"}
            </button>
          )}

          {/* 4. OBJECT DETECTION ON / OBJECT DETECTION OFF */}
          {onToggleObjectDetection && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleObjectDetection();
              }}
              title={isObjectDetectionEnabled ? "Disable Vehicle Detection" : "Enable Vehicle Detection (Cars, Trucks, Bikes, Buses)"}
              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all shadow-lg flex items-center gap-1.5 cursor-pointer ${
                isObjectDetectionEnabled
                  ? "bg-blue-500/25 border-blue-500/50 text-blue-300 hover:bg-blue-500/35"
                  : "bg-black/60 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isObjectDetectionEnabled ? "bg-blue-400" : "bg-gray-500"}`} />
              {isObjectDetectionEnabled ? "OBJECT DETECTION ON" : "OBJECT DETECTION OFF"}
            </button>
          )}

          {/* Honest AI Metrics Badge (Visible when detection active) */}
          {trackingStatus === "running" && inferenceFps > 0 && (
            <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[10px] font-mono text-gray-300 shadow-lg">
              <span className="text-emerald-400 font-bold">{inferenceFps.toFixed(1)} AI FPS</span>
              {meanInferenceMs > 0 && (
                <span className="text-gray-500 font-medium">· {meanInferenceMs.toFixed(0)}ms</span>
              )}
            </div>
          )}
        </div>

        {/* Center: System Flight Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono font-bold text-emerald-400 drop-shadow">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{isConnected ? (isSimulated ? "SIMULATION ACTIVE" : "SAFE TO FLY") : "LINK STANDBY"}</span>
        </div>

        {/* Right: GPS, Battery, REC, Fullscreen */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Compact Telemetry Chips */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-[10px] font-mono font-bold text-white shadow-lg">
            {/* GPS */}
            <span className="flex items-center gap-1 text-gray-300">
              <svg className="w-3 h-3 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3m0 14v3M2 12h3m14 0h3" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
              {satellites}
            </span>

            {/* Battery */}
            {batteryPct !== null && (
              <span className={`border-l border-white/15 pl-2 flex items-center gap-1 ${
                batteryPct > 30 ? "text-emerald-400" : "text-red-400 animate-pulse"
              }`}>
                <span>⚡</span>
                {Math.round(batteryPct)}%
              </span>
            )}
          </div>

          {/* Recording Badge */}
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/25 border border-red-500/40 text-red-300 text-[10px] font-mono font-bold animate-pulse shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span>REC {formatDuration(recordDuration)}</span>
            </div>
          )}

          {/* Native Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-full bg-black/65 hover:bg-black/90 active:scale-95 backdrop-blur-md border border-white/20 text-white transition-all shadow-xl group cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Expand Live Video Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4 text-white group-hover:text-[var(--accent-cyan)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9L4 4m0 0v5m0-5h5m6 6l5-5m0 0v5m0-5h-5m-6 6l-5 5m0 0v-5m0 5h5m6-6l5 5m0 0v-5m0 5h-5" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white group-hover:text-[var(--accent-cyan)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 2. CENTER FLIGHT ARTIFICIAL HORIZON & RETICLE */}
      <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center">
        <div
          className="relative w-48 h-36 flex items-center justify-center transition-transform duration-200 ease-out"
          style={{ transform: `rotate(${-clampedRoll}deg)` }}
        >
          {/* Subtle Wing Reticles */}
          <div className="absolute w-12 h-0.5 bg-emerald-400/60 left-0" />
          <div className="absolute w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400/70 left-12 top-1/2 -translate-y-1/2" />

          {/* Center Crosshair */}
          <div className="relative w-4 h-4 flex items-center justify-center">
            <div className="absolute w-3.5 h-0.5 bg-emerald-400/80 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
            <div className="absolute h-3.5 w-0.5 bg-emerald-400/80 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
          </div>

          {/* Right Wing Reticle */}
          <div className="absolute w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400/70 right-12 top-1/2 -translate-y-1/2" />
          <div className="absolute w-12 h-0.5 bg-emerald-400/60 right-0" />
        </div>
      </div>

      {/* 3. LEFT SPEED LADDER (DJI Style Scale) */}
      <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center">
        {/* Speed Value Flag */}
        <div className="flex flex-col items-end pr-2 font-mono">
          <span className="text-[9px] text-gray-400 font-bold tracking-widest leading-none">SPD</span>
          <span className="text-[8px] text-gray-500 font-bold mb-0.5">(m/s)</span>
          <div className="px-2 py-1 rounded-l-md bg-black/75 backdrop-blur-md border-y border-l border-emerald-400/50 shadow-xl flex items-center gap-1">
            <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {displaySpeed !== null ? displaySpeed.toFixed(1) : "---"}
            </span>
          </div>
          <span className="text-[8px] text-gray-400 mt-1">
            {displaySpeed !== null ? `${(displaySpeed * 3.6).toFixed(0)} km/h` : "---"}
          </span>
        </div>

        {/* Speed Ladder Ruler Marks */}
        <div className="relative w-3.5 h-44 border-r-2 border-emerald-400/70 flex flex-col justify-between py-1">
          {[7, 6, 5, 4, 3].map((val) => (
            <div key={val} className="relative w-full flex items-center justify-end">
              <span className="text-[8px] font-mono text-emerald-400/80 font-bold absolute -left-4">
                0{val}
              </span>
              <div className="w-2.5 h-0.5 bg-emerald-400/80" />
            </div>
          ))}
          {/* Active Speed Bug Pointer */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-4 border-r-emerald-300" />
        </div>
      </div>

      {/* 4. RIGHT SLIM VERTICAL ALTITUDE SCALE LADDER (Replaces Floating Pill) */}
      <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center">
        {/* Altitude Ladder Ruler Marks */}
        <div className="relative w-3.5 h-48 border-l-2 border-emerald-400/70 flex flex-col justify-between py-1">
          {/* Safety clearance colored bar */}
          <div className="absolute left-0.5 top-3 bottom-3 w-1 rounded-full overflow-hidden flex flex-col">
            <div className="flex-1 bg-emerald-400/60" />
            <div className="h-6 bg-yellow-400/80" />
            <div className="h-4 bg-red-500/90" />
          </div>

          {[160, 140, 120, 100, 80].map((val) => (
            <div key={val} className="relative w-full flex items-center justify-start">
              <div className="w-2.5 h-0.5 bg-emerald-400/80" />
              <span className="text-[8px] font-mono text-emerald-400/80 font-bold absolute left-4">
                {val}
              </span>
            </div>
          ))}
          {/* Active Altitude Bug Pointer */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-emerald-300" />
        </div>

        {/* Altitude Value Flag */}
        <div className="flex flex-col items-start pl-2 font-mono">
          <div className="flex items-baseline gap-1 px-2.5 py-1 rounded-r-md bg-black/75 backdrop-blur-md border-y border-r border-emerald-400/50 shadow-xl">
            <span className="text-base sm:text-lg font-black text-emerald-400 font-mono">
              {displayAlt !== null ? displayAlt.toFixed(1) : "---"}
            </span>
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-400 font-bold leading-none">ALT</span>
              <span className="text-[7px] text-gray-500 font-bold">({altitudeUnit})</span>
            </div>
          </div>

          {/* Vertical Datum & Provenance Status */}
          <div className="flex items-center gap-1 mt-1 pl-1 text-[8px] font-mono">
            <span className="text-gray-400">{altitudeType}</span>
            {isStale ? (
              <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold">
                STALE
              </span>
            ) : isSimulated ? (
              <span className="px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                SIM
              </span>
            ) : (
              <span className="px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                LIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 5. INTEGRATED CIRCULAR COMPASS HUD (Bottom-Center Over Video) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
        {/* Heading Digital Badge */}
        <div className="mb-1 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-[10px] font-mono font-bold text-white shadow-xl flex items-center gap-1.5">
          <span className="text-red-400 font-black">▲</span>
          <span className="text-emerald-400">{Math.round(normHeading)}°</span>
          <span className="text-gray-300">{cardinal}</span>
          <span className="text-[8px] text-gray-400 border-l border-white/20 pl-1">
            {isSimulated ? "SIM" : hasHeading ? "MAG" : "NO MAG"}
          </span>
        </div>

        {/* Circular Compass Dial */}
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center overflow-hidden">
          {/* Rotating Compass Card */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-200 ease-out"
            style={{ transform: `rotate(${-normHeading}deg)` }}
          >
            {/* Cardinal Markers on Ring */}
            <span className="absolute top-1 text-[10px] font-black text-red-500 drop-shadow">N</span>
            <span className="absolute right-1.5 text-[9px] font-bold text-gray-300 drop-shadow">E</span>
            <span className="absolute bottom-1 text-[9px] font-bold text-gray-300 drop-shadow">S</span>
            <span className="absolute left-1.5 text-[9px] font-bold text-gray-300 drop-shadow">W</span>

            {/* Ordinal Dial Dashes */}
            <div className="absolute inset-2 rounded-full border border-dashed border-white/20" />
            <div className="absolute inset-4 rounded-full border border-white/10" />

            {/* Dial Tick marks */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <div
                key={deg}
                className="absolute inset-0 flex justify-center"
                style={{ transform: `rotate(${deg}deg)` }}
              >
                <div className={`w-0.5 ${deg % 90 === 0 ? "h-2 bg-white/60" : "h-1 bg-white/30"}`} />
              </div>
            ))}
          </div>

          {/* Fixed Forward Aircraft Chevron (Pointing Straight Up) */}
          <div className="relative z-10 w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-500 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" fill="currentColor">
              <polygon points="12,2 22,21 12,17 2,21" />
            </svg>
          </div>
        </div>
      </div>

      {/* Timestamp overlay (Bottom Left Camera Burn-In) */}
      <div className="absolute bottom-3 left-4 z-20 pointer-events-none">
        <span className="text-white/80 text-[10px] font-mono font-bold tracking-widest drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
          {currentTime || "SYNCING..."}
        </span>
      </div>
    </div>
  );
}

function getHeadingCardinal(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return "N";
  if (normalized >= 22.5 && normalized < 67.5) return "NE";
  if (normalized >= 67.5 && normalized < 112.5) return "E";
  if (normalized >= 112.5 && normalized < 157.5) return "SE";
  if (normalized >= 157.5 && normalized < 202.5) return "S";
  if (normalized >= 202.5 && normalized < 247.5) return "SW";
  if (normalized >= 247.5 && normalized < 292.5) return "W";
  return "NW";
}
