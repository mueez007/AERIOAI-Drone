"use client";

import Card from "@/components/ui/Card";
import { TelemetryData, GPSData, AttitudeData, BatteryData } from "@/types/api";
import { formatDistance, formatSpeed, formatAltitude, formatGPS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TelemetryPanelProps {
  telemetry: TelemetryData | null;
  gps: GPSData | null;
  attitude: AttitudeData | null;
  battery: BatteryData | null;
  isConnected: boolean;
  className?: string;
}

export default function TelemetryPanel({
  telemetry,
  gps,
  attitude,
  battery,
  isConnected,
  className,
}: TelemetryPanelProps) {
  const batteryPercent = battery?.percentage ?? telemetry?.battery_percent ?? 0;
  const batteryColor =
    batteryPercent > 60 ? "var(--accent-green)" :
    batteryPercent > 25 ? "var(--accent-yellow)" :
    "var(--accent-red)";

  const stats = [
    {
      label: "Altitude",
      value: formatAltitude(telemetry?.altitude ?? null),
      icon: "📏",
      color: "var(--accent-cyan)",
    },
    {
      label: "Speed",
      value: formatSpeed(telemetry?.ground_speed ?? null),
      icon: "💨",
      color: "var(--accent-cyan)",
    },
    {
      label: "Distance",
      value: formatDistance(telemetry?.distance_to_home ?? null),
      icon: "📐",
      color: "var(--accent-cyan)",
    },
    {
      label: "Heading",
      value: telemetry?.heading ? `${Math.round(telemetry.heading)}°` : "---",
      icon: "🧭",
      color: "var(--accent-cyan)",
    },
  ];

  return (
    <Card className={cn("space-y-4", className)} variant="glass">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs tracking-wider text-[var(--text-primary)] uppercase">
          Telemetry
        </h3>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-[var(--accent-green)] animate-pulse" : "bg-[var(--accent-red)]"
            )}
          />
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            {isConnected ? "CONNECTED" : "NO SIGNAL"}
          </span>
        </div>
      </div>

      {/* GPS Coordinates */}
      <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
        <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider mb-1">
          📍 GPS COORDINATES
        </p>
        <p className="text-xs font-mono text-[var(--text-primary)]">
          {gps ? formatGPS(gps.lat, gps.lon) : "Acquiring signal..."}
        </p>
        <div className="flex gap-4 mt-1.5">
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            SAT: {gps?.satellites ?? "--"}
          </span>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">
            FIX: {gps?.fix_type ?? "--"}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card p-3"
          >
            <span className="text-lg mb-1 block">{stat.icon}</span>
            <div
              className="stat-value text-lg"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Battery Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
            🔋 BATTERY
          </span>
          <span
            className="text-[10px] font-mono font-bold"
            style={{ color: batteryColor }}
          >
            {batteryPercent.toFixed(0)}%
          </span>
        </div>
        <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden border border-[var(--border-color)]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${batteryPercent}%`,
              background: `linear-gradient(90deg, ${batteryColor}, ${batteryColor}88)`,
            }}
          />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
          <span>{(battery?.voltage ?? 0).toFixed(1)}V</span>
          <span>{battery?.cells ?? "--"}S</span>
        </div>
      </div>

      {/* Attitude */}
      {attitude && (
        <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
          <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider mb-2">
            📐 ATTITUDE
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "ROLL", value: attitude.roll?.toFixed(1) + "°" },
              { label: "PITCH", value: attitude.pitch?.toFixed(1) + "°" },
              { label: "YAW", value: attitude.yaw?.toFixed(1) + "°" },
            ].map((a) => (
              <div key={a.label}>
                <div className="text-xs font-mono text-[var(--accent-cyan)]">{a.value}</div>
                <div className="text-[9px] font-mono text-[var(--text-muted)]">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
