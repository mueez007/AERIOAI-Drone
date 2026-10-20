"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

function AppLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  // Public routes — no shell
  if (pathname === "/" || pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-transparent font-sans relative text-[var(--text-primary)]">
      
      {/* Top Navbar */}
      <header className="absolute top-0 left-0 right-0 z-[100] h-16 bg-[var(--bg-primary)]/40 backdrop-blur-3xl saturate-200 border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex items-center justify-between px-6 transition-colors duration-500">
        
        {/* Left: Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="font-bold tracking-tight text-[var(--text-primary)] hidden sm:block">AERIOAI <span className="text-[var(--text-muted)] font-normal ml-1">Command Center</span></span>
        </div>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2 absolute left-1/2 -translate-x-1/2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || ((item.path as string) !== "/" && pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Theme & User */}
        <div className="flex items-center gap-4 relative">
          <ThemeToggle />
          
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-white text-xs font-bold ring-2 ring-[var(--bg-primary)] hover:scale-105 transition-transform"
          >
            A
          </button>

          {showProfileMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
              <div className="absolute top-12 right-0 mt-2 w-48 bg-[var(--bg-secondary)] backdrop-blur-xl border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden py-1 z-50 animate-fade-in text-sm font-medium">
                <div className="px-4 py-3 border-b border-[var(--border-color)]">
                  <p className="text-[var(--text-primary)] font-bold">Admin Operator</p>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">Command Level 1</p>
                </div>
                <button
                  onClick={() => {
                    api.logout();
                    router.push("/login");
                  }}
                  className="w-full text-left px-4 py-2.5 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors flex items-center gap-2 mt-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 h-screen w-full relative">
        {children}
      </main>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppLayoutInner>{children}</AppLayoutInner>;
}
