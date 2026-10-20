"use client";

import { useState } from "react";
import { FieldBoundary, AgronomyObservation } from "../types";

interface AgricultureViewProps {
  onSelectField?: (field: FieldBoundary) => void;
}

const DEFAULT_FIELDS: FieldBoundary[] = [
  {
    id: "field_01",
    name: "Field 04 — North Orchard",
    cropType: "Citrus / Sweet Orange",
    acreage: 32.4,
    bounds: [],
    healthScore: 84,
  },
  {
    id: "field_02",
    name: "Field 07 — South Wheat Paddock",
    cropType: "Durum Wheat",
    acreage: 58.2,
    bounds: [],
    healthScore: 71,
  },
  {
    id: "field_03",
    name: "Field 11 — East Vineyard Block",
    cropType: "Cabernet Sauvignon",
    acreage: 18.6,
    bounds: [],
    healthScore: 92,
  },
];

const DEFAULT_OBSERVATIONS: AgronomyObservation[] = [
  {
    id: "obs_1",
    type: "water_stress",
    severity: "high",
    location: "Row 14-22 (North-East quadrant)",
    detectedAt: "09:45 AM",
    description: "Canopy temperature +3.2°C above ambient baseline. Possible drip line blockage.",
  },
  {
    id: "obs_2",
    type: "weed_cluster",
    severity: "medium",
    location: "Southern perimeter buffer",
    detectedAt: "09:52 AM",
    description: "Broadleaf cluster identified via optical classification (density: 8/m²).",
  },
  {
    id: "obs_3",
    type: "canopy_vigor",
    severity: "low",
    location: "Center block",
    detectedAt: "10:05 AM",
    description: "NDVI Index 0.78 — optimal chlorophyll saturation and nitrogen assimilation.",
  },
];

export default function AgricultureView({
  onSelectField,
}: AgricultureViewProps) {
  const [selectedField, setSelectedField] = useState<FieldBoundary>(DEFAULT_FIELDS[0]);
  const [altitude, setAltitude] = useState(60); // meters
  const [overlap, setOverlap] = useState(75); // %
  const [observations] = useState<AgronomyObservation[]>(DEFAULT_OBSERVATIONS);

  // Computed estimates
  const gsdCmPerPixel = (altitude * 0.045).toFixed(2); // estimated ground sample distance
  const flightDurationMin = Math.round((selectedField.acreage * 0.65) * (overlap / 70));

  return (
    <div className="flex flex-col gap-5 w-full font-sans text-[var(--text-primary)]">
      {/* ── Status Banner (Limitation Transparency) ── */}
      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-emerald-400">PRECISION AGRICULTURE (AGRI-SCAN)</span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          Survey planning & map boundaries active • Multispectral sensor fusion in progress
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Field Selection & Survey Parameters */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>🌱</span> Field Boundaries & Acreage
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                {selectedField.acreage} ACRES
              </span>
            </div>

            {/* Field Selector */}
            <div className="space-y-2">
              {DEFAULT_FIELDS.map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    setSelectedField(f);
                    onSelectField?.(f);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedField.id === f.id
                      ? "bg-emerald-500/15 border-emerald-500/40 text-white shadow-[0_0_15px_rgba(48,209,88,0.2)]"
                      : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{f.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono">{f.cropType}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold font-mono text-emerald-400">{f.healthScore}% VIGOR</span>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono">{f.acreage} ac</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Survey Flight Parameters */}
            <div className="mt-2 pt-4 border-t border-white/10 space-y-3">
              <h5 className="text-xs font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Photogrammetry & Overlap Planning
              </h5>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">SURVEY ALTITUDE</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold font-mono text-emerald-400">{altitude}m</span>
                    <div className="flex gap-1">
                      <button onClick={() => setAltitude(Math.max(30, altitude - 10))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">-</button>
                      <button onClick={() => setAltitude(Math.min(120, altitude + 10))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">+</button>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500">GSD: ~{gsdCmPerPixel} cm/pixel</span>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">FRONT/SIDE OVERLAP</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold font-mono text-emerald-400">{overlap}%</span>
                    <div className="flex gap-1">
                      <button onClick={() => setOverlap(Math.max(60, overlap - 5))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">-</button>
                      <button onClick={() => setOverlap(Math.min(85, overlap + 5))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">+</button>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500">Est. Flight: ~{flightDurationMin} mins</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Crop Imagery (NDVI) & Observations Log */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <span>🔬</span> Vegetation Health (NDVI Preview)
                </h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Normalized Difference Vegetation Index analysis
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                SCORE: {selectedField.healthScore}/100
              </span>
            </div>

            {/* NDVI Spectrum Bar */}
            <div className="space-y-1.5">
              <div className="h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-emerald-500 shadow-inner" />
              <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                <span>0.0 (Severe Stress)</span>
                <span>0.5 (Moderate)</span>
                <span>1.0 (Dense Vigor)</span>
              </div>
            </div>

            {/* Agronomy Observations Feed */}
            <div className="mt-2 space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              <span className="text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                RECENT FIELD OBSERVATIONS ({observations.length})
              </span>

              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-emerald-500/30 transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide">
                      {obs.type.replace("_", " ")}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      obs.severity === "high" ? "bg-red-500/20 text-red-400" :
                      obs.severity === "medium" ? "bg-amber-500/20 text-amber-400" :
                      "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {obs.severity} PRIORITY
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {obs.description}
                  </p>

                  <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-white/5">
                    <span>LOCATION: {obs.location}</span>
                    <span>{obs.detectedAt}</span>
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
