"use client";

import { MediaItem } from "@/types/api";
import MediaCard from "./MediaCard";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface MediaGridProps {
  items: MediaItem[];
  onSelect: (media: MediaItem) => void;
  onDelete: (id: string) => void;
  getDownloadUrl: (id: string) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  columns?: 2 | 3 | 4;
}

export default function MediaGrid({
  items,
  onSelect,
  onDelete,
  getDownloadUrl,
  isLoading = false,
  emptyMessage = "No media found",
  className,
  columns = 4,
}: MediaGridProps) {
  const gridCols = {
    2: "grid-cols-2",
    3: "grid-cols-2 md:grid-cols-3",
    4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  };

  if (isLoading) {
    return (
      <div className={cn("grid gap-3", gridCols[columns], className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden animate-pulse"
          >
            <div className="aspect-video bg-[var(--bg-tertiary)]" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-[var(--bg-tertiary)] rounded w-3/4" />
              <div className="h-2 bg-[var(--bg-tertiary)] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card className={cn("text-center py-12", className)}>
        <span className="text-4xl block mb-3">📭</span>
        <p className="text-sm font-mono text-[var(--text-muted)]">{emptyMessage}</p>
      </Card>
    );
  }

  return (
    <div className={cn("grid gap-3", gridCols[columns], className)}>
      {items.map((media, index) => (
        <div
          key={media.id}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <MediaCard
            media={media}
            onSelect={onSelect}
            onDelete={onDelete}
            downloadUrl={getDownloadUrl(media.id)}
          />
        </div>
      ))}
    </div>
  );
}
