"use client";

import { useState } from "react";
import { MediaItem, SceneAnalysisResponse } from "@/types/api";
import { formatTimestamp, formatFileSize, getThreatColor, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import api from "@/lib/api";

interface MediaViewerProps {
  media: MediaItem;
  onClose: () => void;
  onDelete: (id: string) => void;
  downloadUrl: string;
}

export default function MediaViewer({
  media,
  onClose,
  onDelete,
  downloadUrl,
}: MediaViewerProps) {
  const [analysis, setAnalysis] = useState<SceneAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [zoom, setZoom] = useState(false);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const result = await api.analyzeScene(media.id);
      setAnalysis(result);
    } catch {
      setAnalysis(null);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-sm font-mono text-[var(--text-primary)] truncate">{media.filename}</h3>
            <p className="text-[10px] text-[var(--text-muted)]">{formatTimestamp(media.captured_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Media Preview */}
          <div
            className={cn(
              "relative bg-black flex items-center justify-center",
              zoom ? "cursor-zoom-out" : "cursor-zoom-in"
            )}
            onClick={() => setZoom(!zoom)}
          >
            {media.media_type === "photo" ? (
              <img
                src={downloadUrl}
                alt={media.filename}
                className={cn(
                  "transition-all duration-300",
                  zoom ? "max-w-full" : "max-w-full max-h-[50vh] object-contain"
                )}
              />
            ) : (
              <video
                src={downloadUrl}
                controls
                className="max-w-full max-h-[50vh]"
              />
            )}
          </div>

          {/* Details */}
          <div className="p-4 space-y-4">
            {/* Info Grid */}
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: "Type", value: media.media_type },
                { label: "Size", value: formatFileSize(media.file_size_bytes) },
                { label: "Duration", value: media.duration_seconds ? `${media.duration_seconds}s` : "N/A" },
                { label: "Captured", value: formatTimestamp(media.captured_at) },
              ].map((info) => (
                <div key={info.label} className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
                  <div className="text-xs font-mono text-[var(--accent-cyan)]">{info.value}</div>
                  <div className="text-[9px] text-[var(--text-muted)]">{info.label}</div>
                </div>
              ))}
            </div>

            {/* AI Analysis Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAnalyze}
                  loading={analyzing}
                  disabled={analyzing}
                >
                  🧠 Analyze Scene
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(downloadUrl, "_blank")}
                >
                  ⬇ Download
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onDelete(media.id)}
                >
                  🗑 Delete
                </Button>
              </div>

              {analyzing && (
                <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                  <Loader variant="command" size="sm" text="Analyzing scene..." />
                </div>
              )}

              {analysis && (
                <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)]/20 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-mono text-[var(--accent-cyan)] font-bold">AI ANALYSIS</p>
                    <Badge
                      variant={
                        analysis.threat_level === "LOW" ? "green" :
                        analysis.threat_level === "MEDIUM" ? "yellow" : "red"
                      }
                      size="sm"
                    >
                      {analysis.threat_level} · {Math.round(analysis.confidence)}% confidence
                    </Badge>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">{analysis.summary}</p>
                  {analysis.detections && analysis.detections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.detections.map((d, i) => (
                        <Badge key={i} variant="neutral" size="sm">
                          {d.class}: {d.count}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {analysis.recommendations && (
                    <div className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <p className="text-xs text-[var(--text-secondary)]">
                        💡 {analysis.recommendations}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
