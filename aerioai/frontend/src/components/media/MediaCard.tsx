"use client";

import { MediaItem } from "@/types/api";
import { formatTimestamp, formatFileSize, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

interface MediaCardProps {
  media: MediaItem;
  onSelect: (media: MediaItem) => void;
  onDelete: (id: string) => void;
  downloadUrl: string;
  className?: string;
}

export default function MediaCard({
  media,
  onSelect,
  onDelete,
  downloadUrl,
  className,
}: MediaCardProps) {
  return (
    <div
      className={cn(
        "group relative bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden transition-all duration-300 hover:border-[var(--accent-cyan)] hover:shadow-[0_0_20px_rgba(0,255,255,0.08)] hover:-translate-y-1 cursor-pointer",
        className
      )}
      onClick={() => onSelect(media)}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {media.media_type === "photo" ? (
          <img
            src={downloadUrl}
            alt={media.filename}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="text-center">
            <span className="text-4xl group-hover:scale-110 transition-transform duration-300 inline-block">
              🎥
            </span>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {media.duration_seconds ? `${Math.floor(media.duration_seconds / 60)}m ${media.duration_seconds % 60}s` : "Video"}
            </p>
          </div>
        )}

        {/* Threat badge */}
        {media.threat_level && media.threat_level !== "LOW" && (
          <Badge
            variant={media.threat_level === "HIGH" ? "red" : "yellow"}
            size="sm"
            className="absolute top-2 right-2"
          >
            {media.threat_level}
          </Badge>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="text-white text-sm font-mono">View</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <p className="text-xs font-mono text-[var(--text-primary)] truncate font-medium">
          {media.filename}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[var(--text-muted)]">
            {formatTimestamp(media.captured_at)}
          </span>
          <span className="text-[10px] text-[var(--text-muted)]">
            {formatFileSize(media.file_size_bytes)}
          </span>
        </div>

        {/* AI Summary preview */}
        {media.summary && (
          <p className="text-[10px] text-[var(--text-secondary)] line-clamp-2 mt-1 italic">
            {media.summary}
          </p>
        )}
      </div>

      {/* Delete button (appears on hover) */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(media.id);
        }}
        className="absolute top-2 left-2 p-1.5 rounded-lg bg-black/50 text-white/60 hover:text-[var(--accent-red)] hover:bg-black/80 opacity-0 group-hover:opacity-100 transition-all duration-200"
        title="Delete"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}
