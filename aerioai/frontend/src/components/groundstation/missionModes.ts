import { MissionModeConfig, MissionModeId } from "./types";

export const MISSION_MODES: Record<MissionModeId, MissionModeConfig> = {
  surveillance: {
    id: "surveillance",
    name: "Surveillance & Reconnaissance",
    shortName: "Surveillance",
    badge: "TACTICAL SEC",
    color: "#2997ff",
    gradient: "from-[#2997ff]/20 via-[#2997ff]/5 to-transparent",
    iconName: "shield",
    tagline: "Aerial Perimeter & Threat Detection",
    description: "Live optical surveillance feed with real-time YOLO object tracking, multimodal AI scene intelligence, automated threat triage, and voice intercom.",
    primaryFeatures: [
      "Real-time MJPEG live stream",
      "YOLOv8 Edge object detection",
      "Gemini 2.5 scene understanding",
      "Two-way tactical voice intercom"
    ],
    statusLabel: "Operational (Edge AI Active)",
  },
  search_rescue: {
    id: "search_rescue",
    name: "Search & Rescue (SAR)",
    shortName: "Search & Rescue",
    badge: "EMERGENCY SAR",
    color: "#ff453a",
    gradient: "from-[#ff453a]/20 via-[#ff453a]/5 to-transparent",
    iconName: "lifebuoy",
    tagline: "Survivor Triage & Grid Coverage",
    description: "Systematic search-pattern flight planning, KML perimeter import, human heat/optical detection tracking, and survivor triage coordination.",
    primaryFeatures: [
      "Search-area grid & KML boundary import",
      "Lawnmower & expanding square coverage",
      "Survivor GPS triage list & status",
      "Distress beacon & anomaly alerts"
    ],
    statusLabel: "Initial Interface (Ground Station Planning Active; Flight Execution in Phase 2)",
  },
  agriculture: {
    id: "agriculture",
    name: "Precision Agriculture",
    shortName: "Agriculture",
    badge: "AGRONOMY",
    color: "#30d158",
    gradient: "from-[#30d158]/20 via-[#30d158]/5 to-transparent",
    iconName: "leaf",
    tagline: "Crop Health & Canopy Assessment",
    description: "Field boundary mapping, survey overlap flight planning, vegetation index (NDVI) imagery previews, and agronomy stress point tracking.",
    primaryFeatures: [
      "Field boundary & acreage calculation",
      "Altitude & flight overlap survey planning",
      "Vegetative vigor & crop health preview",
      "Canopy stress & irrigation observations"
    ],
    statusLabel: "Initial Interface (Survey Planning & Telemetry Active; Multispectral Sensor Fusion in Progress)",
  },
  inspection: {
    id: "inspection",
    name: "Infrastructure Inspection",
    shortName: "Inspection",
    badge: "ASSET INSPECT",
    color: "#ffd60a",
    gradient: "from-[#ffd60a]/20 via-[#ffd60a]/5 to-transparent",
    iconName: "wrench",
    tagline: "Structural Health & Defect Tagging",
    description: "High-precision vertical facade scans, orbital asset waypoints, optical defect annotation (cracks, spalling, corrosion), and findings logging.",
    primaryFeatures: [
      "Critical asset profiles (Turbines, Pylons, Bridges)",
      "Orbital & vertical facade route preview",
      "Defect tagging & severity grading",
      "Structural health assessment reports"
    ],
    statusLabel: "Initial Interface (Optical Feed & Defect Tagging Active; Automated 3D Point-Cloud in Phase 2)",
  },
};
