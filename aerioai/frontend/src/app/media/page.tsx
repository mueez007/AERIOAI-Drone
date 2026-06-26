"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Media } from "@/types/api";
import Loader from "@/components/ui/Loader";
import { formatTimestamp } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function MediaPage() {
  const [mediaItems, setMediaItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const data = await api.getMedia();
      setMediaItems(data);
    } catch (error) {
      console.error("Failed to fetch media", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e: React.MouseEvent, media: Media) => {
    e.stopPropagation();
    setSelectedMedia(media);
    setAnalysisResult(null);
    setAnalyzing(true);
    
    try {
      const result = await api.analyzeMedia(media.id);
      setAnalysisResult(result.analysis);
    } catch (error) {
      console.error("Analysis failed", error);
      setAnalysisResult("Analysis failed. System might be offline or using mock data.");
    } finally {
      setAnalyzing(false);
    }
  };

  const closeAnalysis = () => {
    setSelectedMedia(null);
    setAnalysisResult(null);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader variant="pulse" text="ACCESSING VAULT" size="md" />
      </div>
    );
  }

  // Split into images and videos for a cool layout
  const images = mediaItems.filter(m => m.type === 'image');
  const videos = mediaItems.filter(m => m.type === 'video');

  return (
    <div className="flex flex-col gap-8 h-full animate-fade-in relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media Vault</h1>
          <p className="text-[var(--text-secondary)] font-medium">Visual Intelligence & Archive</p>
        </div>
        <div className="flex gap-4">
          <button className="glass-panel px-6 py-2.5 text-sm font-bold shadow-sm hover:shadow-md hover:bg-black/5 dark:hover:bg-white/5 transition-all">Filter</button>
          <button className="glass-button px-6 py-2.5 text-sm font-bold bg-[var(--text-primary)] text-[var(--bg-primary)]">Sync Cloud</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-min">
        {mediaItems.length === 0 ? (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-[var(--text-muted)] glass-panel border-dashed">
            <span className="text-5xl mb-4">📸</span>
            <p className="text-lg font-bold">No media captured yet.</p>
            <p className="text-sm">Fly a mission and use the capture tool.</p>
          </div>
        ) : (
          mediaItems.map((media) => (
            <div 
              key={media.id} 
              className="glass-panel overflow-hidden group relative flex flex-col bg-[var(--bg-secondary)] hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer"
              onClick={(e) => handleAnalyze(e, media)}
            >
              <div className="relative aspect-[4/3] bg-black/5 dark:bg-white/5 border-b border-[var(--border-color)] overflow-hidden">
                {media.type === 'image' ? (
                  <img src={media.url} alt="Capture" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <video src={media.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" controls />
                )}
                
                <div className="absolute top-4 left-4 glass-pill px-3 py-1 bg-black/40 border-white/10 text-white shadow-lg backdrop-blur-md">
                  <span className="text-[10px] font-bold tracking-widest uppercase">{media.type}</span>
                </div>
                
                {/* Analyze Overlay Button */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <button className="glass-button px-6 py-3 font-bold text-white border-white/30 hover:bg-white/20 hover:scale-110 active:scale-95 transition-all flex items-center gap-2">
                    <span>✨</span> Analyze Scene
                  </button>
                </div>
              </div>
              
              <div className="p-5 flex justify-between items-center">
                <div>
                  <p className="font-mono text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase mb-1">Mission ID</p>
                  <p className="text-sm font-bold truncate max-w-[150px]">{media.mission_id || "Manual"}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase mb-1">Timestamp</p>
                  <p className="text-sm font-medium">{formatTimestamp(media.created_at).split(' ')[1]}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Analysis Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-fade-in" onClick={closeAnalysis}>
          <div 
            className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl bg-[var(--bg-primary)] animate-slide-up border border-[var(--border-color)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-cyan)]/10 flex items-center justify-center text-[var(--accent-cyan)] text-xl">
                  ✨
                </div>
                <div>
                  <h2 className="text-xl font-bold">Intelligence Analysis</h2>
                  <p className="text-xs font-mono text-[var(--text-muted)]">ASSET ID: {selectedMedia.id}</p>
                </div>
              </div>
              <button 
                onClick={closeAnalysis}
                className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col md:flex-row gap-8">
              <div className="md:w-1/2 flex flex-col gap-4">
                <div className="rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-inner bg-black/5 dark:bg-white/5">
                  {selectedMedia.type === 'image' ? (
                    <img src={selectedMedia.url} alt="Selected" className="w-full h-auto object-contain max-h-[400px]" />
                  ) : (
                    <video src={selectedMedia.url} controls className="w-full h-auto max-h-[400px]" />
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-panel p-4">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-1">Time Captured</p>
                    <p className="text-sm font-mono">{formatTimestamp(selectedMedia.created_at)}</p>
                  </div>
                  <div className="glass-panel p-4">
                    <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-1">Mission Link</p>
                    <p className="text-sm font-mono truncate">{selectedMedia.mission_id || "None"}</p>
                  </div>
                </div>
              </div>
              
              <div className="md:w-1/2 flex flex-col">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
                  Gemini Vision Output
                </h3>
                
                <div className="flex-1 glass-panel p-6 bg-[var(--bg-secondary)] overflow-y-auto min-h-[300px]">
                  {analyzing ? (
                    <div className="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-4">
                      <div className="w-8 h-8 border-2 border-[var(--accent-cyan)] border-t-transparent rounded-full animate-spin" />
                      <p className="font-mono text-sm tracking-widest uppercase animate-pulse">Running Vision Models...</p>
                    </div>
                  ) : analysisResult ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-[var(--text-primary)] font-medium leading-relaxed">
                      <ReactMarkdown>{analysisResult}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] italic">
                      Analysis complete. No data returned.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
