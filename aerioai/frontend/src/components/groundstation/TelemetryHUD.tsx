"use client";

import { TelemetryData, GPSData, AttitudeData, BatteryData, DroneStatus } from "@/types/api";

interface TelemetryHUDProps {
  telemetry: TelemetryData | null;
  gps: GPSData | null;
  attitude: AttitudeData | null;
  battery: BatteryData | null;
  droneStatus?: DroneStatus | null;
  isConnected: boolean;
  className?: string;
}

export default function TelemetryHUD({
  telemetry,
  gps,
  attitude,
  battery,
  droneStatus,
  isConnected,
  className = "",
}: TelemetryHUDProps) {
  // Determine if telemetry is simulated or hardware
  // When running locally on macOS without SpeedyBee FC attached, FC_MODE is mock
  const isHardwareFC = isConnected && telemetry?.flight_mode !== "MOCK" && telemetry?.satellites !== undefined && telemetry.satellites > 0;
  
  const altitude = telemetry?.altitude ?? gps?.alt ?? 0;
  const speed = telemetry?.ground_speed ?? gps?.speed ?? 0;
  const heading = attitude?.heading ?? gps?.heading ?? telemetry?.heading ?? 0;
  const roll = attitude?.roll ?? telemetry?.roll ?? 0;
  const pitch = attitude?.pitch ?? telemetry?.pitch ?? 0;
  const batteryPct = battery?.percentage ?? telemetry?.battery_percent ?? 0;
  const batteryVolt = battery?.voltage ?? telemetry?.battery_voltage ?? 0;
  const cells = battery?.cell_count ?? battery?.cells ?? telemetry?.cell_count ?? 4;
  const flightMode = droneStatus?.flight_mode ?? telemetry?.flight_mode ?? (isConnected ? "POSHOLD" : "STANDBY");
  const sats = gps?.satellites ?? telemetry?.satellites ?? 0;
  const armed = droneStatus?.armed ?? telemetry?.armed ?? false;

  return (
    <div className={`w-full bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-mono text-[var(--text-primary)] ${className}`}>
      {/* Top Status Banner with Clear Hardware vs. Simulated labeling */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10">
            <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-[var(--accent-green)] animate-pulse" : "bg-[var(--accent-red)]"}`} />
            <span className="font-bold text-[11px]">{isConnected ? "LINK CONNECTED" : "NO LINK"}</span>
          </div>

          {/* CRITICAL SAFETY BADGE: Explicitly distinguish Hardware vs Simulated */}
          {isHardwareFC ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] tracking-wider">
              [HARDWARE INAV/MSP]
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px] tracking-wider">
              [SIMULATED TELEMETRY]
            </span>
          )}

          <span className="px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[10px] tracking-wider">
            [SIMULATED VIDEO STREAM]
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            armed ? "bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse" : "bg-white/10 text-gray-400"
          }`}>
            {armed ? "ARMED" : "DISARMED"}
          </span>

          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-white/10 text-[var(--accent-cyan)] border border-white/10">
            MODE: {flightMode}
          </span>
        </div>
      </div>

      {/* Primary Telemetry Metrics Gauges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Altitude */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">ALTITUDE</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[var(--accent-cyan)]">{altitude.toFixed(1)}</span>
            <span className="text-xs text-[var(--text-muted)]">m</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">MSL / AGL</span>
        </div>

        {/* Speed */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">SPEED</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{(speed * 3.6).toFixed(1)}</span>
            <span className="text-xs text-[var(--text-muted)]">km/h</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">{speed.toFixed(1)} m/s GS</span>
        </div>

        {/* Battery */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">BATTERY</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl sm:text-2xl font-bold ${
              batteryPct > 30 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)] animate-pulse"
            }`}>
              {Math.round(batteryPct)}%
            </span>
            <span className="text-xs text-[var(--text-muted)]">{cells}S • {batteryVolt.toFixed(1)}V</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                batteryPct > 40 ? "bg-[var(--accent-green)]" : batteryPct > 20 ? "bg-[var(--accent-yellow)]" : "bg-[var(--accent-red)]"
              }`}
              style={{ width: `${Math.max(5, Math.min(100, batteryPct))}%` }}
            />
          </div>
        </div>

        {/* Heading & Compass */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">HEADING</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[var(--accent-purple)]">{Math.round(heading)}°</span>
            <span className="text-xs text-[var(--text-muted)]">{getHeadingCardinal(heading)}</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-1">MAG COMPASS</span>
        </div>

        {/* Attitude (Roll & Pitch) */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">ATTITUDE</span>
          <div className="flex items-center justify-between text-xs mt-1">
            <span>R: <b className="text-[var(--accent-cyan)]">{roll.toFixed(1)}°</b></span>
            <span>P: <b className="text-[var(--accent-cyan)]">{pitch.toFixed(1)}°</b></span>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex-1 bg-white/10 h-1 rounded-full overflow-hidden">
              <div
                className="bg-[var(--accent-cyan)] h-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, 50 + roll * 2))}%` }}
              />
            </div>
          </div>
        </div>

        {/* GPS Fix & Satellites */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">GPS SAT LOCK</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{sats}</span>
            <span className="text-xs text-[var(--accent-green)]">3D FIX</span>
          </div>
          <span className="text-[10px] text-gray-500 mt-1 truncate">
            {gps ? `${gps.lat.toFixed(4)}N, ${gps.lon.toFixed(4)}E` : "Awaiting Lock"}
          </span>
        </div>
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
