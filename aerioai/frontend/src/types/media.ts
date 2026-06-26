export interface MediaFilter {
  missionId?: string;
  type?: "photo" | "video" | "all";
  threatLevel?: "LOW" | "MEDIUM" | "HIGH" | "all";
  search?: string;
  sortBy?: "newest" | "oldest" | "name";
  page: number;
  limit: number;
}

export interface MediaStats {
  totalPhotos: number;
  totalVideos: number;
  totalSize: string;
  oldestCapture: string | null;
  newestCapture: string | null;
}

export interface VideoTimelineEvent {
  time: string;
  seconds: number;
  event: string;
  objects?: string[];
}
