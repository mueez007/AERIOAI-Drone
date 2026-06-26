"use client";

import { TelemetryData, GPSData, AttitudeData, BatteryData, DroneStatus } from "@/types/api";
import { formatDistance, formatSpeed, formatAltitude, formatGPS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TelemetryOverlayProps {
  telemetry: TelemetryData | null;
  gps: GPSData | null;
  attitude: AttitudeData | null;
  battery: BatteryData | null;
  droneStatus: DroneStatus | null;
  isConnected: boolean;
  className?: string;
}

export default function TelemetryOverlay({
  telemetry,
  gps,
  attitude,
  battery,
  droneStatus,
  isConnected,
  className,
}: TelemetryOverlayProps) {
  // Safe fallbacks
  const batteryPercent = battery?.percentage ?? telemetry?.battery_percent ?? 0;
  const batteryVoltage = battery?.voltage ?? telemetry?.battery_voltage ?? 0;
  
  // Color coding
  const batteryColor =
    batteryPercent > 60 ? "text-green-400" :
    batteryPercent > 25 ? "text-yellow-400" :
    "text-red-500 animate-pulse";
    
  const gpsFixColor = 
    (gps?.fix_type === "3D" || gps?.fix_type === "3D+HDOP" || telemetry?.fix_type === "3D") ? "text-green-400" :
    (gps?.fix_type === "2D" || telemetry?.fix_type === "2D") ? "text-yellow-400" :
    "text-red-500 animate-pulse";

  const isArmed = droneStatus?.armed ?? telemetry?.armed ?? false;
  const flightMode = droneStatus?.flight_mode ?? telemetry?.flight_mode ?? "DISARMED";

  return (
    <div className={cn("flex flex-col gap-3 font-mono text-[var(--text-primary)] pointer-events-auto", className)}>
      
      {/* ── Flight Status Bar ── */}
      <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-xl p-3 border border-[var(--border-color)] shadow-sm flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full", isArmed ? "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-gray-400")} />
          <span className="font-bold text-sm tracking-wider uppercase">{isArmed ? "ARMED" : "DISARMED"}</span>
        </div>
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] px-3 py-1 rounded-md border border-[var(--border-color)]">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">MODE</span>
          <span className="text-sm font-bold text-[var(--accent-cyan)]">{flightMode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", isConnected ? "bg-green-500 animate-pulse" : "bg-red-500")} />
          <span className="text-xs text-[var(--text-secondary)]">{isConnected ? "LINK OK" : "NO LINK"}</span>
        </div>
      </div>

      <div className="flex gap-4 flex-col md:flex-row items-stretch mt-1">
        {/* ── Left Column: Navigation & Attitude ── */}
        <div className="flex flex-col gap-4 w-full md:w-64">
          
          {/* Attitude & Heading */}
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--border-color)] shadow-sm flex flex-col gap-3 flex-1">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-1">Attitude</span>
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div className="text-[var(--text-secondary)]">PITCH</div>
              <div className="text-right font-bold text-[var(--text-primary)]">{(attitude?.pitch ?? telemetry?.pitch ?? 0).toFixed(1)}°</div>
              <div className="text-[var(--text-secondary)]">ROLL</div>
              <div className="text-right font-bold text-[var(--text-primary)]">{(attitude?.roll ?? telemetry?.roll ?? 0).toFixed(1)}°</div>
              <div className="text-[var(--text-secondary)]">YAW</div>
              <div className="text-right font-bold text-[var(--accent-cyan)]">{(attitude?.yaw ?? telemetry?.yaw ?? 0).toFixed(1)}°</div>
            </div>
            
            {/* Compass Rose Mini */}
            <div className="mt-auto flex items-center justify-center h-16 relative overflow-hidden rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] shadow-inner">
              <div 
                className="absolute text-sm font-bold transition-transform duration-300 ease-linear text-[var(--text-primary)]"
                style={{ transform: `rotate(${-(attitude?.heading ?? telemetry?.heading ?? 0)}deg)` }}
              >
                <div className="text-[var(--accent-red)] -mt-4">N</div>
              </div>
              <span className="text-xs z-10 text-[var(--text-primary)] bg-[var(--bg-primary)]/80 px-2 rounded-md shadow-sm border border-[var(--border-color)]">
                {Math.round(attitude?.heading ?? telemetry?.heading ?? 0)}°
              </span>
            </div>
          </div>

          {/* GPS Info */}
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--border-color)] shadow-sm flex flex-col gap-2">
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest border-b border-[var(--border-color)] pb-1">Location</span>
            <div className="text-[11px] mt-1 space-y-1 text-[var(--text-primary)]">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">LAT:</span>
                <span className="font-medium">{gps ? gps.lat.toFixed(6) : (telemetry?.gps_lat ?? 0).toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">LON:</span>
                <span className="font-medium">{gps ? gps.lon.toFixed(6) : (telemetry?.gps_lon ?? 0).toFixed(6)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border-color)] text-xs">
              <div className="flex gap-1 items-center">
                <span className="text-[var(--text-secondary)]">SAT:</span>
                <span className="font-bold text-[var(--text-primary)]">{gps?.satellites ?? telemetry?.satellites ?? 0}</span>
              </div>
              <span className={cn("font-bold text-[10px]", gpsFixColor)}>{gps?.fix_type ?? telemetry?.fix_type ?? "NO FIX"}</span>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {/* ── Right Column: Power & Performance ── */}
        <div className="flex flex-col gap-4 w-full md:w-72">
          
          {/* Main Flight Stats */}
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--border-color)] shadow-sm flex flex-col gap-4">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">Altitude</span>
              <div className="text-3xl font-bold tracking-tighter text-[var(--accent-cyan)] flex items-end gap-1">
                {formatAltitude(telemetry?.altitude ?? 0).replace("m", "")}
                <span className="text-sm font-normal text-[var(--text-muted)] mb-1">m</span>
              </div>
            </div>
            
            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">Ground Speed</span>
              <div className="text-2xl font-bold tracking-tighter text-[var(--text-primary)] flex items-end gap-1">
                {formatSpeed(gps?.speed ?? telemetry?.ground_speed ?? 0).replace("m/s", "")}
                <span className="text-sm font-normal text-[var(--text-muted)] mb-1">m/s</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">Dist to Home</span>
              <div className="text-xl font-bold tracking-tighter flex items-end gap-1 text-[var(--text-secondary)]">
                {formatDistance(telemetry?.distance_to_home ?? 0).replace("m", "")}
                <span className="text-xs font-normal text-[var(--text-muted)] mb-0.5">m</span>
              </div>
            </div>
          </div>

          {/* Battery */}
          <div className="bg-[var(--glass-bg)] backdrop-blur-md rounded-xl p-4 border border-[var(--border-color)] shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-end border-b border-[var(--border-color)] pb-2">
              <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">Battery</span>
              <span className={cn("text-xl font-bold tracking-tighter", batteryColor)}>
                {Math.round(batteryPercent)}%
              </span>
            </div>
            
            {/* Battery Bar */}
            <div className="w-full h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div 
                className={cn("h-full transition-all duration-1000", 
                  batteryPercent > 60 ? "bg-green-500" : batteryPercent > 25 ? "bg-yellow-500" : "bg-red-500"
                )}
                style={{ width: `${Math.max(0, Math.min(100, batteryPercent))}%` }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-[var(--text-primary)]">
              <div className="text-[var(--text-secondary)]">VOLTAGE</div>
              <div className="text-right font-medium">{batteryVoltage.toFixed(1)}V</div>
              <div className="text-[var(--text-secondary)]">CURRENT</div>
              <div className="text-right font-medium">{(battery?.current ?? telemetry?.battery_current ?? 0).toFixed(1)}A</div>
              <div className="text-[var(--text-secondary)]">CONSUMED</div>
              <div className="text-right font-medium">{(battery?.mah_used ?? telemetry?.mah_used ?? 0)}mAh</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
