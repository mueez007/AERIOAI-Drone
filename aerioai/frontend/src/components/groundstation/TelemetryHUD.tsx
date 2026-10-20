"use client";

import { TelemetryData, GPSData, AttitudeData, BatteryData, DroneStatus } from "@/types/api";

interface TelemetryHUDProps {
  telemetry: TelemetryData | null;
  gps: GPSData | null;
  attitude: AttitudeData | null;
  battery: BatteryData | null;
  droneStatus?: DroneStatus | null;
  isConnected: boolean;
  isStale?: boolean;
  isSimulated?: boolean;
  telemetrySource?: string;
  className?: string;
}

export default function TelemetryHUD({
  telemetry,
  gps,
  attitude,
  battery,
  droneStatus,
  isConnected,
  isStale = false,
  isSimulated = true,
  telemetrySource = "SIMULATED",
  className = "",
}: TelemetryHUDProps) {
  const isHardwareFC = isConnected && !isSimulated && telemetrySource === "HARDWARE — INAV/MSP";
  
  const rawAltitude = telemetry?.altitude ?? gps?.alt ?? null;
  const altitude = rawAltitude !== null ? rawAltitude : (isSimulated ? 50.0 : 0);
  const speed = telemetry?.ground_speed ?? gps?.speed ?? 0;
  
  const roll = attitude?.roll ?? telemetry?.roll ?? 0;
  const pitch = attitude?.pitch ?? telemetry?.pitch ?? 0;
  const batteryPct = battery?.percentage ?? telemetry?.battery_percent ?? 0;
  const batteryVolt = battery?.voltage ?? telemetry?.battery_voltage ?? 0;
  const cells = battery?.cell_count ?? battery?.cells ?? telemetry?.cell_count ?? 4;
  const flightMode = droneStatus?.flight_mode ?? telemetry?.flight_mode ?? (isConnected ? "POSHOLD" : "STANDBY");
  const sats = gps?.satellites ?? telemetry?.satellites ?? 0;
  const armed = droneStatus?.armed ?? telemetry?.armed ?? false;

  return (
    <div className={`w-full bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 shadow-xl flex flex-col gap-2.5 font-mono text-[var(--text-primary)] ${className}`}>
      {/* Top Status Bar: Truthful Hardware vs. Simulated labeling */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/10">
            <span className={`w-2 h-2 rounded-full ${isConnected ? (isStale ? "bg-amber-400" : "bg-[var(--accent-green)] animate-pulse") : "bg-[var(--accent-red)]"}`} />
            <span className="font-bold text-[11px]">{isConnected ? (isStale ? "LINK STALE" : "LINK ACTIVE") : "DISCONNECTED"}</span>
          </div>

          {/* Provenance Badge */}
          {isHardwareFC ? (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] tracking-wider">
              HARDWARE — INAV/MSP
            </span>
          ) : isStale ? (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px] tracking-wider">
              STALE TELEMETRY
            </span>
          ) : !isConnected ? (
            <span className="px-2.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-[10px] tracking-wider">
              DISCONNECTED
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px] tracking-wider">
              SIMULATED TELEMETRY
            </span>
          )}
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

      {/* 5 Essential Primary Telemetry Metrics (Compass integrated into Live Video HUD) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 items-stretch">
        {/* 1. Altitude */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-bold">ALTITUDE</span>
            {isSimulated && <span className="text-[8px] text-amber-400 bg-amber-500/15 px-1 py-0.2 rounded">SIM</span>}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[var(--accent-cyan)]">
              {rawAltitude !== null ? altitude.toFixed(1) : (isSimulated ? "50.0" : "---")}
            </span>
            <span className="text-xs text-[var(--text-muted)]">m</span>
          </div>
          <span className="text-[9px] text-gray-500 mt-0.5">REL (HOME)</span>
        </div>

        {/* 2. Speed */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-bold">SPEED</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{(speed * 3.6).toFixed(1)}</span>
            <span className="text-xs text-[var(--text-muted)]">km/h</span>
          </div>
          <span className="text-[9px] text-gray-500 mt-0.5">{speed.toFixed(1)} m/s GS</span>
        </div>

        {/* 3. Battery */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-bold">BATTERY</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl sm:text-2xl font-bold ${
              batteryPct > 30 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)] animate-pulse"
            }`}>
              {Math.round(batteryPct)}%
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">{cells}S • {batteryVolt.toFixed(1)}V</span>
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                batteryPct > 40 ? "bg-[var(--accent-green)]" : batteryPct > 20 ? "bg-[var(--accent-yellow)]" : "bg-[var(--accent-red)]"
              }`}
              style={{ width: `${Math.max(5, Math.min(100, batteryPct))}%` }}
            />
          </div>
        </div>

        {/* 4. Attitude */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-bold">ATTITUDE</span>
          <div className="flex items-center justify-between text-xs mt-1">
            <span>R: <b className="text-[var(--accent-cyan)]">{roll.toFixed(1)}°</b></span>
            <span>P: <b className="text-[var(--accent-cyan)]">{pitch.toFixed(1)}°</b></span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex-1 bg-white/10 h-1 rounded-full overflow-hidden">
              <div
                className="bg-[var(--accent-cyan)] h-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, 50 + roll * 2))}%` }}
              />
            </div>
          </div>
        </div>

        {/* 5. GPS Sat Lock */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase font-bold">GPS LOCK</span>
            {isSimulated && <span className="text-[8px] text-amber-400 bg-amber-500/15 px-1 py-0.2 rounded">SIM</span>}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-primary)]">{sats}</span>
            <span className={`text-[10px] font-bold ${sats >= 4 ? "text-[var(--accent-green)]" : "text-amber-400"}`}>
              {sats >= 4 ? "3D FIX" : "NO FIX"}
            </span>
          </div>
          <span className="text-[9px] text-gray-500 mt-0.5 truncate">
            {gps && typeof gps.lat === "number" && gps.lat !== 0 ? `${gps.lat.toFixed(3)}N, ${gps.lon.toFixed(3)}E` : "Awaiting Lock"}
          </span>
        </div>
      </div>
    </div>
  );
}
