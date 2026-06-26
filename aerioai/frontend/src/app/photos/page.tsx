"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import PhotoModal from "@/components/photos/PhotoModal";

interface Photo {
  id: string;
  filename: string;
  created_at: string;
  file_size?: number;
}

const GLASS: React.CSSProperties = {
  background: "rgba(30,30,30,0.6)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [autoAction, setAutoAction] = useState<'normal' | 'deep' | 'view' | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const data = await api.getPhotos() as any;
      setPhotos(Array.isArray(data) ? data : data?.photos || data?.items || []);
    } catch {
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await api.deleteMedia(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // ignore
    }
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-6 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Photos</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          {photos.length > 0 ? `${photos.length} photo${photos.length !== 1 ? "s" : ""} captured` : "Your captured photos will appear here"}
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-[#0071E3] border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={GLASS}
          >
            <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[var(--text-primary)]">No photos yet</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Use the Live Stream page to capture photos</p>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelected(photo)}
              className={`group relative rounded-2xl aspect-square text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] focus:outline-none cursor-pointer flex flex-col ${activeMenu === photo.id ? 'z-50' : 'z-10 hover:z-40'}`}
              style={GLASS}
            >
              {/* Thumbnail */}
              <div className="w-full h-full bg-gray-100 dark:bg-gray-800 relative overflow-hidden rounded-t-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/camera/thumbnail/${photo.id}`}
                  alt={photo.filename}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>

              {/* Text Info */}
              <div className="p-3">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{photo.filename}</p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{formatDate(photo.created_at)}</p>
              </div>

              {/* 3-Dot Menu (Moved out to avoid clipping) */}
              <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenu(activeMenu === photo.id ? null : photo.id);
                  }}
                  className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {activeMenu === photo.id && (
                  <div className="absolute top-full right-0 mt-2 w-40 bg-[var(--bg-secondary)] backdrop-blur-xl border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden py-1 z-30 animate-fade-in text-sm font-medium">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        setAutoAction('normal');
                        setSelected(photo);
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
                        setSelected(photo);
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
                        setSelected(photo);
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
                      href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/camera/download/${photo.id}`}
                      download={photo.filename}
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
                        handleDelete(photo.id);
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

      {/* Photo modal */}
      {selected && (
        <PhotoModal
          photo={selected}
          onClose={() => { setSelected(null); setAutoAction(null); }}
          onDelete={handleDelete}
          autoAction={autoAction}
        />
      )}
    </div>
  );
}
