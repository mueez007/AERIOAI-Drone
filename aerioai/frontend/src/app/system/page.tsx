"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import api from "@/lib/api";
import { SystemHealth, SystemStats } from "@/types/api";
import { INTERVALS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function SystemPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, INTERVALS.HEALTH);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [h, s] = await Promise.all([api.getSystemHealth(), api.getSystemStats()]);
      setHealth(h);
      setStats(s);
    } catch {
      // Offline
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center mt-16">
        <Loader variant="command" text="Loading system data" size="lg" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
        <div className="animate-fade-in">
          <h1 className="text-xl font-mono font-bold text-[var(--text-primary)]">⊿ System Health</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Real-time monitoring & diagnostics</p>
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
          {[
            { label: "System", value: health?.status === "operational" ? "ONLINE" : "DEGRADED", color: health?.status === "operational" ? "var(--accent-green)" : "var(--accent-red)" },
            { label: "CPU", value: `${health?.cpu.percent.toFixed(1) ?? "--"}%`, color: "var(--accent-cyan)" },
            { label: "RAM", value: `${health?.ram.percent.toFixed(1) ?? "--"}%`, color: "var(--accent-cyan)" },
            { label: "Disk", value: `${health?.disk.percent.toFixed(1) ?? "--"}%`, color: (health?.disk.warning ?? false) ? "var(--accent-yellow)" : "var(--accent-cyan)" },
          ].map((item) => (
            <Card key={item.label} padding="sm" className="text-center">
              <div className="text-lg font-mono font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">{item.label}</div>
            </Card>
          ))}
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* CPU & RAM */}
          <Card className="space-y-4 animate-slide-left">
            <h3 className="font-mono text-xs tracking-wider text-[var(--text-primary)]">PROCESSOR & MEMORY</h3>
            {health && (
              <>
                <div className="space-y-3">
                  {[
                    { label: "CPU Usage", value: health.cpu.percent, color: "var(--accent-cyan)" },
                    { label: "RAM Usage", value: health.ram.percent, color: "var(--accent-green)" },
                    { label: "Disk Usage", value: health.disk.percent, color: health.disk.warning ? "var(--accent-yellow)" : "var(--accent-cyan)" },
                  ].map((res) => (
                    <div key={res.label}>
                      <div className="flex justify-between text-[10px] font-mono mb-1">
                        <span className="text-[var(--text-secondary)]">{res.label}</span>
                        <span style={{ color: res.color }}>{res.value.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${res.value}%`,
                            background: `linear-gradient(90deg, ${res.color}, ${res.color}88)`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="text-xs font-mono text-[var(--accent-cyan)]">{health.cpu.cores}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">CORES</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="text-xs font-mono text-[var(--accent-green)]">{health.ram.total_gb} GB</div>
                    <div className="text-[9px] text-[var(--text-muted)]">TOTAL RAM</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
                    <div className="text-xs font-mono text-[var(--accent-cyan)]">{health.ram.available_gb} GB</div>
                    <div className="text-[9px] text-[var(--text-muted)]">AVAILABLE</div>
                  </div>
                </div>
              </>
            )}
          </Card>

          {/* Services */}
          <Card className="space-y-4 animate-slide-right">
            <h3 className="font-mono text-xs tracking-wider text-[var(--text-primary)]">SERVICES STATUS</h3>
            {health && (
              <div className="space-y-2">
                {Object.entries(health.services).map(([name, service]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full",
                          service.status === "online" || service.status === "configured"
                            ? "bg-[var(--accent-green)] animate-pulse"
                            : "bg-[var(--accent-red)]"
                        )}
                      />
                      <div>
                        <p className="text-xs font-mono text-[var(--text-primary)] capitalize">{name.replace("_", " ")}</p>
                        <p className="text-[9px] text-[var(--text-muted)]">{service.message}</p>
                      </div>
                    </div>
                    <Badge
                      variant={service.status === "online" || service.status === "configured" ? "green" : "red"}
                      size="sm"
                    >
                      {service.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
            {[
              { label: "Total Missions", value: stats.missions.total, icon: "◆" },
              { label: "Active Missions", value: stats.missions.active, icon: "▶" },
              { label: "Photos", value: stats.media.photos, icon: "📸" },
              { label: "Videos", value: stats.media.videos, icon: "🎥" },
            ].map((item) => (
              <Card key={item.label} padding="sm" className="text-center">
                <span className="text-lg">{item.icon}</span>
                <div className="text-lg font-mono font-bold text-[var(--accent-cyan)]">{item.value}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{item.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* System Info */}
        {health && (
          <Card className="animate-fade-in" padding="sm">
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <span className="text-[var(--text-muted)]">OS: <span className="text-[var(--text-primary)]">{health.system.os}</span></span>
              <span className="text-[var(--text-muted)]">Host: <span className="text-[var(--text-primary)]">{health.system.hostname}</span></span>
              <span className="text-[var(--text-muted)]">Python: <span className="text-[var(--text-primary)]">{health.system.python_version}</span></span>
              <span className="text-[var(--text-muted)]">Time: <span className="text-[var(--text-primary)]">{new Date(health.timestamp).toLocaleString()}</span></span>
            </div>
          </Card>
        )}
    </>
  );
}
