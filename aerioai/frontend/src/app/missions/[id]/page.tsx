"use client";

import { useEffect, useState, use } from "react";
import Loader from "@/components/ui/Loader";
import api from "@/lib/api";
import { Mission } from "@/types/api";
import { formatTimestamp, formatDuration, formatDistance } from "@/lib/utils";

export default function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMission = async () => {
      try {
        const data = await api.getMission(id);
        setMission(data as Mission);
      } catch {
        // Mission fetch failed
      } finally {
        setLoading(false);
      }
    };
    fetchMission();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader variant="command" text="LOADING MISSION DATA" size="lg" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="glass rounded-xl p-8 text-center mt-8">
        <h2 className="text-xl font-mono text-[var(--text-primary)]">
          Mission Not Found
        </h2>
        <p className="text-[var(--text-muted)] mt-2">
          The requested mission could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <>
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-xl lg:text-2xl font-mono font-bold text-[var(--text-primary)] tracking-wider">
              ◆ {mission.name}
            </h1>
            <p className="text-xs font-mono text-[var(--text-muted)] mt-1">
              Mission ID: {mission.id} | Status: {mission.status.toUpperCase()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in">
          {[
            { label: "STATUS", value: mission.status.toUpperCase(), color: mission.status === "active" ? "var(--accent-green)" : "var(--accent-cyan)" },
            { label: "DURATION", value: formatDuration(mission.duration_seconds), color: "var(--accent-cyan)" },
            { label: "DISTANCE", value: formatDistance(mission.distance_meters), color: "var(--accent-cyan)" },
            { label: "OBJECTS", value: String(mission.total_objects_detected), color: "var(--accent-yellow)" },
          ].map((stat) => (
            <div key={stat.label} className="stat-card">
              <div className="stat-value text-base" style={{ color: stat.color }}>
                {stat.value}
              </div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-xl p-6 animate-fade-in">
          <h3 className="text-sm font-mono text-[var(--accent-cyan)] tracking-wider mb-4">
            MISSION DETAILS
          </h3>
          <div className="space-y-3 text-sm font-mono text-[var(--text-secondary)]">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="text-[var(--text-primary)]">{formatTimestamp(mission.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Started</span>
              <span className="text-[var(--text-primary)]">{formatTimestamp(mission.started_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Ended</span>
              <span className="text-[var(--text-primary)]">{formatTimestamp(mission.ended_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Threats</span>
              <span className="text-[var(--accent-red)]">{mission.total_threats}</span>
            </div>
            <div className="flex justify-between">
              <span>Threat Score</span>
              <span className="text-[var(--text-primary)]">{mission.threat_score}%</span>
            </div>
            <div className="flex justify-between">
              <span>Success Rate</span>
              <span className="text-[var(--accent-green)]">{mission.mission_success}%</span>
            </div>
            {mission.summary && (
              <div className="pt-3 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-muted)]">Summary:</span>
                <p className="text-[var(--text-primary)] mt-1">{mission.summary}</p>
              </div>
            )}
          </div>
        </div>
    </>
  );
}
