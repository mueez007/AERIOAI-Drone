"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Mission } from "@/types/api";
import { formatDuration, formatDistance, getStatusBadge } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MissionStatusProps {
  currentMission: Mission | null;
  missions: Mission[];
  onCreateMission: (name: string) => Promise<Mission | null>;
  onStartMission: (id: string) => Promise<Mission | null>;
  onCompleteMission: (id: string) => Promise<Mission | null>;
  loading?: boolean;
  className?: string;
}

export default function MissionStatus({
  currentMission,
  missions,
  onCreateMission,
  onStartMission,
  onCompleteMission,
  loading,
  className,
}: MissionStatusProps) {
  const [showNewMission, setShowNewMission] = useState(false);
  const [missionName, setMissionName] = useState("");
  const [creating, setCreating] = useState(false);

  const activeMission = missions.find((m) => m.status === "active") || currentMission;

  const handleCreate = async () => {
    if (!missionName.trim()) return;
    setCreating(true);
    await onCreateMission(missionName.trim());
    setMissionName("");
    setCreating(false);
    setShowNewMission(false);
  };

  return (
    <>
      <Card className={cn("space-y-4", className)} variant="glass">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs tracking-wider text-[var(--text-primary)] uppercase">
            ◆ Mission Control
          </h3>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowNewMission(true)}
          >
            + New
          </Button>
        </div>

        {/* Active Mission */}
        {activeMission ? (
          <div className="p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--accent-cyan)]/30 glow-cyan space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-mono text-[var(--text-muted)] tracking-wider">
                  ACTIVE MISSION
                </p>
                <p className="text-sm font-mono text-[var(--accent-cyan)] font-bold mt-0.5">
                  {activeMission.name}
                </p>
              </div>
              <Badge {...getStatusBadge(activeMission.status)} />
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "DURATION", value: formatDuration(activeMission.duration_seconds) },
                { label: "OBJECTS", value: activeMission.total_objects_detected },
                { label: "THREATS", value: activeMission.total_threats },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-sm font-mono text-[var(--text-primary)]">{stat.value}</div>
                  <div className="text-[9px] font-mono text-[var(--text-muted)]">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Mission Actions */}
            <div className="flex gap-2">
              {activeMission.status === "created" && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => onStartMission(activeMission.id)}
                  loading={loading}
                  className="flex-1"
                >
                  ▶ Start
                </Button>
              )}
              {activeMission.status === "active" && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => onCompleteMission(activeMission.id)}
                  loading={loading}
                  className="flex-1"
                >
                  ⏹ End Mission
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center border border-dashed border-[var(--border-color)] rounded-lg">
            <p className="text-sm font-mono text-[var(--text-muted)]">No active mission</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Create one to start</p>
          </div>
        )}

        {/* Mission Scores */}
        {activeMission && (
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
              MISSION INTELLIGENCE SCORE
            </p>
            {[
              { label: "Coverage", value: activeMission.coverage_score },
              { label: "Threat Assessment", value: activeMission.threat_score },
              { label: "Detection Accuracy", value: activeMission.mission_success },
            ].map((score) => (
              <div key={score.label} className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-[var(--text-secondary)] w-24">
                  {score.label}
                </span>
                <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${score.value || 0}%`,
                      background: `linear-gradient(90deg, var(--accent-cyan), var(--accent-green))`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[var(--accent-cyan)] w-8 text-right">
                  {Math.round(score.value || 0)}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Missions */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
            RECENT MISSIONS
          </p>
          {missions.slice(0, 3).map((mission) => (
            <div
              key={mission.id}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    mission.status === "active" && "bg-[var(--accent-green)] animate-pulse",
                    mission.status === "completed" && "bg-[var(--accent-cyan)]",
                    mission.status === "created" && "bg-[var(--accent-yellow)]",
                  )}
                />
                <span className="text-xs font-mono text-[var(--text-primary)]">{mission.name}</span>
              </div>
              <Badge {...getStatusBadge(mission.status)} />
            </div>
          ))}
        </div>
      </Card>

      {/* New Mission Modal */}
      <Modal
        isOpen={showNewMission}
        onClose={() => setShowNewMission(false)}
        title="Create New Mission"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider block mb-1.5">
              MISSION NAME
            </label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              placeholder="e.g., Area Surveillance #005"
              className="input-command"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowNewMission(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              loading={creating}
              disabled={!missionName.trim()}
            >
              Create Mission
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
