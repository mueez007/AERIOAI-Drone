"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import VideoModal from "@/components/videos/VideoModal";
import VideoDeepAnalysisModal from "@/components/videos/VideoDeepAnalysisModal";

interface Video {
  id: string;
  filename: string;
  created_at: string;
  file_size?: number;
  duration?: number;
}

const GLASS: React.CSSProperties = {
  background: "rgba(30,30,30,0.6)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

function formatDuration(s?: number) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Video | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [autoAction, setAutoAction] = useState<'normal' | 'deep' | 'view' | null>(null);

  const fetchVideos = useCallback(async () => {
    try {
      const data = await api.getVideos() as any;
      setVideos(Array.isArray(data) ? data : data?.videos || data?.items || []);
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.deleteMedia(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
    } catch {}
  }, []);

  const formatDate = (d: string) => {
    const dateStr = d.endsWith('Z') ? d : `${d}Z`;
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Videos</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {videos.length > 0 ? `${videos.length} video${videos.length !== 1 ? "s" : ""} recorded` : "Your recorded videos will appear here"}
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-[#0071E3] border-t-transparent animate-spin" />
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={GLASS}>
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--text-primary)]">No videos yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Start recording from the Live Stream page</p>
          </div>
        </div>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              onClick={() => setSelected(video)}
              className={`group relative rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none cursor-pointer flex flex-col ${activeMenu === video.id ? 'z-50' : 'z-10 hover:z-40'}`}
              style={GLASS}
            >
              {/* Thumbnail placeholder */}
              <div className="aspect-video bg-gray-900 dark:bg-black relative overflow-hidden flex items-center justify-center rounded-t-2xl">
                
                {/* Hover overlay with 3-dot menu */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                  
                  <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
                    <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>

                {/* Duration badge */}
                {video.duration && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono font-bold">
                    {formatDuration(video.duration)}
                  </div>
                )}
              </div>

              {/* Text info */}
              <div className="p-4">
                <p className="font-semibold text-[var(--text-primary)] truncate text-sm">
                  {video.filename}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {formatDate(video.created_at)}
                </p>
              </div>

              {/* 3-Dot Menu (Moved out to avoid clipping) */}
              <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === video.id ? null : video.id);
                  }}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {activeMenu === video.id && (
                  <div className="absolute top-full right-0 mt-2 w-40 bg-[var(--bg-secondary)] backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden py-1 z-30 animate-fade-in text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        setAutoAction('normal');
                        setSelected(video);
                      }}
                      className="w-full text-left px-4 py-2 text-[var(--accent-cyan)] hover:bg-[var(--text-primary)]/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                      </svg>
                      Quick Analyze
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        setAutoAction('deep');
                        setSelected(video);
                      }}
                      className="w-full text-left px-4 py-2 text-purple-400 hover:bg-[var(--text-primary)]/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Deep Analyze
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        setAutoAction('view');
                        setSelected(video);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-[var(--text-primary)]/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Analysis
                    </button>
                    <a
                      href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/camera/download/${video.id}`}
                      download={video.filename}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-left px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--text-primary)]/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                    <div className="h-px bg-[var(--border-color)] my-1" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(video.id);
                      }}
                      className="w-full text-left px-4 py-2 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <VideoModal
          video={selected}
          onClose={() => { setSelected(null); setAutoAction(null); }}
          onDelete={handleDelete}
          autoAction={autoAction}
        />
      )}

    </div>
  );
}
