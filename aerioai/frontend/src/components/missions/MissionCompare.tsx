"use client";

import { useState } from "react";
import { Mission, MissionCompareResponse } from "@/types/api";
import { formatDuration, formatTimestamp, getStatusBadge, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import api from "@/lib/api";

interface MissionCompareProps {
  missions: Mission[];
  onClose: () => void;
}

export default function MissionCompare({ missions, onClose }: MissionCompareProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [result, setResult] = useState<MissionCompareResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMission = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id].slice(0, 4)
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    try {
      const data = await api.compareMissions(selectedIds);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const selectedMissions = missions.filter((m) => selectedIds.includes(m.id));

  return (
    <div className="space-y-6">
      {/* Mission Selection */}
      <div>
        <p className="text-xs font-mono text-[var(--text-muted)] mb-3 tracking-wider">
          SELECT MISSIONS TO COMPARE ({selectedIds.length}/4)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {missions.map((mission) => (
            <button
              key={mission.id}
              onClick={() => toggleMission(mission.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                selectedIds.includes(mission.id)
                  ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/5"
                  : "border-[var(--border-color)] hover:border-[var(--accent-cyan)]/50 bg-[var(--bg-secondary)]"
              )}
            >
              <div
                className={cn(
                  "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all",
                  selectedIds.includes(mission.id)
                    ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/20"
                    : "border-[var(--border-color)]"
                )}
              >
                {selectedIds.includes(mission.id) && (
                  <span className="text-[10px] text-[var(--accent-cyan)]">✓</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono text-[var(--text-primary)] truncate">{mission.name}</p>
                <p className="text-[10px] text-[var(--text-muted)]">
                  {formatDuration(mission.duration_seconds)} · {mission.total_objects_detected} objects
                </p>
              </div>
              <Badge {...getStatusBadge(mission.status)} />
            </button>
          ))}
        </div>
      </div>

      {/* Compare Button */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="md"
          onClick={handleCompare}
          disabled={selectedIds.length < 2}
          loading={loading}
        >
          Compare {selectedIds.length} Missions
        </Button>
        <Button variant="ghost" size="md" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-6 text-center">
          <Loader variant="command" text="Analyzing missions" />
        </div>
      )}

      {/* Results */}
      {result && !loading && (
        <div className="space-y-4 animate-fade-in">
          {/* Side-by-side comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedMissions.map((mission) => (
              <div
                key={mission.id}
                className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-mono text-[var(--text-primary)] font-bold">{mission.name}</h4>
                  <Badge {...getStatusBadge(mission.status)} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Duration", value: formatDuration(mission.duration_seconds) },
                    { label: "Objects", value: mission.total_objects_detected },
                    { label: "Threats", value: mission.total_threats },
                    { label: "Threat Score", value: `${Math.round(mission.threat_score)}%` },
                    { label: "Coverage", value: `${Math.round(mission.coverage_score)}%` },
                    { label: "Success", value: `${Math.round(mission.mission_success)}%` },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center p-2 rounded bg-[var(--bg-secondary)]">
                      <div className="text-xs font-mono text-[var(--accent-cyan)]">{stat.value}</div>
                      <div className="text-[8px] text-[var(--text-muted)]">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <p className="text-[10px] text-[var(--text-muted)]">
                  {formatTimestamp(mission.started_at)}
                </p>
              </div>
            ))}
          </div>

          {/* AI Comparison Text */}
          {result.comparison_text && (
            <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)]/20">
              <p className="text-[10px] font-mono text-[var(--accent-cyan)] mb-2 tracking-wider">
                AI COMPARISON
              </p>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                {result.comparison_text}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
