"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import ThemeToggle from "./ThemeToggle";
import { useSidebar } from "./SidebarContext";
import { useState } from "react";

/* ─────────────── SVG Icon Map ─────────────── */
function NavIcon({ icon, size = 20 }: { icon: string; size?: number }) {
  const s = size;
  switch (icon) {
    case "camera":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
          <circle cx="12" cy="13" r="4"/>
        </svg>
      );
    case "image":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      );
    case "video":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
        </svg>
      );
    case "sparkle":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
        </svg>
      );
    case "gear":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      );
    default:
      return <span className="text-base">●</span>;
  }
}

/* ─────────────── Sidebar Component ─────────────── */
export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const [hovered, setHovered] = useState<string | null>(null);

  const COLLAPSED_W = 56;
  const EXPANDED_W = 240;

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className={cn(
          "lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-all duration-300",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? COLLAPSED_W : EXPANDED_W,
          transition: "width 400ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={cn(
          "fixed top-0 left-0 z-50 h-screen flex flex-col overflow-hidden",
          // Dark space aesthetic glass surface
          "bg-[#0a0a0a]/70 backdrop-blur-[40px]",
          "border-r border-white/10",
          "shadow-[1px_0_20px_rgba(0,0,0,0.5)]",
          // Mobile
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "transition-transform duration-300 lg:transition-none"
        )}
      >
        {/* ── Top: 3-dot trigger + logo ── */}
        <div className="flex items-center h-14 px-3 border-b border-white/20 dark:border-white/10 shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden md:flex items-center justify-center w-8 h-8 rounded-lg",
              "text-gray-400 hover:text-white hover:bg-white/10",
              "transition-all duration-200 shrink-0"
            )}
            aria-label="Toggle sidebar"
          >
            {/* 3-dot icon */}
            <span className="flex flex-col gap-[4px]">
              <span
                className="block w-1 h-1 rounded-full bg-current animate-pulse"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="block w-1 h-1 rounded-full bg-current animate-pulse"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="block w-1 h-1 rounded-full bg-current animate-pulse"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </button>

          {/* Logo — fades in when expanded */}
          <div
            className="overflow-hidden shrink-0"
            style={{
              width: collapsed ? 0 : EXPANDED_W - 56,
              opacity: collapsed ? 0 : 1,
              transition: "width 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
            }}
          >
            <Link
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 pl-3 whitespace-nowrap"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0071E3] to-[#5E5CE6] flex items-center justify-center shadow-sm shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">
                AERIOAI
              </span>
            </Link>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item, index) => {
            const isActive =
              pathname === item.path ||
              (item.path !== "/" && pathname.startsWith(item.path));

            return (
              <div key={item.path} className="relative">
                <Link
                  href={item.path}
                  onClick={() => setMobileOpen(false)}
                  onMouseEnter={() => setHovered(item.path)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "flex items-center h-10 rounded-xl transition-all duration-200 overflow-hidden",
                    "group relative",
                    collapsed ? "w-10 mx-auto justify-center" : "px-3 gap-3",
                    isActive
                      ? [
                          "bg-[#0071E3] dark:bg-[#0A84FF] text-white",
                          "shadow-[0_4px_12px_rgba(0,113,227,0.35)]",
                        ]
                      : [
                          "text-gray-400",
                          "hover:bg-white/10 hover:text-white",
                        ]
                  )}
                >
                  {/* Icon */}
                  <span
                    className={cn(
                      "shrink-0 transition-transform duration-200",
                      isActive ? "scale-110" : "group-hover:scale-105"
                    )}
                  >
                    <NavIcon icon={item.icon} size={18} />
                  </span>

                  {/* Label — staggered fade in */}
                  <span
                    className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    style={{
                      maxWidth: collapsed ? 0 : 160,
                      opacity: collapsed ? 0 : 1,
                      transition: `max-width 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${120 + index * 40}ms ease ${index * 40}ms`,
                    }}
                  >
                    {item.label}
                  </span>
                </Link>

                {/* Collapsed tooltip */}
                {collapsed && hovered === item.path && (
                  <div
                    className={cn(
                      "absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50",
                      "px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap",
                      "bg-white text-gray-900 shadow-lg pointer-events-none animate-fade-in"
                    )}
                  >
                    {item.label}
                    {/* Arrow */}
                    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-white" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Bottom: Theme + user ── */}
        <div
          className={cn(
            "shrink-0 px-2 py-3 border-t border-white/20 dark:border-white/10",
            "flex flex-col gap-2"
          )}
        >
          {/* Theme toggle */}
          <div className={cn("flex items-center", collapsed ? "justify-center" : "px-1")}>
            <ThemeToggle />
            {!collapsed && (
              <span
                className="text-xs text-gray-400 ml-auto"
                style={{
                  opacity: collapsed ? 0 : 1,
                  transition: "opacity 200ms ease",
                }}
              >
                v2.0
              </span>
            )}
          </div>

          {/* User avatar */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-1 py-1.5 rounded-xl",
              "hover:bg-white/10 transition-colors cursor-pointer"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0071E3] to-[#5E5CE6] flex items-center justify-center text-white text-xs font-bold shrink-0">
              A
            </div>
            <div
              className="overflow-hidden"
              style={{
                maxWidth: collapsed ? 0 : 160,
                opacity: collapsed ? 0 : 1,
                transition: "max-width 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
              }}
            >
              <p className="text-xs font-semibold text-white whitespace-nowrap">
                Pilot
              </p>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-[10px] text-gray-400 whitespace-nowrap">Online</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
