"use client";

import { Mission } from "@/types/api";
import { formatDuration, formatTimestamp, getStatusBadge, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";

interface MissionCardProps {
  mission: Mission;
  onClick?: (mission: Mission) => void;
  onDelete?: (id: string) => void;
  onStart?: (id: string) => void;
  onComplete?: (id: string) => void;
  selected?: boolean;
  className?: string;
}

export default function MissionCard({
  mission,
  onClick,
  onDelete,
  onStart,
  onComplete,
  selected = false,
  className,
}: MissionCardProps) {
  const statusBadge = getStatusBadge(mission.status);

  return (
    <div
      onClick={() => onClick?.(mission)}
      className={cn(
        "group relative bg-[var(--bg-secondary)] border rounded-xl p-4 transition-all duration-300 cursor-pointer",
        selected
          ? "border-[var(--accent-cyan)] glow-cyan"
          : "border-[var(--border-color)] hover:border-[var(--accent-cyan)] hover:shadow-[0_0_20px_rgba(0,255,255,0.08)] hover:-translate-y-1",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-mono text-[var(--text-primary)] font-bold truncate">
            {mission.name}
          </h4>
          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">
            {mission.id}
          </p>
        </div>
        <Badge {...statusBadge} />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Duration", value: formatDuration(mission.duration_seconds) },
          { label: "Objects", value: mission.total_objects_detected },
          { label: "Threats", value: mission.total_threats },
        ].map((stat) => (
          <div
            key={stat.label}
            className="text-center p-2 rounded-lg bg-[var(--bg-tertiary)]"
          >
            <div className="text-xs font-mono text-[var(--accent-cyan)] font-bold">
              {stat.value}
            </div>
            <div className="text-[8px] text-[var(--text-muted)] uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Scores */}
      <div className="space-y-1.5 mb-3">
        {[
          { label: "Success", value: mission.mission_success },
          { label: "Coverage", value: mission.coverage_score },
        ].map((score) => (
          <div key={score.label} className="flex items-center gap-2">
            <span className="text-[9px] text-[var(--text-muted)] w-14">{score.label}</span>
            <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-green)] transition-all duration-500"
                style={{ width: `${score.value || 0}%` }}
              />
            </div>
            <span className="text-[9px] text-[var(--accent-cyan)] w-8 text-right">
              {Math.round(score.value || 0)}%
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-[var(--text-muted)]">
          {formatTimestamp(mission.started_at || mission.created_at)}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {mission.status === "created" && onStart && (
            <button
              onClick={(e) => { e.stopPropagation(); onStart(mission.id); }}
              className="px-2 py-1 rounded text-[10px] font-mono bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/30 hover:bg-[var(--accent-green)]/20 transition-colors"
            >
              Start
            </button>
          )}
          {mission.status === "active" && onComplete && (
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(mission.id); }}
              className="px-2 py-1 rounded text-[10px] font-mono bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/20 transition-colors"
            >
              End
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(mission.id); }}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
              title="Delete"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Pinned indicator */}
      {mission.is_pinned === 1 && (
        <div className="absolute top-2 right-2">
          <span className="text-[10px]" title="Pinned">📌</span>
        </div>
      )}
    </div>
  );
}
