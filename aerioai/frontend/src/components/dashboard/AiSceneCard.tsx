"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

interface Detection {
  label: string;
  count: number;
}

interface Props {
  detections?: Detection[];
}

export default function AiSceneCard({ detections = [] }: Props) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.sendChatMessage(
        "Briefly describe what the drone camera sees right now in 2-3 sentences. Be concise and factual."
      ) as { response?: string; message?: string };
      setSummary(res?.response || res?.message || "Scene analysis unavailable.");
      setLastUpdated(new Date());
    } catch {
      setSummary("Could not fetch scene analysis. Drone may be offline.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 15000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  const glassStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.7)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.5)",
  };

  const glassStyleDark: React.CSSProperties = {
    background: "rgba(30,30,30,0.7)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  return (
    <div
      className="rounded-2xl p-4 dark:[background:rgba(30,30,30,0.7)] dark:[border:1px_solid_rgba(255,255,255,0.08)]"
      style={glassStyle}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#0071E3]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
          </svg>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">AI Scene Summary</span>
          {loading && (
            <span className="w-3 h-3 rounded-full border-2 border-[#0071E3] border-t-transparent animate-spin" />
          )}
        </div>
        <button
          onClick={fetchSummary}
          disabled={loading}
          className="text-xs text-[#0071E3] font-medium hover:opacity-70 transition-opacity disabled:opacity-40"
        >
          Refresh
        </button>
      </div>

      {/* Summary text */}
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
        {summary || "Analyzing scene…"}
      </p>

      {/* Object count chips */}
      {detections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detections.filter(d => d.count > 0).map((d) => (
            <span
              key={d.label}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
            >
              {d.label}: {d.count}
            </span>
          ))}
        </div>
      )}

      {/* Last updated */}
      {lastUpdated && (
        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2">
          Updated {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
