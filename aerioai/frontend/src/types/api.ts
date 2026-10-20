// Generic API Response
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: string;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "operator";
  is_active: number;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Media Types
export interface MediaItem {
  id: string;
  mission_id: string | null;
  media_type: "photo" | "video";
  filename: string;
  filepath: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  gps_lat: number | null;
  gps_lon: number | null;
  altitude: number | null;
  summary: string | null;
  threat_level: "LOW" | "MEDIUM" | "HIGH" | null;
  confidence: number | null;
  objects_detected: ObjectDetection[] | null;
  is_pinned: number;
  captured_at: string;
  created_at: string;
}

export interface ObjectDetection {
  class: string;
  count: number;
  confidence: number;
}

export type Media = MediaItem;

export interface MediaListResponse {
  total: number;
  photos: MediaItem[];
  videos: MediaItem[];
}

export interface CaptureResponse {
  id: string;
  filename: string;
  filepath: string;
  message: string;
}

// Telemetry Types
export interface TelemetryData {
  gps_lat: number;
  gps_lon: number;
  altitude: number;
  ground_speed: number;
  heading: number;
  roll: number;
  pitch: number;
  yaw: number;
  battery_voltage: number;
  battery_percent: number;
  battery_current: number;
  mah_used: number;
  cell_count: number;
  satellites: number;
  fix_type: string;
  flight_mode: string;
  armed: boolean;
  air_mode: boolean;
  failsafe: boolean;
  rth_active: boolean;
  waypoint_number: number;
  home_lat: number;
  home_lon: number;
  distance_to_home: number;
  is_simulated?: boolean;
  source?: "msp" | "mock" | "disconnected" | string;
  timestamp?: number;
}

export interface GPSData {
  lat: number;
  lon: number;
  alt: number;
  speed: number;
  heading: number;
  satellites: number;
  fix_type: string;
  home_lat: number;
  home_lon: number;
  is_simulated?: boolean;
  source?: string;
  timestamp?: number;
}

export interface AttitudeData {
  roll: number;
  pitch: number;
  yaw: number;
  heading: number;
}

export interface BatteryData {
  voltage: number;
  percentage: number;
  current: number;
  mah_used: number;
  cell_count: number;
  cells?: number;
}

export interface DroneStatus {
  flight_mode: string;
  armed: boolean;
  air_mode: boolean;
  failsafe: boolean;
  rth_active: boolean;
  waypoint_number: number;
  distance_to_home: number;
}

// Mission Types
export interface Mission {
  id: string;
  name: string;
  status: "created" | "active" | "completed" | "aborted";
  pilot_id: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_speed: number | null;
  max_altitude: number | null;
  total_objects_detected: number;
  total_threats: number;
  threat_score: number;
  coverage_score: number;
  mission_success: number;
  summary: string | null;
  is_pinned: number;
  created_at: string;
}

export interface MissionListResponse {
  total: number;
  missions: Mission[];
}

export interface MissionCompareResponse {
  missions: Mission[];
  comparison_text: string;
}

export interface MissionQueryResponse {
  query: string;
  result: string;
  matching_missions: Mission[];
}

// Chat Types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  mediaId?: string;
  missionId?: string;
  timestamp: string;
}

export interface ChatResponse {
  response: string;
  media_id?: string;
  mission_id?: string;
}

export interface VoiceCommandResponse {
  transcribed_text: string;
  ai_response: string;
  audio_url?: string;
}

export interface SceneAnalysisResponse {
  media_id: string;
  detections: ObjectDetection[];
  summary: string;
  threat_level: string;
  confidence: number;
  recommendations?: string;
}

// System Types
export interface SystemHealth {
  status: string;
  timestamp: string;
  cpu: {
    percent: number;
    cores: number;
  };
  ram: {
    total_gb: number;
    used_gb: number;
    available_gb: number;
    percent: number;
  };
  disk: {
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
    warning: boolean;
    critical: boolean;
  };
  system: {
    os: string;
    hostname: string;
    python_version: string;
  };
  services: {
    database: ServiceStatus;
    camera: ServiceStatus;
    flight_controller: ServiceStatus;
    gemini_api: ServiceStatus;
    groq_api: ServiceStatus;
  };
}

export interface ServiceStatus {
  status: string;
  message: string;
}

export interface SystemStats {
  missions: {
    total: number;
    active: number;
    completed: number;
  };
  media: {
    photos: number;
    videos: number;
  };
  storage: {
    used_percent: number;
    free_gb: number;
  };
  audit_logs: number;
}

export interface AuditLog {
  id: number;
  user_id: string;
  action: string;
  details: string;
  ip_address: string | null;
  created_at: string;
}

// WebSocket Types
export interface WSMessage {
  type: string;
  payload: unknown;
}
