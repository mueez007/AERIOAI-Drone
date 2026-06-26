"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Loader from "@/components/ui/Loader";
import { useMission } from "@/hooks/useMission";
import { Mission } from "@/types/api";
import { formatDuration, formatTimestamp } from "@/lib/utils";

export default function ReportsPage() {
  const { missions, loading, fetchMissions } = useMission();
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMissions("completed");
  }, [fetchMissions]);

  const completedMissions = missions.filter((m) => m.status === "completed");

  const handleGenerateReport = async (mission: Mission) => {
    setGeneratingId(mission.id);
    // Report generation would call the API
    setTimeout(() => setGeneratingId(null), 2000);
  };

  return (
    <>
      {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-xl font-mono font-bold text-[var(--text-primary)]">▣ Reports</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Mission intelligence reports & analytics</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
          {[
            { label: "Completed", value: completedMissions.length, icon: "✓", color: "var(--accent-green)" },
            { label: "Total Objects", value: completedMissions.reduce((s, m) => s + m.total_objects_detected, 0), icon: "🎯", color: "var(--accent-cyan)" },
            { label: "Total Threats", value: completedMissions.reduce((s, m) => s + m.total_threats, 0), icon: "⚠", color: "var(--accent-red)" },
            { label: "Avg Success", value: completedMissions.length > 0 ? `${Math.round(completedMissions.reduce((s, m) => s + m.mission_success, 0) / completedMissions.length)}%` : "0%", icon: "📊", color: "var(--accent-cyan)" },
          ].map((stat) => (
            <Card key={stat.label} padding="sm" className="text-center">
              <span className="text-xl">{stat.icon}</span>
              <div className="text-lg font-mono font-bold mt-1" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-[10px] text-[var(--text-muted)]">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* Reports List */}
        {loading ? (
          <Loader variant="command" text="Loading reports" />
        ) : completedMissions.length === 0 ? (
          <Card className="text-center py-12 animate-fade-in">
            <p className="text-4xl mb-3">📄</p>
            <p className="text-sm font-mono text-[var(--text-muted)]">No completed missions yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Complete a mission to generate a report</p>
          </Card>
        ) : (
          <div className="space-y-3 animate-fade-in">
            {completedMissions.map((mission) => (
              <Card key={mission.id} padding="md" className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center text-lg">
                    📊
                  </div>
                  <div>
                    <p className="text-sm font-mono text-[var(--text-primary)] font-bold">{mission.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[var(--text-muted)]">{formatTimestamp(mission.ended_at)}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{formatDuration(mission.duration_seconds)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden md:flex gap-3 text-center">
                    <div>
                      <div className="text-xs font-mono text-[var(--accent-cyan)]">{mission.total_objects_detected}</div>
                      <div className="text-[8px] text-[var(--text-muted)]">OBJECTS</div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-[var(--accent-red)]">{mission.total_threats}</div>
                      <div className="text-[8px] text-[var(--text-muted)]">THREATS</div>
                    </div>
                    <div>
                      <div className="text-xs font-mono text-[var(--accent-green)]">{Math.round(mission.mission_success)}%</div>
                      <div className="text-[8px] text-[var(--text-muted)]">SUCCESS</div>
                    </div>
                  </div>
                  <Badge variant={mission.threat_score > 50 ? "red" : mission.threat_score > 20 ? "yellow" : "green"} size="sm">
                    {mission.threat_score > 50 ? "HIGH" : mission.threat_score > 20 ? "MED" : "LOW"}
                  </Badge>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleGenerateReport(mission)}
                    loading={generatingId === mission.id}
                  >
                    PDF
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
    </>
  );
}
