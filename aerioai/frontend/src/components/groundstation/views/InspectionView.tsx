"use client";

import { useState } from "react";
import { InspectionAsset, DefectFinding } from "../types";

interface InspectionViewProps {
  onSelectAsset?: (asset: InspectionAsset) => void;
}

const DEFAULT_ASSETS: InspectionAsset[] = [
  {
    id: "asset_01",
    name: "Wind Turbine Generator WT-04",
    category: "wind_turbine",
    lat: 13.0837,
    lon: 77.5887,
    heightMeters: 110,
    inspectionType: "orbital",
    criticalFindingsCount: 2,
  },
  {
    id: "asset_02",
    name: "HV Transmission Tower P-12",
    category: "power_pylon",
    lat: 13.0862,
    lon: 77.5821,
    heightMeters: 45,
    inspectionType: "vertical_facade",
    criticalFindingsCount: 1,
  },
  {
    id: "asset_03",
    name: "Viaduct Pier & Bridge Span B-2",
    category: "bridge_span",
    lat: 13.0798,
    lon: 77.5912,
    heightMeters: 28,
    inspectionType: "vertical_facade",
    criticalFindingsCount: 0,
  },
];

const DEFAULT_FINDINGS: DefectFinding[] = [
  {
    id: "finding_1",
    assetId: "asset_01",
    component: "Blade Tip B (Leading Edge)",
    defectType: "surface_crack",
    severity: "critical",
    confidence: 0.96,
    detectedAt: "08:15 AM",
    annotation: "Micro-fissure extending 14cm along leading composite gelcoat. Recommend ultrasonic gauge test.",
  },
  {
    id: "finding_2",
    assetId: "asset_01",
    component: "Nacelle Yaw Bearing Ring",
    defectType: "thermal_hotspot",
    severity: "warning",
    confidence: 0.89,
    detectedAt: "08:24 AM",
    annotation: "Thermal differential +18.4°C over adjacent mechanical bearings.",
  },
  {
    id: "finding_3",
    assetId: "asset_02",
    component: "Insulator String Bracket #3",
    defectType: "corrosion",
    severity: "advisory",
    confidence: 0.82,
    detectedAt: "08:40 AM",
    annotation: "Surface oxidation observed on galvanized mountings. No structural compromise.",
  },
];

export default function InspectionView({
  onSelectAsset,
}: InspectionViewProps) {
  const [selectedAsset, setSelectedAsset] = useState<InspectionAsset>(DEFAULT_ASSETS[0]);
  const [orbitRadius, setOrbitRadius] = useState(80); // meters
  const [gimbalPitchAngle, setGimbalPitchAngle] = useState(-25); // degrees
  const [findings] = useState<DefectFinding[]>(DEFAULT_FINDINGS);

  return (
    <div className="flex flex-col gap-5 w-full font-sans text-[var(--text-primary)]">
      {/* ── Status Banner (Limitation Transparency) ── */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-bold text-amber-400">INFRASTRUCTURE INSPECTION (INSPECT-CORE)</span>
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">
          Asset profiles & defect tagging active • Automated 3D point-cloud inspection in Phase 2
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Asset Selection & Survey Orbit Controls */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>🏗️</span> Target Asset Definition
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                {selectedAsset.heightMeters}M STRUCTURE
              </span>
            </div>

            {/* Asset Selector */}
            <div className="space-y-2">
              {DEFAULT_ASSETS.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => {
                    setSelectedAsset(asset);
                    onSelectAsset?.(asset);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedAsset.id === asset.id
                      ? "bg-amber-500/15 border-amber-500/40 text-white shadow-[0_0_15px_rgba(255,214,10,0.2)]"
                      : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">{asset.name}</p>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono capitalize">
                      {asset.inspectionType.replace("_", " ")} flight plan
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      asset.criticalFindingsCount > 0 ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"
                    }`}>
                      {asset.criticalFindingsCount} ALERTS
                    </span>
                    <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">{asset.heightMeters}m H</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Orbital Flight Parameters */}
            <div className="mt-2 pt-4 border-t border-white/10 space-y-3">
              <h5 className="text-xs font-bold font-mono text-[var(--text-muted)] uppercase tracking-wider">
                Inspection Orbit & Gimbal Telemetry
              </h5>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">ORBIT RADIUS</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold font-mono text-amber-400">{orbitRadius}m</span>
                    <div className="flex gap-1">
                      <button onClick={() => setOrbitRadius(Math.max(30, orbitRadius - 10))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">-</button>
                      <button onClick={() => setOrbitRadius(Math.min(150, orbitRadius + 10))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">+</button>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500">Standoff buffer</span>
                </div>

                <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">GIMBAL ANGLE</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold font-mono text-amber-400">{gimbalPitchAngle}°</span>
                    <div className="flex gap-1">
                      <button onClick={() => setGimbalPitchAngle(Math.max(-90, gimbalPitchAngle - 5))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">-</button>
                      <button onClick={() => setGimbalPitchAngle(Math.min(20, gimbalPitchAngle + 5))} className="px-2 py-0.5 rounded bg-white/10 text-xs font-mono">+</button>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500">Auto-tracks target POI</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Image Annotations & Defect Marking Log */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <span>🔍</span> Structural Defect Log & Tagging
                </h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Optical defect detection, crack widths & thermal anomalies
                </p>
              </div>
              <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-400 font-mono text-xs font-bold">
                {findings.length} DEFECTS
              </span>
            </div>

            {/* Findings List */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {findings.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-black/40 border border-white/5 hover:border-amber-500/30 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-primary)]">
                        {item.component}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                        {item.defectType.replace("_", " ")}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      item.severity === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                      item.severity === "warning" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    }`}>
                      {item.severity}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {item.annotation}
                  </p>

                  <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)] pt-1 border-t border-white/5">
                    <span>CONFIDENCE: {Math.round(item.confidence * 100)}%</span>
                    <span>{item.detectedAt}</span>
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
