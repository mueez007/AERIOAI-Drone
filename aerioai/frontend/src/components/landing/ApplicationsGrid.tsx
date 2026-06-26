"use client";

import ScrollReveal from "./ScrollReveal";
import {
  CropIcon, ShieldIcon, TruckIcon,
  FlameIcon, BuildingIcon, MicroscopeIcon,
} from "@/components/ui/Icons";

const applications = [
  {
    icon: <CropIcon size={22} />,
    title: "Agriculture",
    description: "Crop monitoring, livestock tracking, field health assessment with AI-powered analysis.",
    color: "var(--accent-green)",
  },
  {
    icon: <ShieldIcon size={22} />,
    title: "Security",
    description: "Perimeter surveillance, intrusion detection, thermal monitoring for 24/7 protection.",
    color: "var(--accent-cyan)",
  },
  {
    icon: <TruckIcon size={22} />,
    title: "Logistics",
    description: "Last-mile delivery, warehouse monitoring, inventory tracking with precision landing.",
    color: "var(--accent-yellow)",
  },
  {
    icon: <FlameIcon size={22} />,
    title: "Disaster Response",
    description: "Fire detection, flood assessment, search & rescue support with real-time AI alerts.",
    color: "var(--accent-red)",
  },
  {
    icon: <BuildingIcon size={22} />,
    title: "Infrastructure",
    description: "Bridge inspection, power line monitoring, construction progress tracking from the air.",
    color: "var(--accent-purple)",
  },
  {
    icon: <MicroscopeIcon size={22} />,
    title: "Research",
    description: "Environmental monitoring, wildlife tracking, aerial data collection for scientific studies.",
    color: "var(--accent-pink)",
  },
];

export default function ApplicationsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {applications.map((app, i) => (
        <ScrollReveal key={i} delay={i * 80}>
          <div className="glass-card p-6 group h-full">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
              style={{
                background: `color-mix(in srgb, ${app.color} 10%, transparent)`,
                border: `1px solid color-mix(in srgb, ${app.color} 15%, transparent)`,
                color: app.color,
              }}
            >
              {app.icon}
            </div>
            <h3 className="text-lg font-bold font-[family-name:var(--font-heading)] mb-2 text-[var(--text-primary)] tracking-tight">
              {app.title}
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {app.description}
            </p>
            {/* Hover accent */}
            <div
              className="mt-4 h-px rounded-full transition-all duration-500 group-hover:w-full w-0"
              style={{ background: `linear-gradient(90deg, ${app.color}, transparent)` }}
            />
          </div>
        </ScrollReveal>
      ))}
    </div>
  );
}
