import { Mission } from "./api";

export interface MissionStats {
  totalMissions: number;
  activeMissions: number;
  completedMissions: number;
  totalFlightTime: number;
  totalDistance: number;
  totalObjectsDetected: number;
  averageThreatScore: number;
  averageSuccessRate: number;
}

export interface MissionEvent {
  id: number;
  missionId: string;
  eventType: "created" | "started" | "waypoint_reached" | "detection" | "alert" | "completed" | "aborted";
  description: string;
  gpsLat?: number;
  gpsLon?: number;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}

export interface MissionFormData {
  name: string;
}

export interface MissionCompareSelection {
  mission1: Mission | null;
  mission2: Mission | null;
}
