"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import Link from "next/link";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { DroneIcon, ArrowLeftIcon } from "@/components/ui/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Auto-login bypass for mock mode
  useEffect(() => {
    if (searchParams.get("mock") === "true") {
      api.setToken("mock-token-123");
      router.push("/dashboard");
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await api.login(username, password);
      api.setToken(data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials or system offline.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center font-sans relative overflow-hidden">
      
      {/* Top Navigation */}
      <div className="absolute top-6 left-6 z-50">
        <Link href="/" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full glass-button text-[var(--text-primary)]">
          <ArrowLeftIcon size={16} />
          Back to Platform
        </Link>
      </div>

      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md px-6 relative z-10 animate-slide-up">
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center text-white filter drop-shadow-xl mb-6">
            <DroneIcon size={48} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] mt-6 mb-2">Command Center</h1>
          <p className="text-[var(--text-secondary)] font-medium">Enter your credentials to access the fleet.</p>
        </div>

        <div className="glass-card p-8 sm:p-10 w-full shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-glass"
                placeholder="Operator ID"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold tracking-widest text-[var(--text-muted)] uppercase">Password</label>
                <Link href="#" className="text-xs font-bold text-[var(--accent-cyan)] hover:underline">Forgot?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-glass"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 text-[var(--accent-red)] text-sm font-medium text-center animate-fade-in">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glass-button w-full py-4 mt-4 font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] border-[var(--border-color)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Authenticate & Enter Ground Station"
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Autofill */}
          <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--text-muted)]">Default: <b>admin</b> / <b>admin123</b></span>
            <button
              type="button"
              onClick={() => {
                setUsername("admin");
                setPassword("admin123");
              }}
              className="text-[var(--accent-cyan)] font-bold hover:underline"
            >
              Auto-fill
            </button>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-xs font-mono text-[var(--text-muted)]">
            AERIOAI Multi-Mission Ground Control Station • v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
