"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { SystemHealth } from "@/types/api";
import { cn } from "@/lib/utils";

interface AIStatusCardProps {
  health: SystemHealth | null;
  className?: string;
}

export default function AIStatusCard({ health, className }: AIStatusCardProps) {
  const services = [
    {
      name: "YOLOv8",
      status: health?.services?.camera?.status === "online" ? "online" : "offline",
      type: "local",
      description: "Object Detection",
    },
    {
      name: "Gemini",
      status: health?.services?.gemini_api?.status === "configured" ? "online" : "offline",
      type: "cloud",
      description: "Scene Analysis",
    },
    {
      name: "Groq",
      status: health?.services?.groq_api?.status === "configured" ? "online" : "offline",
      type: "cloud",
      description: "Voice & Chat",
    },
    {
      name: "Database",
      status: health?.services?.database?.status === "online" ? "online" : "offline",
      type: "local",
      description: "Mission Storage",
    },
  ];

  return (
    <Card className={cn("space-y-4", className)} variant="glass">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-xs tracking-wider text-[var(--text-primary)] uppercase">
          🧠 AI Services
        </h3>
        <Badge
          variant={health?.status === "operational" ? "green" : "red"}
          size="sm"
          pulse={health?.status === "operational"}
        >
          {health?.status === "operational" ? "ONLINE" : "DEGRADED"}
        </Badge>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-2 gap-2">
        {services.map((service) => (
          <div
            key={service.name}
            className={cn(
              "p-3 rounded-lg border transition-all duration-300",
              service.status === "online"
                ? "bg-[var(--bg-tertiary)] border-[var(--accent-green)]/30"
                : "bg-[var(--bg-tertiary)]/50 border-[var(--border-color)] opacity-60"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-[var(--text-primary)] font-bold">
                {service.name}
              </span>
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  service.status === "online"
                    ? "bg-[var(--accent-green)] animate-pulse"
                    : "bg-[var(--accent-red)]"
                )}
              />
            </div>
            <p className="text-[9px] text-[var(--text-muted)]">{service.description}</p>
            <Badge
              variant="neutral"
              size="sm"
              className="mt-1.5 text-[8px]"
            >
              {service.type}
            </Badge>
          </div>
        ))}
      </div>

      {/* System Resources */}
      {health && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-[var(--text-muted)] tracking-wider">
            SYSTEM RESOURCES
          </p>
          {[
            { label: "CPU", value: health.cpu.percent, color: "var(--accent-cyan)" },
            { label: "RAM", value: health.ram.percent, color: "var(--accent-green)" },
            { label: "DISK", value: health.disk.percent, color: health.disk.warning ? "var(--accent-yellow)" : "var(--accent-cyan)" },
          ].map((resource) => (
            <div key={resource.label} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[var(--text-secondary)] w-10">
                {resource.label}
              </span>
              <div className="flex-1 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${resource.value}%`,
                    background: `linear-gradient(90deg, ${resource.color}, ${resource.color}88)`,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono w-10 text-right"
                style={{ color: resource.color }}
              >
                {Math.round(resource.value)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
          <div className="text-xs font-mono text-[var(--accent-cyan)]">
            {health?.ram?.available_gb?.toFixed(1) ?? "--"} GB
          </div>
          <div className="text-[9px] text-[var(--text-muted)]">RAM FREE</div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg-tertiary)]">
          <div className="text-xs font-mono text-[var(--accent-green)]">
            {health?.disk?.free_gb?.toFixed(1) ?? "--"} GB
          </div>
          <div className="text-[9px] text-[var(--text-muted)]">DISK FREE</div>
        </div>
      </div>
    </Card>
  );
}
