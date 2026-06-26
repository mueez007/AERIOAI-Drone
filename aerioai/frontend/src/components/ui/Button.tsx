"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, children, className, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-mono text-xs tracking-wider uppercase rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)] disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/30 hover:bg-[var(--accent-cyan)]/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] active:scale-[0.98]",
      secondary:
        "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] active:scale-[0.98]",
      danger:
        "bg-[var(--accent-red)]/10 text-[var(--accent-red)] border border-[var(--accent-red)]/30 hover:bg-[var(--accent-red)]/20 hover:shadow-[0_0_15px_rgba(255,68,68,0.2)] active:scale-[0.98]",
      ghost:
        "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]",
      success:
        "bg-[var(--accent-green)]/10 text-[var(--accent-green)] border border-[var(--accent-green)]/30 hover:bg-[var(--accent-green)]/20 hover:shadow-[0_0_15px_rgba(0,255,136,0.2)] active:scale-[0.98]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-[10px]",
      md: "px-4 py-2 text-xs",
      lg: "px-6 py-3 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <span className="loader w-3 h-3 border-[1.5px]" />
        )}
        {!loading && icon && <span>{icon}</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
