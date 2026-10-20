export type MissionModeId = "surveillance" | "search_rescue" | "agriculture" | "inspection";

export type GroundStationView = "camera" | "map" | "mission";

export interface MissionModeConfig {
  id: MissionModeId;
  name: string;
  shortName: string;
  badge: string;
  color: string;
  gradient: string;
  iconName: string;
  tagline: string;
  description: string;
  primaryFeatures: string[];
  statusLabel: string;
}

export interface SessionMediaItem {
  id: string;
  filename: string;
  filepath: string;
  type: "photo" | "video";
  capturedAt: string;
  fileSizeBytes?: number;
  missionId?: string;
  saveDestination: string;
}

export interface MapWaypoint {
  id: string;
  lat: number;
  lon: number;
  alt: number;
  label: string;
  order: number;
}

// Search & Rescue Specific Types
export interface SearchArea {
  name: string;
  type: "grid" | "radius" | "polygon";
  centerLat: number;
  centerLon: number;
  radiusMeters?: number;
  bounds?: [number, number][];
  pattern: "lawnmower" | "expanding_square" | "sector";
  status: "pending" | "scanning" | "completed";
}

export interface SurvivorTarget {
  id: string;
  label: string;
  lat: number;
  lon: number;
  sightedAt: string;
  triage: "critical" | "moderate" | "safe";
  detectedBy: "Thermal Infrared" | "Visual Optical" | "Beacon Signal";
  confidence: number;
  notes: string;
}

// Agriculture Specific Types
export interface FieldBoundary {
  id: string;
  name: string;
  cropType: string;
  acreage: number;
  bounds: [number, number][];
  healthScore: number;
}

export interface AgronomyObservation {
  id: string;
  type: "weed_cluster" | "water_stress" | "canopy_vigor" | "irrigation_leak";
  severity: "low" | "medium" | "high";
  location: string;
  detectedAt: string;
  description: string;
}

// Inspection Specific Types
export interface InspectionAsset {
  id: string;
  name: string;
  category: "wind_turbine" | "power_pylon" | "bridge_span" | "solar_farm";
  lat: number;
  lon: number;
  heightMeters: number;
  inspectionType: "orbital" | "vertical_facade" | "thermal_sweep";
  criticalFindingsCount: number;
}

export interface DefectFinding {
  id: string;
  assetId: string;
  component: string;
  defectType: "surface_crack" | "corrosion" | "loose_fastener" | "thermal_hotspot";
  severity: "critical" | "warning" | "advisory";
  confidence: number;
  detectedAt: string;
  annotation: string;
}
