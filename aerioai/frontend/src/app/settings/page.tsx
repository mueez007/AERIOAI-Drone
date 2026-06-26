"use client";

import { useState, useEffect } from "react";
import { useThemeContext } from "@/components/layout/ThemeToggle";
import { API_BASE_URL } from "@/lib/constants";

const GLASS: React.CSSProperties = {
  background: "rgba(30,30,30,0.6)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-1">{title}</h2>
      <div className="rounded-2xl overflow-hidden divide-y divide-black/5 dark:divide-white/5" style={GLASS}>
        {children}
      </div>
    </div>
  );
}

function SettingsRow({ label, sublabel, children }: { label: string; sublabel?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, toggleTheme, isDark } = useThemeContext();
  const [apiStatus, setApiStatus] = useState<"checking" | "online" | "offline">("checking");
  const [inputVol, setInputVol] = useState(80);
  const [outputVol, setOutputVol] = useState(70);
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);

  // Check API connectivity
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/system/health`)
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));
  }, []);

  const STATUS_COLORS = {
    checking: "bg-amber-400",
    online: "bg-emerald-500",
    offline: "bg-red-500",
  };

  const STATUS_LABELS = {
    checking: "Checking…",
    online: "Connected",
    offline: "Offline",
  };

  return (
    <div className="p-6 max-w-xl space-y-8 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Preferences and system configuration</p>
      </div>

      {/* Appearance */}
      <SettingsSection title="Appearance">
        <SettingsRow label="Theme" sublabel={isDark ? "Dark mode" : "Light mode"}>
          <button
            onClick={toggleTheme}
            className="relative w-12 h-7 rounded-full transition-all duration-300"
            style={{
              background: isDark
                ? "linear-gradient(135deg, #0071E3, #5E5CE6)"
                : "rgba(120,120,128,0.32)",
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300"
              style={{ transform: isDark ? "translateX(20px)" : "translateX(0px)" }}
            />
          </button>
        </SettingsRow>
      </SettingsSection>

      {/* Connection */}
      <SettingsSection title="Connection">
        <SettingsRow label="Backend API" sublabel={`${API_BASE_URL}`}>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${STATUS_COLORS[apiStatus]}`} />
            <span className="text-sm font-medium text-gray-300">
              {STATUS_LABELS[apiStatus]}
            </span>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* Voice */}
      <SettingsSection title="Voice">
        <SettingsRow label="Input Volume" sublabel="Microphone sensitivity">
          <div className="flex items-center gap-3 w-40">
            <input
              type="range"
              min={0}
              max={100}
              value={inputVol}
              onChange={(e) => setInputVol(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-[#0071E3]"
            />
            <span className="text-xs font-mono text-gray-500 w-8 text-right">{inputVol}%</span>
          </div>
        </SettingsRow>
        <SettingsRow label="Output Volume" sublabel="Speaker level">
          <div className="flex items-center gap-3 w-40">
            <input
              type="range"
              min={0}
              max={100}
              value={outputVol}
              onChange={(e) => setOutputVol(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-[#0071E3]"
            />
            <span className="text-xs font-mono text-gray-500 w-8 text-right">{outputVol}%</span>
          </div>
        </SettingsRow>
        <SettingsRow label="Voice Speed" sublabel="Text-to-speech rate">
          <div className="flex items-center gap-3 w-40">
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(Number(e.target.value))}
              className="flex-1 h-1.5 rounded-full accent-[#0071E3]"
            />
            <span className="text-xs font-mono text-gray-500 w-8 text-right">{voiceSpeed.toFixed(1)}x</span>
          </div>
        </SettingsRow>
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About">
        <SettingsRow label="AERIOAI" sublabel="Autonomous Drone Intelligence Platform">
          <span className="text-xs font-mono text-gray-400 bg-white/10 px-2 py-1 rounded-lg">v2.0</span>
        </SettingsRow>
        <SettingsRow label="Hardware" sublabel="Raspberry Pi 4 · SpeedyBee F405 · YOLOv8">
          <span className="text-xs text-gray-400">Edge AI</span>
        </SettingsRow>
        <SettingsRow label="Developer" sublabel="Mohammed Huzaif Mueez">
          <span className="text-xs text-gray-400">2024–2025</span>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
