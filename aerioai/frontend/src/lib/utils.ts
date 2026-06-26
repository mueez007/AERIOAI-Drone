import { THREAT_COLORS } from "./constants";

/**
 * Format seconds into HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number | null): string {
  if (!seconds) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format distance in meters to km with 2 decimals
 */
export function formatDistance(meters: number | null): string {
  if (!meters) return "0.00 km";
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format speed in m/s to km/h
 */
export function formatSpeed(mps: number | null): string {
  if (!mps) return "0.0 km/h";
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

/**
 * Format altitude in meters
 */
export function formatAltitude(meters: number | null): string {
  if (!meters) return "0.0 m";
  return `${meters.toFixed(1)} m`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return "0%";
  return `${Math.round(value)}%`;
}

/**
 * Format GPS coordinates
 */
export function formatGPS(lat: number | null, lon: number | null): string {
  if (!lat || !lon) return "No GPS fix";
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}°${latDir}  ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

/**
 * Format timestamp to readable date/time
 */
export function formatTimestamp(isoString: string | null): string {
  if (!isoString) return "N/A";
  const date = new Date(isoString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number | null): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let size = bytes;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get threat level color
 */
export function getThreatColor(level: string | null): string {
  if (!level) return THREAT_COLORS.LOW;
  return THREAT_COLORS[level as keyof typeof THREAT_COLORS] || THREAT_COLORS.LOW;
}

/**
 * Get status badge class
 */
export function getStatusBadge(status: string): { className: string; label: string } {
  switch (status) {
    case "active":
      return { className: "badge-green", label: "ACTIVE" };
    case "completed":
      return { className: "badge-cyan", label: "COMPLETED" };
    case "created":
      return { className: "badge-yellow", label: "PENDING" };
    case "aborted":
      return { className: "badge-red", label: "ABORTED" };
    default:
      return { className: "badge-cyan", label: status.toUpperCase() };
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Classname merger
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
