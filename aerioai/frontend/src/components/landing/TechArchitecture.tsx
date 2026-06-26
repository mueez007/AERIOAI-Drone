"use client";

import ScrollReveal from "./ScrollReveal";
import {
  CpuIcon, EyeIcon, GamepadIcon, CameraIcon, DatabaseIcon,
  SparkleIcon, MicrophoneIcon, SpeakerIcon,
  MonitorIcon, PhoneIcon, BoltIcon, SignalIcon,
} from "@/components/ui/Icons";

const edgeItems = [
  { name: "Raspberry Pi 4", detail: "4GB RAM — The Brain", icon: <CpuIcon size={20} /> },
  { name: "YOLOv8n", detail: "Real-time detection 5-8 FPS", icon: <EyeIcon size={20} /> },
  { name: "INAV Firmware", detail: "Flight control & GPS nav", icon: <GamepadIcon size={20} /> },
  { name: "OpenCV", detail: "Image processing pipeline", icon: <CameraIcon size={20} /> },
  { name: "SQLite", detail: "Local mission database", icon: <DatabaseIcon size={20} /> },
];

const cloudItems = [
  { name: "Google Gemini 2.5", detail: "Scene understanding & summarization", icon: <SparkleIcon size={20} /> },
  { name: "Groq", detail: "Ultra-fast voice transcription", icon: <MicrophoneIcon size={20} /> },
  { name: "ElevenLabs", detail: "Natural voice synthesis", icon: <SpeakerIcon size={20} /> },
];

const groundItems = [
  { name: "Next.js Dashboard", detail: "Web command center", icon: <MonitorIcon size={20} /> },
  { name: "Flutter APK", detail: "Android mobile app", icon: <PhoneIcon size={20} /> },
  { name: "FastAPI", detail: "Unified REST backend", icon: <BoltIcon size={20} /> },
  { name: "WebSocket", detail: "Real-time telemetry", icon: <SignalIcon size={20} /> },
];

export default function TechArchitecture() {
  const columns = [
    { title: "Edge Computing", subtitle: "On the Drone", items: edgeItems, color: "var(--accent-cyan)" },
    { title: "Cloud Intelligence", subtitle: "AI Services", items: cloudItems, color: "var(--accent-purple)" },
    { title: "Ground Control", subtitle: "Operator Interface", items: groundItems, color: "var(--accent-green)" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map((col, ci) => (
        <ScrollReveal key={ci} delay={ci * 150}>
          <div className="glass-card p-6 h-full">
            {/* Column header */}
            <div className="mb-6">
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
                style={{
                  color: col.color,
                  background: `color-mix(in srgb, ${col.color} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${col.color} 15%, transparent)`,
                }}
              >
                {col.subtitle}
              </div>
              <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">{col.title}</h3>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {col.items.map((item, ii) => (
                <div
                  key={ii}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:bg-[var(--text-primary)]/[0.04] group"
                >
                  <span
                    className="flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                    style={{ color: col.color }}
                  >
                    {item.icon}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-[var(--text-primary)]">{item.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom accent line */}
            <div
              className="mt-6 h-px rounded-full opacity-20"
              style={{ background: `linear-gradient(90deg, ${col.color}, transparent)` }}
            />
          </div>
        </ScrollReveal>
      ))}

      {/* Connection flow indicators */}
      <div className="col-span-full flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-3 text-xs font-mono text-[var(--text-muted)]">
          <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)]" />
          Edge
          <span className="text-[var(--text-muted)] opacity-40">/</span>
          <span className="w-2 h-2 rounded-full bg-[var(--accent-purple)]" />
          Cloud
          <span className="text-[var(--text-muted)] opacity-40">/</span>
          <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
          Ground
        </div>
      </div>
    </div>
  );
}
