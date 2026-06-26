"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass" | "glow" | "bordered";
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({
  children,
  className,
  variant = "default",
  padding = "md",
  onClick,
  hover = false,
}: CardProps) {
  const baseStyles = "rounded-xl transition-all duration-300";

  const variants = {
    default: "bg-[var(--bg-secondary)] border border-[var(--border-color)]",
    glass: "glass rounded-xl",
    glow: "bg-[var(--bg-secondary)] border border-[var(--border-color)] glow-cyan",
    bordered: "bg-[var(--bg-secondary)] border-2 border-[var(--border-color)]",
  };

  const paddings = {
    none: "",
    sm: "p-3",
    md: "p-4 lg:p-5",
    lg: "p-6 lg:p-8",
  };

  const hoverStyles = hover
    ? "hover:border-[var(--accent-cyan)] hover:shadow-[0_0_20px_rgba(0,255,255,0.08)] hover:-translate-y-0.5 cursor-pointer"
    : "";

  return (
    <div
      className={cn(baseStyles, variants[variant], paddings[padding], hoverStyles, className)}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
