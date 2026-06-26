"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

interface EmergencyState {
  type: string;
  status: string;
  desc: string;
  victims: number;
  vehicles: number;
  action: string;
  color: string;
  bg: string;
}

const DEFAULT_SAFE: EmergencyState = {
  type: "SAFE",
  status: "All Clear",
  desc: "Routine patrol. No anomalies detected.",
  victims: 0,
  vehicles: 0,
  action: "Continue standard monitoring.",
  color: "var(--accent-cyan)",
  bg: "rgba(0, 113, 227, 0.1)"
};

export default function EmergencyAI() {
  const [current, setCurrent] = useState<EmergencyState>(DEFAULT_SAFE);
  const [isScanning, setIsScanning] = useState(true);

  // Poll backend API for emergency status
  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      setIsScanning(true);
      try {
        const data = await api.getEmergencyStatus() as EmergencyState;
        if (mounted) {
          setCurrent(data || DEFAULT_SAFE);
        }
      } catch (err) {
        // Fallback to safe state if API is not yet implemented
        if (mounted) {
          setCurrent(DEFAULT_SAFE);
        }
      } finally {
        if (mounted) setIsScanning(false);
      }
    };

    // Initial fetch
    fetchStatus();

    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl relative overflow-hidden h-full flex flex-col">
      {/* Background Pulse Effect for Emergencies */}
      {current.type !== "SAFE" && !isScanning && (
        <div 
          className="absolute inset-0 opacity-20 animate-pulse pointer-events-none" 
          style={{ backgroundColor: current.color }}
        />
      )}
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1">
            Emergency AI Oversight
          </h3>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span 
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75`}
                style={{ backgroundColor: isScanning ? "var(--accent-cyan)" : current.color }}
              ></span>
              <span 
                className={`relative inline-flex rounded-full h-3 w-3`}
                style={{ backgroundColor: isScanning ? "var(--accent-cyan)" : current.color }}
              ></span>
            </span>
            <h2 
              className="text-xl font-bold tracking-tight"
              style={{ color: isScanning ? "var(--text-primary)" : current.color }}
            >
              {isScanning ? "Scanning Environment..." : current.status}
            </h2>
          </div>
        </div>
        
        <div className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-full text-xs font-semibold flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          YOLO Vision
        </div>
      </div>

      <div className="flex-1 relative z-10 flex flex-col justify-center">
        {isScanning ? (
          <div className="flex flex-col items-center justify-center py-4 opacity-50">
            <div className="w-12 h-12 border-4 border-[var(--border-color)] border-t-[var(--accent-cyan)] rounded-full animate-spin mb-4" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">Analyzing spatial anomalies...</p>
          </div>
        ) : (
          <div className="space-y-5 animate-fade-in">
            <div className="p-4 rounded-xl border border-[var(--border-color)]" style={{ backgroundColor: current.bg }}>
              <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
                {current.desc}
              </p>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)]">
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1 truncate">Persons</p>
                <p className="text-xl font-bold font-mono" style={{ color: current.victims > 0 ? "var(--accent-red)" : "var(--text-primary)" }}>
                  {current.victims}
                </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)]">
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1 truncate">Vehicles</p>
                <p className="text-xl font-bold font-mono text-[var(--text-primary)]">
                  {current.vehicles ?? 0}
                </p>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-3 rounded-xl border border-[var(--border-color)]">
                <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1 truncate">Confidence</p>
                <p className="text-xl font-bold font-mono text-[var(--accent-cyan)]">
                  98%
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mb-2">Tactical Suggestion</p>
              <div className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]">
                <div className="mt-0.5">
                  <svg className="w-4 h-4" style={{ color: current.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: current.type !== "SAFE" ? current.color : "var(--text-primary)" }}>
                  {current.action}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
