// API Configuration
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || `http://${hostname}:8000`;

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

// API Endpoints
export const ENDPOINTS = {
  // Auth
  LOGIN: "/api/auth/login",
  REGISTER: "/api/auth/register",
  ME: "/api/auth/me",

  // Camera
  CAPTURE: "/api/camera/capture",
  RECORD_START: "/api/camera/record/start",
  RECORD_STOP: "/api/camera/record/stop",
  PHOTOS: "/api/camera/photos",
  VIDEOS: "/api/camera/videos",
  STREAM: "/api/camera/stream",
  MEDIA_DELETE: (id: string) => `/api/camera/${id}`,
  MEDIA_DOWNLOAD: (id: string) => `/api/camera/download/${id}`,

  // Telemetry
  TELEMETRY: "/api/telemetry",
  TELEMETRY_WS: "/api/telemetry/ws",
  GPS: "/api/telemetry/gps",
  ATTITUDE: "/api/telemetry/attitude",
  BATTERY: "/api/telemetry/battery",
  SYSTEM_STATUS: "/api/telemetry/system",

  // Missions
  MISSIONS: "/api/missions",
  MISSION: (id: string) => `/api/missions/${id}`,
  MISSION_START: (id: string) => `/api/missions/${id}/start`,
  MISSION_COMPLETE: (id: string) => `/api/missions/${id}/complete`,
  MISSION_COMPARE: "/api/missions/compare",
  MISSION_QUERY: "/api/missions/query",

  // Chat
  CHAT_MESSAGE: "/api/chat/message",
  CHAT_VOICE: "/api/chat/voice",
  ANALYZE_SCENE: "/api/chat/analyze-scene",
  STARTUP_ANNOUNCEMENT: "/api/chat/startup-announcement",

  // System
  SYSTEM_HEALTH: "/api/system/health",
  SYSTEM_STATS: "/api/system/stats",
  AUDIT_LOGS: "/api/system/audit-logs",
} as const;

// Refresh intervals (ms)
export const INTERVALS = {
  TELEMETRY: 1000,
  HEALTH: 5000,
  STATS: 10000,
} as const;

// Threat level colors
export const THREAT_COLORS = {
  LOW: "var(--accent-green)",
  MEDIUM: "var(--accent-yellow)",
  HIGH: "var(--accent-red)",
} as const;

// Navigation items
export const NAV_ITEMS = [
  {
    label: "Live Stream",
    path: "/dashboard",
    icon: "camera",
  },
  {
    label: "Photos",
    path: "/photos",
    icon: "image",
  },
  {
    label: "Videos",
    path: "/videos",
    icon: "video",
  },
  {
    label: "AI Chat",
    path: "/chat",
    icon: "sparkle",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "gear",
  },
] as const;
