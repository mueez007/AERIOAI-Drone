"use client";

import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "@/lib/constants";
import api from "@/lib/api";
import VoiceButton from "@/components/chat/VoiceButton";

interface Video {
  id: string;
  filename: string;
  created_at: string;
  file_size?: number;
  duration?: number;
  analysis_history?: any[];
}

interface Analysis {
  summary: string;
  events?: string;
  objects?: string;
  threat_level?: "LOW" | "MEDIUM" | "HIGH";
}

interface Props {
  video: Video;
  onClose: () => void;
  onDelete: (id: string) => void;
  autoAction?: 'normal' | 'deep' | 'view' | null;
}

const THREAT_COLORS = {
  LOW: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
  MEDIUM: { bg: "bg-amber-500/20", text: "text-amber-400" },
  HIGH: { bg: "bg-red-500/20 text-red-400 animate-pulse", text: "text-red-400" },
};

export default function VideoModal({ video, onClose, onDelete, autoAction }: Props) {
  const initialHistory = video.analysis_history || [];
  
  const prevNormal = initialHistory.find(h => h.type === 'normal' || !h.type);
  const prevDeep = initialHistory.find(h => h.type === 'deep');

  const [analyses, setAnalyses] = useState<{ normal: Analysis | null, deep: Analysis | null }>({
    normal: prevNormal ? {
      summary: prevNormal.summary,
      events: prevNormal.recommendations || "",
      objects: (prevNormal.detections || []).map((d: any) => d.class || d).join(", "),
      threat_level: prevNormal.threat_level,
    } : null,
    deep: prevDeep ? {
      summary: prevDeep.summary,
      events: prevDeep.recommendations || "",
      objects: (prevDeep.detections || []).map((d: any) => d.class || d).join(", "),
      threat_level: prevDeep.threat_level,
    } : null,
  });

  const [chatLogs, setChatLogs] = useState<{ normal: {role: string, text: string}[], deep: {role: string, text: string}[] }>({
    normal: [],
    deep: []
  });

  const [activeTab, setActiveTab] = useState<'normal' | 'deep'>('normal');
  const [analyzingType, setAnalyzingType] = useState<'normal' | 'deep' | null>(null);
  
  const [isAnalysisPanelOpen, setIsAnalysisPanelOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoUrl = `${API_BASE_URL}/api/camera/download/${video.id}`;

  useEffect(() => {
    async function fetchChatLogs() {
      try {
        const historyNormal = await api.getLiveAnalysisHistory("media_analysis", `${video.id}_normal`) as any[];
        const historyDeep = await api.getLiveAnalysisHistory("media_analysis", `${video.id}_deep`) as any[];
        
        setChatLogs({
          normal: historyNormal.map(h => ({ role: h.role, text: h.message })),
          deep: historyDeep.map(h => ({ role: h.role, text: h.message }))
        });
      } catch (e) {
        console.error("Failed to fetch chat logs", e);
      }
    }
    fetchChatLogs();
  }, [video.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs, activeTab]);

  const analyze = async (type: 'normal' | 'deep' = 'normal') => {
    setAnalyzingType(type);
    setActiveTab(type);
    setIsAnalysisPanelOpen(true);
    try {
      const res = await api.deepAnalyzeVideo(video.id, type) as any;
      const newAnalysis: Analysis = {
        summary: res.summary || "Analysis complete.",
        events: res.recommendations || "",
        objects: (res.detections || []).map((d: any) => d.class).join(", ") || "None detected",
        threat_level: res.threat_level || "LOW",
      };
      setAnalyses(prev => ({ ...prev, [type]: newAnalysis }));
    } catch {
      setAnalyses(prev => ({ ...prev, [type]: { summary: "Could not analyze this video. Please try again.", threat_level: "LOW" } }));
    } finally {
      setAnalyzingType(null);
    }
  };

  const handleSendChat = async (text: string) => {
    if (!text.trim()) return;
    const userMsg = text;
    setChatInput("");
    
    setChatLogs(prev => ({
      ...prev,
      [activeTab]: [...prev[activeTab], { role: 'user', text: userMsg }]
    }));
    setIsChatLoading(true);
    
    try {
      const sessionId = `${video.id}_${activeTab}`;
      const res = await api.sendChatMessage(userMsg, video.id, undefined, false, voiceEnabled, sessionId, "media_analysis") as any;
      
      setChatLogs(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], { role: 'ai', text: res.response }]
      }));
      
      if (voiceEnabled && res.audio_url) {
        const audioUrl = res.audio_url.startsWith('http') ? res.audio_url : `${API_BASE_URL}${res.audio_url}`;
        const audio = new Audio(audioUrl);
        audio.play().catch(console.error);
      }
    } catch (error) {
      console.error(error);
      setChatLogs(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], { role: 'ai', text: "Sorry, I encountered an error." }]
      }));
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleVoiceChat = async (blob: Blob) => {
    setIsChatLoading(true);

    try {
      const sessionId = `${video.id}_${activeTab}`;
      const res = await api.sendVoiceCommand(blob, undefined, false, sessionId, "media_analysis") as any;
      
      setChatLogs(prev => ({
        ...prev,
        [activeTab]: [
          ...prev[activeTab], 
          { role: 'user', text: res.transcribed_text },
          { role: 'ai', text: res.ai_response }
        ]
      }));
      
      if (voiceEnabled && res.audio_url) {
        const audioUrl = res.audio_url.startsWith('http') ? res.audio_url : `${API_BASE_URL}${res.audio_url}`;
        const audio = new Audio(audioUrl);
        audio.play().catch(console.error);
      }
    } catch (error) {
      console.error(error);
      setChatLogs(prev => ({
        ...prev,
        [activeTab]: [...prev[activeTab], { role: 'ai', text: "Could not process voice input." }]
      }));
    } finally {
      setIsChatLoading(false);
    }
  };

  useEffect(() => {
    if (autoAction === 'normal' && !analyses.normal && !analyzingType) {
      analyze('normal');
    } else if (autoAction === 'deep' && !analyses.deep && !analyzingType) {
      analyze('deep');
    } else if (autoAction === 'view') {
      setIsAnalysisPanelOpen(true);
    }
  }, [autoAction]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const formatSize = (bytes?: number) =>
    bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : "—";

  const formatDuration = (s?: number) => {
    if (!s) return "—";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const currentAnalysis = analyses[activeTab];
  const currentChatLog = chatLogs[activeTab];

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl animate-fade-in">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex flex-col">
          <span className="text-white font-bold">{video.filename}</span>
          <span className="text-xs text-gray-400">{formatDate(video.created_at)} • {formatSize(video.file_size)} • {formatDuration(video.duration)}</span>
        </div>
        <button
          onClick={onClose}
          className="pointer-events-auto w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors backdrop-blur-md"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Video Area */}
      <div className="flex-1 flex items-center justify-center relative p-4 mt-16 mb-24" onClick={onClose}>
        <div className="relative inline-block max-w-full max-h-full">
          <video
            src={videoUrl}
            controls
            className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
            onClick={e => e.stopPropagation()}
            preload="metadata"
          />
        </div>
      </div>

      {/* Bottom Sheet: Explainable AI & Actions */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white/10 dark:bg-[#0a0a0a]/80 backdrop-blur-3xl border-t border-gray-200/20 dark:border-white/10 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.3)] transition-all duration-500 flex flex-col ${isAnalysisPanelOpen ? 'max-h-[85vh] p-6' : 'max-h-24 p-4'}`}>
        
        {/* Always visible quick actions when closed */}
        {!isAnalysisPanelOpen && (
          <div className="flex flex-wrap gap-4 justify-center items-center h-full">
            <button
              onClick={() => analyze('normal')}
              disabled={!!analyzingType}
              className="px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500/80 to-indigo-500/80 backdrop-blur-md text-white hover:scale-105 active:scale-95 shadow-lg border border-white/20"
            >
              {analyzingType === 'normal' ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>}
              Quick Analyze
            </button>
            <button
              onClick={() => analyze('deep')}
              disabled={!!analyzingType}
              className="px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-md text-white hover:scale-105 active:scale-95 shadow-lg border border-white/20"
            >
              {analyzingType === 'deep' ? <span className="w-4 h-4 rounded-full border-2 border-white/50 border-t-white animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              Deep Analyze
            </button>
            <button
              onClick={() => setIsAnalysisPanelOpen(true)}
              className="px-6 py-3 rounded-full text-sm font-semibold text-white bg-white/20 hover:bg-white/30 transition-colors flex items-center gap-2 border border-white/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View Analysis
            </button>
            <a
              href={videoUrl}
              download={video.filename}
              className="px-6 py-3 rounded-full text-sm font-semibold text-white bg-white/10 hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download
            </a>
            <button
              onClick={() => { onDelete(video.id); onClose(); }}
              className="px-6 py-3 rounded-full text-sm font-semibold text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              Delete
            </button>
          </div>
        )}

        {/* Panel Content */}
        {isAnalysisPanelOpen && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-6 shrink-0">
              {/* Tabs */}
              <div className="flex bg-white/5 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('normal')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'normal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  Quick Analysis
                </button>
                <button
                  onClick={() => setActiveTab('deep')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'deep' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                >
                  Deep Analysis
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAnalysisPanelOpen(false)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Minimize Analysis"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Analysis Content */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col">
              {!currentAnalysis && !analyzingType ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[200px] text-center">
                  <p className="text-gray-400 mb-4">No {activeTab} analysis exists yet.</p>
                  <button
                    onClick={() => analyze(activeTab)}
                    className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2 backdrop-blur-md text-white hover:scale-105 active:scale-95 shadow-lg border border-white/20 ${activeTab === 'deep' ? 'bg-gradient-to-r from-purple-500/80 to-pink-500/80' : 'bg-gradient-to-r from-blue-500/80 to-indigo-500/80'}`}
                  >
                    Run {activeTab === 'deep' ? 'Deep' : 'Quick'} Analysis
                  </button>
                </div>
              ) : analyzingType === activeTab ? (
                <div className="flex flex-col items-center justify-center flex-1 min-h-[200px]">
                  <span className="w-8 h-8 rounded-full border-4 border-white/20 border-t-blue-500 animate-spin mb-4" />
                  <p className="text-white font-medium animate-pulse">Running {activeTab} analysis...</p>
                </div>
              ) : currentAnalysis ? (
                <div className="max-w-4xl mx-auto w-full space-y-4 flex flex-col h-full">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white uppercase tracking-wider">Video Intelligence Results</span>
                    </div>
                    {currentAnalysis.threat_level && (
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${THREAT_COLORS[currentAnalysis.threat_level].bg} ${THREAT_COLORS[currentAnalysis.threat_level].text} shadow-lg`}>
                        THREAT: {currentAnalysis.threat_level}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-base text-gray-800 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap shrink-0">
                    {currentAnalysis.summary}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 shrink-0">
                    {currentAnalysis.events && (
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <span className="text-[10px] uppercase text-gray-500 tracking-widest font-bold mb-1 block">Key Events</span>
                        <p className="text-sm text-gray-300">{currentAnalysis.events}</p>
                      </div>
                    )}
                    {currentAnalysis.objects && (
                      <div className="bg-[#0071E3]/10 p-4 rounded-2xl border border-[#0071E3]/20">
                        <span className="text-[10px] uppercase text-[#0071E3] tracking-widest font-bold mb-1 block">Detected Objects</span>
                        <p className="text-sm text-[#0071E3] italic">{currentAnalysis.objects}</p>
                      </div>
                    )}
                  </div>

                  {/* Separate Media Q&A Chat for this tab */}
                  <div className="mt-6 pt-6 border-t border-gray-200/20 dark:border-white/10 flex flex-col flex-1 min-h-[300px]">
                    <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                      {currentChatLog.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            msg.role === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-sm' 
                              : 'bg-white/40 dark:bg-white/10 text-gray-900 dark:text-white rounded-bl-sm backdrop-blur-md border border-white/20'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white/40 dark:bg-white/10 text-gray-900 dark:text-white rounded-2xl rounded-bl-sm px-4 py-2 backdrop-blur-md border border-white/20">
                            <span className="animate-pulse">Thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    
                    <div className="flex flex-col gap-2 shrink-0">
                      <div className="flex items-center gap-2 px-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} className="rounded border-gray-500 bg-black/50 text-blue-500 focus:ring-blue-500" />
                          <span className="text-xs font-semibold text-gray-400">Voice Output</span>
                        </label>
                      </div>
                      <div className="flex gap-2 items-end pb-4">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSendChat(chatInput)}
                          placeholder={`Ask a question about this ${activeTab} analysis...`}
                          className="flex-1 bg-white/5 dark:bg-black/50 border border-gray-300/50 dark:border-white/20 rounded-full px-6 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-md transition-all"
                        />
                        <VoiceButton onRecord={handleVoiceChat} disabled={isChatLoading} />
                        <button
                          onClick={() => handleSendChat(chatInput)}
                          disabled={isChatLoading || !chatInput.trim()}
                          className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white disabled:opacity-50 hover:bg-blue-700 transition-colors shadow-lg"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
