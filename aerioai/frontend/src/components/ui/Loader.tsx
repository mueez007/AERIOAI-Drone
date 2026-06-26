import { cn } from "@/lib/utils";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  variant?: "spinner" | "pulse" | "dots" | "command";
  text?: string;
  className?: string;
}

export default function Loader({
  size = "md",
  variant = "spinner",
  text,
  className,
}: LoaderProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      {variant === "spinner" && (
        <div
          className={cn(
            "border-2 border-[var(--border-color)] border-t-[var(--accent-cyan)] rounded-full animate-spin-slow",
            sizes[size]
          )}
        />
      )}

      {variant === "pulse" && (
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-full bg-[var(--accent-cyan)]",
                size === "sm" ? "w-1.5 h-1.5" : size === "lg" ? "w-3 h-3" : "w-2 h-2"
              )}
              style={{
                animation: `pulse-glow 1.5s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      )}

      {variant === "dots" && (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-full bg-[var(--accent-cyan)]",
                sizes[size]
              )}
              style={{
                animation: `fadeIn 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
              }}
            />
          ))}
        </div>
      )}

      {variant === "command" && (
        <div className="flex flex-col items-center gap-2">
          <div className={cn("loader", sizes[size])} />
          <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-widest uppercase animate-pulse">
            EXECUTING
          </span>
        </div>
      )}

      {text && (
        <p className="font-mono text-xs text-[var(--text-secondary)] tracking-wider uppercase">
          {text}
        </p>
      )}
    </div>
  );
}
