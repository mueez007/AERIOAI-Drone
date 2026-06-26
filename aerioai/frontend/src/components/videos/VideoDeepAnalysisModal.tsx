"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

interface Video {
  id: string;
  filename: string;
  created_at: string;
  file_size?: number;
  duration?: number;
}

interface DeepAnalysisModalProps {
  video: Video;
  onClose: () => void;
}

export default function VideoDeepAnalysisModal({ video, onClose }: DeepAnalysisModalProps) {
  const [loading, setLoading] = useState(true);
  const [analysisHistory, setAnalysisHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    runDeepAnalysis();
  }, [video]);

  const runDeepAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.deepAnalyzeVideo(video.id) as any;
      const newRecord = {
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        summary: result.summary || "No summary provided.",
        reasoning_depth: result.reasoning_depth || "Standard",
        threat_assessment: result.threat_assessment || "Unknown"
      };
      setAnalysisHistory(prev => [newRecord, ...prev]);
    } catch (err: any) {
      setError("Failed to run deep analysis. Ensure Cosmos API key is configured.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-6xl h-full max-h-[90vh] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/10 hover:scale-105 transition-all shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Video Column */}
        <div className="w-full md:w-1/2 bg-black flex flex-col relative h-[40vh] md:h-full">
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur border border-white/10 shadow-lg">
            <span className="text-xs font-bold text-white tracking-wide uppercase">Cosmos Reasoner Active</span>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative">
            <video
              src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/camera/download/${video.id}`}
              controls
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Analysis History Column */}
        <div className="w-full md:w-1/2 flex flex-col h-[50vh] md:h-full bg-[var(--bg-secondary)] border-l border-[var(--border-color)]">
          <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--glass-bg)] backdrop-blur-xl shrink-0">
            <div>
              <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] text-[var(--text-primary)]">Deep Video Analysis</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{video.filename}</p>
            </div>
            <button 
              onClick={runDeepAnalysis}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-cyan)] text-white text-xs font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Re-Analyze
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {error && (
              <div className="p-4 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-xl text-[var(--accent-red)] text-sm font-medium">
                {error}
              </div>
            )}
            
            {loading && analysisHistory.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)] gap-4">
                <div className="w-8 h-8 rounded-full border-4 border-[var(--accent-cyan)] border-t-transparent animate-spin" />
                <p className="text-sm font-bold uppercase tracking-widest animate-pulse">Cosmos reasoning in progress...</p>
              </div>
            )}

            {analysisHistory.map((record, i) => (
              <div key={i} className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-2.5 py-1 bg-[var(--bg-primary)] border border-white/5 shadow-inner rounded-md text-xs font-mono font-bold text-[var(--accent-cyan)]">
                    [{record.timestamp}]
                  </span>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {record.reasoning_depth}
                  </span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase mb-1">Deep Structural Reasoning</p>
                    <p className="text-sm font-medium leading-relaxed text-[var(--text-secondary)]">
                      {record.summary}
                    </p>
                  </div>
                  
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase mb-1">Threat Assessment</p>
                    <p className="text-sm font-bold text-[var(--accent-red)]">{record.threat_assessment}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
