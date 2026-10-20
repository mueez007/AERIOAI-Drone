"use client";

import { useState } from "react";
import { SurvivorTarget } from "../types";

interface SearchRescueViewProps {
  survivors?: SurvivorTarget[];
  onSelectSurvivor?: (s: SurvivorTarget) => void;
}

const DEFAULT_SAR_TARGETS: SurvivorTarget[] = [
  {
    id: "sar_target_1",
    label: "HUMAN THERMAL SIGNATURE #104",
    lat: 13.0842,
    lon: 77.5897,
    sightedAt: "10:14 AM",
    triage: "critical",
    detectedBy: "Thermal Infrared",
    confidence: 0.94,
    notes: "Subject stationary beneath dense canopy. Possible hypothermia or immobilization.",
  },
  {
    id: "sar_target_2",
    label: "REFLECTIVE DISTRESS MARKER #105",
    lat: 13.0815,
    lon: 77.5855,
    sightedAt: "10:22 AM",
    triage: "moderate",
    detectedBy: "Visual Optical",
    confidence: 0.88,
    notes: "Orange survival tarp laid out on open clearing.",
  },
  {
    id: "sar_target_3",
    label: "TRANSIENT THERMAL BLOOM",
    lat: 13.0855,
    lon: 77.5841,
    sightedAt: "10:31 AM",
    triage: "safe",
    detectedBy: "Thermal Infrared",
    confidence: 0.72,
    notes: "Likely wildlife or campfire residue in sector north.",
  },
];

export default function SearchRescueView({
  survivors = DEFAULT_SAR_TARGETS,
  onSelectSurvivor,
}: SearchRescueViewProps) {
  const [selectedPattern, setSelectedPattern] = useState<"lawnmower" | "expanding_square" | "sector">("lawnmower");
  const [kmlFile, setKmlFile] = useState<string | null>(null);
  const [gridSpacing, setGridSpacing] = useState(25); // meters
  const [flightAltitude, setFlightAltitude] = useState(45); // meters

  const handleKmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setKmlFile(file.name);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full font-sans text-[var(--text-primary)]">
      {/* ── Status Banner (Limitation Transparency) ── */}
      <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-bold text-red-400">SEARCH & RESCUE COMMAND (SAR-CORE)</span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          Planning & detection triage active • Autonomous flight execution reserved for Phase 2
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Search Area & Coverage-Route Configuration */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>🛰️</span> Search Area & Route Planner
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                SWATH: {gridSpacing}M
              </span>
            </div>

            {/* KML / GeoJSON Import */}
            <div className="p-4 rounded-xl bg-black/40 border border-dashed border-white/20 flex flex-col items-center justify-center text-center gap-2 relative">
              <input
                type="file"
                accept=".kml,.geojson,.json"
                onChange={handleKmlUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <span className="text-2xl">📥</span>
              <div className="text-xs font-bold text-[var(--accent-cyan)]">
                {kmlFile ? `Loaded: ${kmlFile}` : "Import KML / GeoJSON Search Perimeter"}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Drag and drop incident boundaries or click to browse
              </p>
            </div>

            {/* Pattern Selection */}
            <div>
              <label className="text-[10px] font-mono font-bold text-[var(--text-muted)] tracking-widest uppercase mb-2 block">
                COVERAGE PATTERN
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "lawnmower", label: "Parallel (Lawnmower)", desc: "Open terrain" },
                  { id: "expanding_square", label: "Expanding Square", desc: "Last known point" },
                  { id: "sector", label: "Sector Search", desc: "Circular datum" },
                ].map((pat) => (
                  <button
                    key={pat.id}
                    onClick={() => setSelectedPattern(pat.id as "lawnmower" | "expanding_square" | "sector")}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedPattern === pat.id
                        ? "bg-red-500/15 border-red-500/40 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                        : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                    }`}
                  >
                    <div className="text-xs font-bold">{pat.label}</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{pat.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Flight Coverage Parameters */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">TARGET ALTITUDE</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-bold font-mono text-[var(--accent-cyan)]">{flightAltitude}m</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFlightAltitude(Math.max(20, flightAltitude - 5))}
                      className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setFlightAltitude(Math.min(120, flightAltitude + 5))}
                      className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">TRACK SPACING</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-bold font-mono text-[var(--accent-cyan)]">{gridSpacing}m</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setGridSpacing(Math.max(10, gridSpacing - 5))}
                      className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setGridSpacing(Math.min(60, gridSpacing + 5))}
                      className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Survivor & Target Location Status Triage */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <span>🚨</span> Survivor & Target Detection Triage
                </h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Real-time GPS coordinate telemetry & sensory sightings
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-mono text-xs font-bold">
                {survivors.length} SIGHTINGS
              </span>
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {survivors.map((target) => (
                <div
                  key={target.id}
                  onClick={() => onSelectSurvivor?.(target)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                    target.triage === "critical"
                      ? "bg-red-500/10 border-red-500/30 hover:border-red-500"
                      : "bg-amber-500/10 border-amber-500/30 hover:border-amber-500"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {target.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      target.triage === "critical" ? "bg-red-500 text-white" : "bg-amber-500 text-black"
                    }`}>
                      {target.triage} PRIORITY
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-muted)]">
                    <span>GPS: <b className="text-[var(--accent-cyan)]">{target.lat.toFixed(5)}N, {target.lon.toFixed(5)}E</b></span>
                    <span>Sighted: <b>{target.sightedAt}</b></span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {target.notes}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-[var(--text-muted)]">
                    <span>SENSOR: {target.detectedBy} ({Math.round(target.confidence * 100)}%)</span>
                    <span className="text-[var(--accent-cyan)] hover:underline">SHOW ON MAP →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
