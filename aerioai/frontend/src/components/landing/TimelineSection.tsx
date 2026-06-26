"use client";

import ScrollReveal from "./ScrollReveal";

const phases = [
  {
    number: "01",
    title: "The Hardware",
    description: "Designed the airframe, selected professional-grade components, wired the SpeedyBee F405 flight controller. Integrated Raspberry Pi 4 with the FC via MSP protocol. Set up GPS, telemetry, and power distribution.",
    tags: ["Airframe Design", "SpeedyBee F405", "BN-880 GPS", "Power Distribution"],
    color: "var(--accent-cyan)",
  },
  {
    number: "02",
    title: "The Brain",
    description: "Installed INAV firmware, configured autonomous flight modes, PID tuning. Built the Python FastAPI backend for sensor fusion. Connected CSI camera and USB audio for live capture and voice interaction.",
    tags: ["INAV Firmware", "PID Tuning", "FastAPI", "Sensor Fusion"],
    color: "var(--accent-purple)",
  },
  {
    number: "03",
    title: "The Intelligence",
    description: "Deployed YOLOv8n for real-time object detection on the Pi. Integrated Google Gemini for scene understanding. Built the voice assistant pipeline with Groq STT and ElevenLabs TTS.",
    tags: ["YOLOv8n", "Gemini 2.5", "Groq Whisper", "ElevenLabs"],
    color: "var(--accent-green)",
  },
  {
    number: "04",
    title: "The Experience",
    description: "Designed the Next.js command center dashboard with dark/light themes. Built the mission intelligence database. Created the Flutter Android app. Implemented automatic PDF report generation.",
    tags: ["Next.js Dashboard", "Flutter APK", "Mission DB", "PDF Reports"],
    color: "var(--accent-pink)",
  },
];

export default function TimelineSection() {
  return (
    <div className="relative max-w-3xl mx-auto">
      {/* Vertical line */}
      <div
        className="absolute left-8 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-px"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--border-color) 10%, var(--border-color) 90%, transparent)",
        }}
      />

      <div className="space-y-14">
        {phases.map((phase, i) => (
          <ScrollReveal key={i} delay={i * 100} direction={i % 2 === 0 ? "left" : "right"}>
            <div className={`relative flex flex-col md:flex-row items-start gap-6 ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
              {/* Dot on timeline — glass effect */}
              <div
                className="absolute left-8 md:left-1/2 w-4 h-4 rounded-full -translate-x-1/2 z-10"
                style={{
                  background: phase.color,
                  boxShadow: `0 0 0 3px var(--bg-primary), 0 0 16px color-mix(in srgb, ${phase.color} 30%, transparent)`,
                }}
              />

              {/* Spacer for alignment */}
              <div className="hidden md:block md:w-1/2" />

              {/* Card */}
              <div className="ml-16 md:ml-0 md:w-1/2 glass-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="text-[11px] font-black font-mono px-2.5 py-1 rounded-lg"
                    style={{
                      color: phase.color,
                      background: `color-mix(in srgb, ${phase.color} 10%, transparent)`,
                    }}
                  >
                    PHASE {phase.number}
                  </span>
                  <h3 className="text-lg font-bold font-[family-name:var(--font-heading)] tracking-tight">{phase.title}</h3>
                </div>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">{phase.description}</p>
                <div className="flex flex-wrap gap-2">
                  {phase.tags.map((tag, ti) => (
                    <span
                      key={ti}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full border"
                      style={{
                        color: "var(--text-secondary)",
                        borderColor: "var(--border-color)",
                        background: "var(--glass-bg)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
