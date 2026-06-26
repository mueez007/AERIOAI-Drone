"use client";

import { useState, useCallback, useEffect } from "react";
import LiveFeedCanvas from "@/components/dashboard/LiveFeedCanvas";
import DetectionSummary from "@/components/dashboard/DetectionSummary";
import VoiceToggle from "@/components/dashboard/VoiceToggle";
import TelemetryOverlay from "@/components/dashboard/TelemetryOverlay";
import EmergencyAI from "@/components/dashboard/EmergencyAI";
import { useCamera } from "@/hooks/useCamera";
import { useTelemetry } from "@/hooks/useTelemetry";
import { ExpandIcon } from "@/components/ui/Icons";
import { PhotoAnalysisDrawer } from "@/components/photos/PhotoAnalysisDrawer";
import { useRouter } from "next/navigation";
import VoiceButton from "@/components/chat/VoiceButton";
import api from "@/lib/api";

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

const GLASS: React.CSSProperties = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid var(--border-color)",
};

// Mock detections
const DEMO_DETECTIONS = [
  { label: "Persons", count: 0 },
  { label: "Vehicles", count: 0 },
  { label: "Buildings", count: 0 },
];

export default function LiveStreamPage() {
  const { isRecording, capturePhoto, startRecording, stopRecording, getStreamUrl } = useCamera();
  const { telemetry, gps, attitude, battery, isConnected } = useTelemetry();
  const [voiceMode, setVoiceMode] = useState(false);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const router = useRouter();
  
  // Real-time analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]);
  const [analysisInterval, setAnalysisInterval] = useState<number | null>(null);

  // Chat State
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleRealTimeAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const response = await api.analyzeScene("live", undefined, true) as any;
      
      const newRecord: AnalysisRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
        threat_level: response.threat_level || "LOW",
        objects: response.objects
          ? response.objects.map((d: any) => d.class || d.label || "Unknown")
          : response.detections
          ? response.detections.map((d: any) => d.class || "Unknown")
          : [],
        summary: response.summary || "No summary provided.",
        tactical_recommendation: response.recommendations || "No recommendations.",
        is_chat: false,
      };
      
      setAnalysisHistory(prev => [newRecord, ...prev].slice(0, 50));
    } catch (error: any) {
      console.error("Live analysis failed:", error);
      // Show error in the feed so user knows what happened
      const errRecord: AnalysisRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
        threat_level: "",
        objects: [],
        summary: `Analysis failed: ${error?.message || "Camera unavailable or backend error. Make sure camera permissions are granted and backend is running."}`,
        tactical_recommendation: "",
        is_chat: true,
        role: "ai",
      };
      setAnalysisHistory(prev => [errRecord, ...prev]);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Fetch history on mount
  useEffect(() => {
    async function fetchHistory() {
      try {
        const history = await api.getLiveAnalysisHistory("live_stream") as any[];
        // Transform the log objects to AnalysisRecords to display in the UI
        const parsedHistory: AnalysisRecord[] = history
          .map(h => {
            if (h.role === "ai" && h.message.includes("THREAT")) {
              return {
                id: h.id.toString(),
                timestamp: new Date(h.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
                threat_level: h.message.includes("HIGH THREAT") ? "HIGH" : h.message.includes("MEDIUM THREAT") ? "MEDIUM" : "LOW",
                objects: ["See details"],
                summary: h.message,
                tactical_recommendation: "",
                is_chat: false
              };
            } else {
              return {
                id: h.id.toString(),
                timestamp: new Date(h.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
                threat_level: "",
                objects: [],
                summary: h.message,
                tactical_recommendation: "",
                is_chat: true,
                role: h.role as "user" | "ai"
              };
            }
          });
        setAnalysisHistory(parsedHistory.reverse().slice(0, 50));
      } catch (e) {
        console.warn("Failed to fetch history (ignoring)", e);
      }
    }
    fetchHistory();
  }, []);

  useEffect(() => {
    let recognition: any = null;

    if (voiceMode) {
      // Play startup announcement
      api.getStartupAnnouncement().then((res: any) => {
        if (res?.audio_url) {
          const audio = new Audio(`http://localhost:8000${res.audio_url}`);
          audio.play().catch(e => console.error("Audio play failed", e));
        }
      }).catch(e => console.error("Failed to get startup announcement", e));

      // Start continuous listening
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          if (transcript && transcript.trim().length > 0) {
            sendLiveChat(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn("Speech recognition error", event.error);
        };

        recognition.onend = () => {
          // Restart if still in voice mode (handles silent timeouts)
          if (voiceMode) {
            try { recognition.start(); } catch {}
          }
        };

        try { recognition.start(); } catch {}
      }
    }

    return () => {
      if (recognition) {
        recognition.onend = null; // Prevent restart loop
        try { recognition.stop(); } catch {}
      }
    };
  }, [voiceMode]);

  const sendLiveChat = async (text: string) => {
    if (!text.trim() || isChatLoading) return;
    setIsChatLoading(true);
    const userRec: AnalysisRecord = {
      id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), threat_level: "", objects: [], summary: text, tactical_recommendation: "", is_chat: true, role: "user"
    };
    setAnalysisHistory(prev => [userRec, ...prev]);
    setChatInput("");

    try {
      const res = await api.sendChatMessage(text, undefined, undefined, true, voiceMode, "live", "live_stream") as any;
      const reply = res?.response || "Failed to analyze frame.";
      const aiRec: AnalysisRecord = {
        id: (Date.now() + 1).toString(), timestamp: new Date().toLocaleTimeString(), threat_level: "", objects: [], summary: reply, tactical_recommendation: "", is_chat: true, role: "ai"
      };
      setAnalysisHistory(prev => [aiRec, ...prev]);

      if (voiceMode && res?.audio_url) {
        new Audio(`http://localhost:8000${res.audio_url}`).play();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleLiveVoice = async (blob: Blob) => {
    setIsChatLoading(true);
    
    // Provide instant audio feedback
    if ("speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("Analyzing the scene, give me a sec..."));
    }
    
    try {
      const res = await api.sendVoiceCommand(blob, undefined, true, "live", "live_stream") as any;
      const transcript = res?.transcribed_text || res?.transcript || res?.text || "";
      const reply = res?.ai_response || res?.response || res?.message || "";
      
      if (transcript) {
        setAnalysisHistory(prev => [{
          id: Date.now().toString(), timestamp: new Date().toLocaleTimeString(), threat_level: "", objects: [], summary: transcript, tactical_recommendation: "", is_chat: true, role: "user"
        }, ...prev]);
      }
      if (reply) {
        setAnalysisHistory(prev => [{
          id: (Date.now()+1).toString(), timestamp: new Date().toLocaleTimeString(), threat_level: "", objects: [], summary: reply, tactical_recommendation: "", is_chat: true, role: "ai"
        }, ...prev]);

        if (res?.audio_url) {
          new Audio(`http://localhost:8000${res.audio_url}`).play();
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Auto-polling for Continuous Analysis
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (analysisInterval) {
      handleRealTimeAnalysis(); // Trigger immediately
      timer = setInterval(() => {
        handleRealTimeAnalysis();
      }, analysisInterval * 1000);
    }
    return () => clearInterval(timer);
  }, [analysisInterval, handleRealTimeAnalysis]);

  const handleCapture = useCallback(async () => {
    await capturePhoto();
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 300);
  }, [capturePhoto]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);



  return (
    <div className="h-[calc(100vh-64px)] w-full flex flex-col p-4 sm:p-6 gap-6 bg-transparent overflow-y-auto">
      
      {/* ── Main Video Layer ── */}
      <div className={`w-full bg-black shadow-2xl transition-all duration-300 ${isFullscreen ? "fixed inset-0 z-[9999] rounded-none border-none" : "relative rounded-2xl overflow-hidden border border-[var(--border-color)] flex-shrink-0 h-[60vh] min-h-[500px]"}`}>
        
        {/* Capture flash */}
        {captureFlash && (
          <div className="absolute inset-0 z-20 bg-white animate-ping" style={{ animationDuration: "150ms", animationIterationCount: 1 }} />
        )}

        <LiveFeedCanvas
          streamUrl={getStreamUrl()}
          isRecording={isRecording}
        />

        {/* ── Top Floating Bar (Inside Video) ── */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none flex justify-between items-start">
          {/* LIVE badge & Recording Controls */}
          <div className="flex items-center gap-3 pointer-events-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
              <span className="text-[10px] font-bold text-white tracking-widest">LIVE</span>
            </div>

            <button
              onClick={handleCapture}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 border border-white/10 hover:bg-white/10 transition-colors text-white text-xs font-bold shadow-lg"
            >
              <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              CAPTURE
            </button>

            {isRecording ? (
              <button
                onClick={handleRecordToggle}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-600/90 border border-red-400 hover:bg-red-700 transition-colors text-white text-xs font-bold shadow-[0_0_15px_rgba(220,38,38,0.6)] animate-pulse"
              >
                <span className="w-3 h-3 rounded-sm bg-white" />
                STOP RECORDING
              </button>
            ) : (
              <button
                onClick={handleRecordToggle}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/50 border border-white/10 hover:bg-white/10 transition-colors text-white text-xs font-bold shadow-lg"
              >
                <span className="w-3 h-3 rounded-full border-2 border-red-500" />
                RECORD
              </button>
            )}
          </div>

          {/* AI & Voice Controls */}
          <div className="flex flex-col gap-3 items-end pointer-events-auto">
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="bg-black/50 rounded-xl p-2.5 border border-white/10 hover:bg-white/10 transition-colors shadow-lg">
              {isFullscreen ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8V5a2 2 0 012-2h3m13 8V5a2 2 0 00-2-2h-3m-13 8v3a2 2 0 002 2h3m13-8v3a2 2 0 01-2 2h-3" />
                </svg>
              )}
            </button>

            {!isFullscreen && (
              <div className="bg-black/50 rounded-xl p-3 border border-white/10 shadow-lg mt-2 pointer-events-auto">
                <DetectionSummary detections={DEMO_DETECTIONS} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Analysis Action Area (Outside Video) */}
      {!isFullscreen && (
        <div className="flex justify-center items-center gap-4 w-full">
          <div className="flex bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-full p-1 shadow-[0_0_20px_rgba(175,82,222,0.2)]">
            <button 
              onClick={handleRealTimeAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-purple)] hover:bg-[#9945c7] text-white font-bold transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing Frame...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Real-Time Analysis
                </>
              )}
            </button>

            <div className="flex items-center px-4 border-l border-white/10 ml-2">
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest mr-2">Auto</span>
              <select 
                value={analysisInterval || ""}
                onChange={(e) => setAnalysisInterval(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent text-sm font-bold text-[var(--accent-cyan)] outline-none cursor-pointer appearance-none"
              >
                <option value="" className="text-black">Off</option>
                <option value="5" className="text-black">5s</option>
                <option value="10" className="text-black">10s</option>
                <option value="20" className="text-black">20s</option>
                <option value="30" className="text-black">30s</option>
              </select>
            </div>
          </div>
          
          <div className="bg-[var(--glass-bg)] rounded-full px-5 py-2 border border-[var(--border-color)] shadow-lg flex items-center justify-center">
            <VoiceToggle enabled={voiceMode} onChange={setVoiceMode} label="AI Voice Responses" />
          </div>
          
          <div className="flex items-center gap-2 flex-1 max-w-md bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-full px-2 shadow-lg">
            <VoiceButton onRecord={handleLiveVoice} disabled={isChatLoading} />
            <input 
              type="text" 
              value={chatInput} 
              onChange={(e) => setChatInput(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendLiveChat(chatInput)}
              placeholder="Ask AI about live feed..." 
              className="flex-1 bg-transparent text-sm p-2 outline-none"
              disabled={isChatLoading}
            />
            <button 
              onClick={() => sendLiveChat(chatInput)}
              disabled={isChatLoading || !chatInput.trim()}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--accent-cyan)] text-white disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Explainable AI Panel (History Feed) ── */}
      {analysisHistory.length > 0 && !isFullscreen && (
        <div className="w-full bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xl animate-fade-in relative z-20 flex flex-col max-h-[600px]">
          <div className="flex justify-between items-center mb-6 shrink-0 border-b border-[var(--border-color)] pb-4">
            <div>
              <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] gradient-text">Analysis History</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">Real-time object detection and contextual analysis feed</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAnalysisHistory([])} className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-bold hover:bg-[var(--accent-red)]/10 hover:text-[var(--accent-red)] hover:border-[var(--accent-red)]/30 transition-all">
                Clear History
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {analysisHistory.map((record) => (
              <div key={record.id} className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl p-5 hover:border-[var(--accent-cyan)]/30 transition-colors group">
                {record.is_chat ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-bold ${record.role === "ai" ? "text-[var(--accent-cyan)]" : "text-gray-400"}`}>
                        {record.role === "ai" ? "AERIOAI Copilot" : "You"}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">{record.timestamp}</span>
                    </div>
                    <p className={`text-sm ${record.role === "ai" ? "text-white" : "text-[var(--text-secondary)]"}`}>{record.summary}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md text-xs font-bold text-[var(--text-muted)]">
                          {record.timestamp}
                        </span>
                        <span className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[10px] font-bold uppercase tracking-widest">
                          {record.threat_level} Threat
                        </span>
                      </div>
                      <button 
                        onClick={() => router.push(`/chat?context=analysis&id=${record.id}`)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[var(--accent-cyan)]/10 to-[var(--accent-purple)]/10 hover:from-[var(--accent-cyan)] hover:to-[var(--accent-purple)] border border-[var(--accent-cyan)]/20 hover:border-transparent rounded-lg text-xs font-bold text-[var(--accent-cyan)] hover:text-white transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Ask AI
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase mb-2">Detected Objects</p>
                          <div className="flex flex-wrap gap-2">
                            {record.objects.map((obj: string, i: number) => (
                              <span key={i} className="px-2.5 py-1 bg-[var(--bg-primary)] border border-white/5 shadow-sm rounded-md text-xs font-medium text-[var(--text-primary)]">{obj}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase mb-1">Contextual Summary</p>
                          <p className="text-sm font-medium leading-relaxed text-[var(--text-secondary)]">{record.summary}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-[var(--text-muted)] font-bold tracking-widest uppercase mb-1">Tactical Recommendation</p>
                          <p className="text-sm text-[var(--accent-purple)] font-medium leading-relaxed">{record.tactical_recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom HUD Area (Below Video) ── */}
      {!isFullscreen && (
        <div className="w-full relative z-10 flex-shrink-0 mb-8 grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
          <div className="xl:col-span-2">
            <TelemetryOverlay
              telemetry={telemetry}
              gps={gps}
              attitude={attitude}
              battery={battery}
              droneStatus={null}
              isConnected={isConnected}
            />
          </div>
          <div className="xl:col-span-1 min-h-[300px]">
            <EmergencyAI />
          </div>
        </div>
      )}
    </div>
  );
}
