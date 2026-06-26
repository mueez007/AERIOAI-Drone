"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeContext } from "./ThemeToggle";
import api from "@/lib/api";

export default function Navbar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { isDark } = useThemeContext();

  const user = { username: "Operator", role: "operator" };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notifyRef.current && !notifyRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    api.setToken(null);
    router.push("/login");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/media?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-[var(--border-color)] bg-white/70 dark:bg-black/50 backdrop-blur-2xl flex items-center justify-between px-4 lg:px-6">
      {/* Left: Search */}
      <div className="flex items-center gap-3">
        {searchOpen ? (
          <form onSubmit={handleSearch} className="flex items-center gap-2 animate-fade-in">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search missions, media..."
              className="input-command w-48 lg:w-64 text-xs"
              autoFocus
              onBlur={() => !searchQuery && setSearchOpen(false)}
              onKeyDown={(e) => e.key === "Escape" && setSearchOpen(false)}
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-sm"
            >
              ✕
            </button>
          </form>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-cyan)] transition-all text-xs font-mono"
          >
            <span>⌘</span>
            <span>Search...</span>
          </button>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative" ref={notifyRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Notifications"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--accent-red)] rounded-full animate-pulse" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
              <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center">
                <span className="font-mono text-xs text-[var(--text-primary)] tracking-wider">NOTIFICATIONS</span>
                <span className="badge badge-cyan">3 NEW</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {[
                  { title: "Mission #004 Completed", time: "2 min ago", type: "mission" },
                  { title: "Low Battery Warning", time: "15 min ago", type: "alert" },
                  { title: "New Media Captured", time: "1 hour ago", type: "media" },
                ].map((notif, i) => (
                  <div
                    key={i}
                    className="p-3 border-b border-[var(--border-color)]/50 hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors"
                  >
                    <p className="text-xs text-[var(--text-primary)]">{notif.title}</p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{notif.time}</p>
                  </div>
                ))}
              </div>
              <div className="p-2 text-center border-t border-[var(--border-color)]">
                <button className="text-[10px] font-mono text-[var(--accent-cyan)] hover:underline tracking-wider">
                  VIEW ALL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Menu (3 dots) */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-green)] flex items-center justify-center text-sm font-bold text-black">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:block text-xs font-mono text-[var(--text-primary)]">
              {user.username}
            </span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 animate-fade-in overflow-hidden">
              {/* User Info */}
              <div className="p-3 border-b border-[var(--border-color)]">
                <p className="text-sm font-mono text-[var(--text-primary)]">{user.username}</p>
                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{user.role}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {[
                  { label: "Profile", icon: "👤", action: () => router.push("/settings") },
                  { label: "System Status", icon: "📊", action: () => router.push("/system") },
                  { label: "Documentation", icon: "📖", action: () => window.open("/docs", "_blank") },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => { item.action(); setUserMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors font-mono"
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Logout */}
              <div className="border-t border-[var(--border-color)] py-1">
                <button
                  onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-xs text-[var(--accent-red)] hover:bg-[var(--bg-tertiary)] transition-colors font-mono"
                >
                  <span>🚪</span>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
