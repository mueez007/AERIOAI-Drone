"use client";

import DetectionSummary from "@/components/dashboard/DetectionSummary";

export interface AnalysisRecord {
  id: string;
  timestamp: string;
  threat_level: string;
  objects: string[];
  summary: string;
  tactical_recommendation: string;
  is_chat?: boolean;
  role?: "user" | "ai";
}

interface SurveillanceViewProps {
  isAnalyzing: boolean;
  onAnalyze: () => Promise<void>;
  analysisInterval: number | null;
  onSetInterval: (sec: number | null) => void;
  history: AnalysisRecord[];
  onClearHistory: () => Promise<void>;
  onAskAI?: (record: AnalysisRecord) => void;
}

const DEMO_DETECTIONS = [
  { label: "Persons", count: 0 },
  { label: "Vehicles", count: 0 },
  { label: "Buildings", count: 0 },
];

export default function SurveillanceView({
  isAnalyzing,
  onAnalyze,
  analysisInterval,
  onSetInterval,
  history,
  onClearHistory,
  onAskAI,
}: SurveillanceViewProps) {
  return (
    <div className="flex flex-col gap-5 w-full">
      {/* ── Top Action & Interval Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-purple)] to-[#8338ec] hover:opacity-90 active:scale-95 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(175,82,222,0.3)] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>ANALYZING FRAME...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>TRIGGER SCENE AI</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono">
            <span className="text-[var(--text-muted)] text-[10px] uppercase font-bold">AUTO-POLL:</span>
            <select
              value={analysisInterval || ""}
              onChange={(e) => onSetInterval(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent text-[var(--accent-cyan)] font-bold outline-none cursor-pointer"
            >
              <option value="" className="text-black">MANUAL</option>
              <option value="5" className="text-black">EVERY 5s</option>
              <option value="10" className="text-black">EVERY 10s</option>
              <option value="20" className="text-black">EVERY 20s</option>
              <option value="30" className="text-black">EVERY 30s</option>
            </select>
          </div>
        </div>

        {/* Threat & Object Counter Summary */}
        <div className="flex items-center gap-3">
          <DetectionSummary detections={DEMO_DETECTIONS} />
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-gray-400 hover:text-[var(--accent-red)] hover:border-red-500/30 transition-all"
            >
              CLEAR FEED ({history.length})
            </button>
          )}
        </div>
      </div>

      {/* ── Explainable AI History Feed ── */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Threat Assessment & Perception Feed</h4>
            <p className="text-xs text-[var(--text-muted)] font-mono">YOLOv8 Edge Object Classes + Gemini 2.5 Contextual Inference</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/25">
            SURVEILLANCE PROFILE ACTIVE
          </span>
        </div>

        <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {history.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[var(--text-muted)] gap-2">
              <span className="text-2xl opacity-40">🛡️</span>
              <p className="text-xs font-bold">No active threat assessments logged</p>
              <p className="text-[11px] max-w-sm text-gray-500">
                Trigger Scene AI or configure Auto-poll to begin streaming tactical scene understanding.
              </p>
            </div>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-[var(--accent-cyan)]/30 transition-all flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/10 text-gray-300">
                      {record.timestamp}
                    </span>
                    {record.threat_level && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        record.threat_level === "HIGH" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        record.threat_level === "MEDIUM" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      }`}>
                        {record.threat_level} THREAT
                      </span>
                    )}
                  </div>

                  {onAskAI && (
                    <button
                      onClick={() => onAskAI(record)}
                      className="px-2.5 py-1 rounded-lg bg-[var(--accent-cyan)]/15 hover:bg-[var(--accent-cyan)] text-[var(--accent-cyan)] hover:text-white text-[11px] font-bold font-mono transition-all"
                    >
                      QUERY COPILOT →
                    </button>
                  )}
                </div>

                {record.objects && record.objects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {record.objects.map((obj, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-[var(--accent-cyan)]">
                        {obj}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {record.summary}
                </p>

                {record.tactical_recommendation && (
                  <div className="p-2.5 rounded-lg bg-[var(--accent-purple)]/10 border border-[var(--accent-purple)]/20 text-[11px] text-[var(--accent-purple)]">
                    <span className="font-bold">TACTICAL ACTION: </span>
                    {record.tactical_recommendation}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
