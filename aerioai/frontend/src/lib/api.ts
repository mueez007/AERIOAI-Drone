import { API_BASE_URL } from "./constants";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        if (token) {
          window.localStorage.setItem("aerioai_token", token);
        } else {
          window.localStorage.removeItem("aerioai_token");
        }
      } catch {
        // localStorage not available
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        this.token = window.localStorage.getItem("aerioai_token");
      } catch {
        // ignore
      }
    }
    return this.token;
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, headers = {}, isFormData = false } = options;

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (!isFormData) {
      requestHeaders["Content-Type"] = "application/json";
    }

    const currentToken = this.getToken();
    if (currentToken) {
      requestHeaders["Authorization"] = `Bearer ${currentToken}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (body) {
      config.body = isFormData ? body as FormData : JSON.stringify(body);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, config);

    if (response.status === 401) {
      this.setToken(null);
      if (typeof window !== "undefined" && !endpoint.includes("/api/auth/login")) {
        window.location.href = "/login";
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth
  async login(username: string, password: string) {
    const data = await this.request<{ access_token: string; token_type: string; user: unknown }>(
      "/api/auth/login",
      { method: "POST", body: { username, password } }
    );
    this.setToken(data.access_token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  async register(username: string, email: string, password: string) {
    return this.request("/api/auth/register", {
      method: "POST",
      body: { username, email, password },
    });
  }

  async getMe() {
    return this.request("/api/auth/me");
  }

  async changePassword(old_password: string, new_password: string) {
    return this.request("/api/auth/change-password", {
      method: "POST",
      body: { old_password, new_password },
    });
  }

  // Camera
  async capturePhoto(missionId?: string) {
    const params = missionId ? `?mission_id=${missionId}` : "";
    return this.request(`/api/camera/capture${params}`, { method: "POST" });
  }

  async startRecording(missionId?: string) {
    const params = missionId ? `?mission_id=${missionId}` : "";
    return this.request(`/api/camera/record/start${params}`, { method: "POST" });
  }

  async stopRecording(missionId?: string) {
    const params = missionId ? `?mission_id=${missionId}` : "";
    return this.request(`/api/camera/record/stop${params}`, { method: "POST" });
  }

  async getPhotos(missionId?: string, skip = 0, limit = 50) {
    const params = new URLSearchParams();
    if (missionId) params.set("mission_id", missionId);
    params.set("skip", String(skip));
    params.set("limit", String(limit));
    return this.request(`/api/camera/photos?${params}`);
  }

  async getVideos(missionId?: string, skip = 0, limit = 50) {
    const params = new URLSearchParams();
    if (missionId) params.set("mission_id", missionId);
    params.set("skip", String(skip));
    params.set("limit", String(limit));
    return this.request(`/api/camera/videos?${params}`);
  }

  async deleteMedia(mediaId: string) {
    return this.request(`/api/camera/${mediaId}`, { method: "DELETE" });
  }

  async getMedia(missionId?: string): Promise<any[]> {
    const [photosRes, videosRes] = await Promise.all([
      this.getPhotos(missionId).catch(() => ({ photos: [] })),
      this.getVideos(missionId).catch(() => ({ videos: [] })),
    ]);
    const photos = (photosRes as any)?.photos || [];
    const videos = (videosRes as any)?.videos || [];
    return [...photos, ...videos].sort(
      (a: any, b: any) => new Date(b.created_at || b.captured_at).getTime() - new Date(a.created_at || a.captured_at).getTime()
    );
  }

  async analyzeMedia(mediaId: string): Promise<any> {
    return this.analyzeScene(mediaId);
  }

  getStreamUrl(): string {
    return `${this.baseUrl}/api/camera/stream`;
  }

  getMediaDownloadUrl(mediaId: string): string {
    return `${this.baseUrl}/api/camera/download/${mediaId}`;
  }

  getAudioUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  // Telemetry
  async getTelemetry() {
    return this.request("/api/telemetry");
  }

  // Emergency AI
  async getEmergencyStatus() {
    return this.request("/api/emergency/status");
  }

  async getGPS() {
    return this.request("/api/telemetry/gps");
  }

  async getAttitude() {
    return this.request("/api/telemetry/attitude");
  }

  async getBattery() {
    return this.request("/api/telemetry/battery");
  }

  async getSystemStatus() {
    return this.request("/api/telemetry/system");
  }

  // Missions
  async createMission(name: string) {
    return this.request("/api/missions", { method: "POST", body: { name } });
  }

  async getMissions(status?: string, skip = 0, limit = 20) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("skip", String(skip));
    params.set("limit", String(limit));
    return this.request(`/api/missions?${params}`);
  }


  async deleteLiveAnalysisLogs(context?: string, sessionId?: string) {
    const params = new URLSearchParams();
    if (context) params.set("context", context);
    if (sessionId) params.set("session_id", sessionId);
    const qs = params.toString();
    return this.request(`/api/chat/live-analysis-logs${qs ? `?${qs}` : ""}`, {
      method: 'DELETE',
    });
  }

  async getMission(missionId: string) {
    return this.request(`/api/missions/${missionId}`);
  }

  async updateMission(missionId: string, data: Record<string, unknown>) {
    return this.request(`/api/missions/${missionId}`, { method: "PATCH", body: data });
  }

  async startMission(missionId: string) {
    return this.request(`/api/missions/${missionId}/start`, { method: "POST" });
  }

  async completeMission(missionId: string) {
    return this.request(`/api/missions/${missionId}/complete`, { method: "POST" });
  }

  async deleteMission(missionId: string) {
    return this.request(`/api/missions/${missionId}`, { method: "DELETE" });
  }

  async compareMissions(missionIds: string[]) {
    return this.request("/api/missions/compare", {
      method: "POST",
      body: { mission_ids: missionIds },
    });
  }

  async queryMissions(query: string) {
    return this.request("/api/missions/query", { method: "POST", body: { query } });
  }

  // Chat
  async sendChatMessage(message: string, mediaId?: string, missionId?: string, liveStream = false, generateAudio = false, sessionId?: string, context?: string, missionMode = "surveillance") {
    return this.request("/api/chat/message", {
      method: "POST",
      body: { 
        message, 
        media_id: mediaId, 
        mission_id: missionId, 
        live_stream: liveStream, 
        generate_audio: generateAudio, 
        session_id: sessionId, 
        context: context || "ai_chat",
        mission_mode: missionMode 
      },
    });
  }

  async sendVoiceCommand(audioBlob: Blob, missionId?: string, liveStream = false, sessionId?: string, context?: string, missionMode = "surveillance") {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.wav");
    if (missionId) formData.append("mission_id", missionId);
    if (liveStream) formData.append("live_stream", "true");
    if (sessionId) formData.append("session_id", sessionId);
    if (context) formData.append("context", context);
    formData.append("mission_mode", missionMode);
    return this.request("/api/chat/voice", {
      method: "POST",
      body: formData,
      isFormData: true,
    });
  }

  async getLiveAnalysisHistory(context?: string, sessionId?: string) {
    const params = new URLSearchParams();
    if (context) params.set("context", context);
    if (sessionId) params.set("session_id", sessionId);
    const qs = params.toString();
    return this.request(`/api/chat/history${qs ? `?${qs}` : ""}`);
  }

  async getStartupAnnouncement(missionMode?: string) {
    const params = missionMode ? `?mission_mode=${encodeURIComponent(missionMode)}` : "";
    return this.request(`/api/chat/startup-announcement${params}`);
  }

  // --- Trajectory ---
  async getTrajectory(): Promise<{ points: { lat: number; lon: number; alt?: number; heading?: number; timestamp?: number }[]; source: string; is_simulated: boolean; count: number }> {
    return this.request("/api/telemetry/trajectory");
  }

  // --- Scene & Media Analysis ---
  async analyzeScene(mediaId: string, prompt?: string, liveStream = false, analysisType = "normal", missionMode = "surveillance") {
    return this.request(
      "/api/chat/analyze-scene",
      { 
        method: "POST", 
        body: { media_id: mediaId, prompt, live_stream: liveStream, analysis_type: analysisType, mission_mode: missionMode } 
      }
    );
  }

  async deepAnalyzeVideo(mediaId: string, analysisType = "normal") {
    return this.request(
      "/api/chat/deep-analyze-video",
      { 
        method: "POST", 
        body: { media_id: mediaId, analysis_type: analysisType } 
      }
    );
  }

  // System
  async getSystemHealth() {
    return this.request("/api/system/health");
  }

  async getSystemStats() {
    return this.request("/api/system/stats");
  }

  async getAuditLogs(skip = 0, limit = 50) {
    return this.request(`/api/system/audit-logs?skip=${skip}&limit=${limit}`);
  }
}

export const api = new ApiClient(API_BASE_URL);
export default api;
