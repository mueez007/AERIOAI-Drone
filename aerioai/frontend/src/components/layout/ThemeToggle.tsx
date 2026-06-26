"use client";

import React, { createContext, useContext } from "react";
import { useTheme } from "@/hooks/useTheme";
import { SunIcon, MoonIcon } from "@/components/ui/Icons";

interface ThemeContextType {
  theme: "dark" | "light";
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  isDark: true,
});

export const useThemeContext = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme, isDark, mounted } = useTheme();

  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useThemeContext();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-[52px] h-7 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/30 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]"
      style={{
        background: isDark
          ? "rgba(255, 255, 255, 0.08)"
          : "rgba(0, 0, 0, 0.06)",
        border: isDark
          ? "1px solid rgba(255, 255, 255, 0.1)"
          : "1px solid rgba(0, 0, 0, 0.08)",
      }}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {/* Toggle knob */}
      <span
        className="absolute top-[2px] left-[2px] w-[22px] h-[22px] rounded-full transition-all duration-500 flex items-center justify-center"
        style={{
          transform: isDark ? "translateX(0)" : "translateX(24px)",
          background: isDark
            ? "rgba(255, 255, 255, 0.9)"
            : "rgba(0, 0, 0, 0.8)",
          boxShadow: isDark
            ? "0 1px 4px rgba(0, 0, 0, 0.3)"
            : "0 1px 4px rgba(0, 0, 0, 0.15)",
        }}
      >
        {isDark ? (
          <MoonIcon size={12} className="text-[#1d1d1f]" strokeWidth={2} />
        ) : (
          <SunIcon size={12} className="text-white" strokeWidth={2} />
        )}
      </span>
    </button>
  );
}
