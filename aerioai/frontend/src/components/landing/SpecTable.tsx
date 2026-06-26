"use client";

const specs = [
  { category: "Flight Controller", spec: "SpeedyBee F405 V5 (INAV)" },
  { category: "Processor", spec: "Raspberry Pi 4 (4GB RAM)" },
  { category: "GPS", spec: "BN-880 (GPS + GLONASS)" },
  { category: "Motors", spec: "4114-11 320KV Brushless × 4" },
  { category: "ESC", spec: "55A 4-in-1" },
  { category: "Camera", spec: "Raspberry Pi CSI Camera" },
  { category: "Audio", spec: "USB Microphone + Speaker" },
  { category: "Battery", spec: "4S LiPo (customizable)" },
  { category: "Flight Time", spec: "~20-25 minutes" },
  { category: "Range", spec: "2-3 km (video link)" },
  { category: "AI Models", spec: "YOLOv8n (edge) + Gemini 2.5 (cloud)" },
  { category: "Connectivity", spec: "WiFi + Telemetry Radio" },
  { category: "Payload", spec: "Up to 500g" },
  { category: "Software", spec: "Python · FastAPI · Next.js · Flutter" },
];

export default function SpecTable() {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)]">
              <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Component
              </th>
              <th className="text-left px-6 py-4 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Specification
              </th>
            </tr>
          </thead>
          <tbody>
            {specs.map((row, i) => (
              <tr
                key={i}
                className="border-b border-[var(--border-color)] last:border-0 transition-colors duration-200 hover:bg-[var(--text-primary)]/[0.02]"
              >
                <td className="px-6 py-3.5">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">{row.category}</span>
                </td>
                <td className="px-6 py-3.5">
                  <span className="text-sm text-[var(--text-secondary)] font-mono">{row.spec}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
