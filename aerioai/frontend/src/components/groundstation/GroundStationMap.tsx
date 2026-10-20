"use client";

import dynamic from "next/dynamic";
import { GPSData, AttitudeData } from "@/types/api";
import { MissionModeId, MapWaypoint, SurvivorTarget } from "./types";

interface GroundStationMapProps {
  gps: GPSData | null;
  attitude: AttitudeData | null;
  missionMode: MissionModeId;
  waypoints?: MapWaypoint[];
  onAddWaypoint?: (wp: MapWaypoint) => void;
  survivors?: SurvivorTarget[];
  className?: string;
  isSimulated?: boolean;
}

const DynamicMap = dynamic(
  () => import("./GroundStationMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-[#090b10] rounded-2xl border border-[var(--border-color)] text-[var(--text-muted)] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-cyan)] border-t-transparent animate-spin" />
        <span className="font-mono text-xs tracking-widest uppercase">INITIALIZING GEOGRAPHIC TILES...</span>
      </div>
    ),
  }
);

export default function GroundStationMap(props: GroundStationMapProps) {
  return <DynamicMap {...props} />;
}
