"use client";

import { useRef, useState } from "react";

interface GlassFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  accentColor?: string;
}

export default function GlassFeatureCard({
  icon,
  title,
  description,
  accentColor = "var(--accent-cyan)",
}: GlassFeatureCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -6, y: x * 6 });
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }

  return (
    <div
      ref={cardRef}
      className="glass-card p-7 cursor-default"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${isHovered ? "translateY(-4px)" : "translateY(0)"}`,
        transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
      }}
    >
      {/* Icon container */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${accentColor} 12%, transparent), color-mix(in srgb, ${accentColor} 6%, transparent))`,
          border: `1px solid color-mix(in srgb, ${accentColor} 15%, transparent)`,
          color: accentColor,
          transform: isHovered ? "scale(1.08)" : "scale(1)",
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold font-[family-name:var(--font-heading)] mb-2.5 text-[var(--text-primary)] tracking-tight">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[var(--text-secondary)] leading-relaxed text-[15px]">
        {description}
      </p>

      {/* Hover accent line at bottom */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-px transition-opacity duration-500"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }}
      />
    </div>
  );
}
