import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "cyan" | "green" | "red" | "yellow" | "neutral";
  size?: "sm" | "md";
  pulse?: boolean;
  className?: string;
}

export default function Badge({
  children,
  variant = "cyan",
  size = "sm",
  pulse = false,
  className,
}: BadgeProps) {
  const baseStyles = "inline-flex items-center gap-1.5 font-mono tracking-wider uppercase rounded";

  const variants = {
    cyan: "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30",
    green: "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/30",
    red: "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30",
    yellow: "bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30",
    neutral: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[10px]",
    md: "px-3 py-1 text-xs",
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)}>
      {pulse && (
        <span className={cn(
          "w-1.5 h-1.5 rounded-full",
          variant === "green" ? "bg-[var(--accent-green)]" :
          variant === "red" ? "bg-[var(--accent-red)]" :
          variant === "yellow" ? "bg-[var(--accent-yellow)]" :
          "bg-[var(--accent-cyan)]",
          "animate-pulse"
        )} />
      )}
      {children}
    </span>
  );
}
