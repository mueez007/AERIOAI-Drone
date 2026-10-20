"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import VoiceButton from "@/components/chat/VoiceButton";
import VoiceToggle from "@/components/dashboard/VoiceToggle";
import { MissionModeId } from "./types";
import { MISSION_MODES } from "./missionModes";
import api from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
}

interface ChatApiResponse {
  response?: string;
  message?: string;
  audio_url?: string;
  transcribed_text?: string;
  transcript?: string;
  text?: string;
  ai_response?: string;
}

interface MissionCopilotProps {
  missionMode: MissionModeId;
  telemetrySummary?: string;
  onAskAI?: (query: string) => void;
}

export default function MissionCopilot({
  missionMode,
  telemetrySummary,
}: MissionCopilotProps) {
  // Isolated conversation history per mission mode
  const [modeMessages, setModeMessages] = useState<Record<MissionModeId, Message[]>>({
    surveillance: [
      {
        id: "init_surv",
        role: "ai",
        text: "Tactical Copilot online for **Aerial Surveillance**. Perimeter security, camera tracking, and threat assessment active.",
        timestamp: "Ready",
      },
    ],
    search_rescue: [
      {
        id: "init_sar",
        role: "ai",
        text: "Tactical Copilot online for **Search & Rescue**. Thermal imaging, survivor distress markers, and search grid active.",
        timestamp: "Ready",
      },
    ],
    agriculture: [
      {
        id: "init_agri",
        role: "ai",
        text: "Tactical Copilot online for **Precision Agriculture**. Multispectral crop canopy and NDVI survey active.",
        timestamp: "Ready",
      },
    ],
    inspection: [
      {
        id: "init_insp",
        role: "ai",
        text: "Tactical Copilot online for **Infrastructure Inspection**. Structural micro-crack detection and standoff margins active.",
        timestamp: "Ready",
      },
    ],
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [pendingAudioUrl, setPendingAudioUrl] = useState<string | null>(null);

  const activeConfig = MISSION_MODES[missionMode];
  const messages = modeMessages[missionMode] || [];

  // Lifecycle Refs to prevent infinite loops and stale closures
  const recognitionRef = useRef<any>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const voiceEnabledRef = useRef<boolean>(false);
  const missionModeRef = useRef<MissionModeId>(missionMode);
  const announcedModesRef = useRef<Set<string>>(new Set());
  const handleSendRef = useRef<((text: string) => Promise<void>) | undefined>(undefined);

  missionModeRef.current = missionMode;
  voiceEnabledRef.current = voiceEnabled;

  // Speak response via ElevenLabs audio URL or Web Speech API fallback
  const speakTextOrAudio = useCallback(async (text: string, audioUrl?: string) => {
    if (!voiceEnabledRef.current) return;

    // Stop previous audio if playing
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    isSpeakingRef.current = true;
    setIsSpeaking(true);

    // Pause recognition during speech output to prevent acoustic loopback
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    if (audioUrl) {
      try {
        const audio = new Audio(api.getAudioUrl(audioUrl));
        activeAudioRef.current = audio;

        audio.onended = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          activeAudioRef.current = null;
          // Resume recognition if voice is still enabled
          if (voiceEnabledRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
        };

        await audio.play();
        setAudioBlocked(false);
        return;
      } catch (err: any) {
        if (err.name === "NotAllowedError" || err.message?.includes("autoplay")) {
          setAudioBlocked(true);
          setPendingAudioUrl(audioUrl);
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          return;
        }
      }
    }

    // Web Speech API Synthesis Fallback
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[*_#`[\]()]/g, "");
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        if (voiceEnabledRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
      };
      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setIsSpeaking(false);
        if (voiceEnabledRef.current && recognitionRef.current) {
          try { recognitionRef.current.start(); } catch {}
        }
      };

      window.speechSynthesis.speak(utterance);
    } else {
      isSpeakingRef.current = false;
      setIsSpeaking(false);
    }
  }, []);

  // Unlock audio when browser autoplay policy blocks initial sound
  const handleUnlockAudio = useCallback(() => {
    setAudioBlocked(false);
    if (pendingAudioUrl) {
      const audio = new Audio(api.getAudioUrl(pendingAudioUrl));
      activeAudioRef.current = audio;
      audio.play().then(() => {
        setPendingAudioUrl(null);
      }).catch(err => console.warn("Audio unlock failed:", err));
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.speak(new SpeechSynthesisUtterance("Intercom audio enabled."));
    }
  }, [pendingAudioUrl]);

  // Main Send Function (Mode-isolated session)
  const handleSend = useCallback(async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const currentMode = missionModeRef.current;
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setModeMessages((prev) => ({
      ...prev,
      [currentMode]: [userMsg, ...(prev[currentMode] || [])],
    }));
    setInput("");
    setLoading(true);

    try {
      const response = await api.sendChatMessage(
        textToSend.trim(),
        undefined,
        undefined,
        true,
        voiceEnabledRef.current,
        `gs_session_${currentMode}`,
        `groundstation_${currentMode}`,
        currentMode
      ) as unknown as ChatApiResponse;

      const aiText = response?.response || response?.message || "Tactical advisory acknowledged.";
      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: "ai",
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setModeMessages((prev) => ({
        ...prev,
        [currentMode]: [aiMsg, ...(prev[currentMode] || [])],
      }));

      if (voiceEnabledRef.current) {
        speakTextOrAudio(aiText, response?.audio_url);
      }
    } catch (error) {
      console.warn("Copilot query notice:", error);
      const errMsg: Message = {
        id: `err_${Date.now()}`,
        role: "ai",
        text: "Copilot notice: AI cloud services operating in offline mode. Telemetry and flight sensors remain active.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setModeMessages((prev) => ({
        ...prev,
        [currentMode]: [errMsg, ...(prev[currentMode] || [])],
      }));
    } finally {
      setLoading(false);
    }
  }, [loading, speakTextOrAudio]);

  handleSendRef.current = handleSend;

  // Single-fire Startup Announcement: Triggers ONLY on explicit voice toggle ON or mode switch (never on re-render)
  useEffect(() => {
    if (!voiceEnabled) return;

    // Check if this mode was already announced in this session
    if (announcedModesRef.current.has(missionMode)) return;

    announcedModesRef.current.add(missionMode);

    api.getStartupAnnouncement(missionMode).then((res: any) => {
      if (res?.text && voiceEnabledRef.current) {
        speakTextOrAudio(res.text, res.audio_url);
      }
    }).catch((e) => console.warn("Startup announcement check:", e));
  }, [voiceEnabled, missionMode, speakTextOrAudio]);

  // Continuous Hands-Free Speech Recognition Lifecycle
  useEffect(() => {
    let recognition: any = null;

    if (voiceEnabled) {
      const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        recognition = new SpeechRecognitionClass();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          if (isSpeakingRef.current || !voiceEnabledRef.current) return;

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const transcript = event.results[i][0].transcript.trim();
              if (transcript.length > 0) {
                handleSendRef.current?.(transcript);
              }
            }
          }
        };

        recognition.onerror = (event: any) => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            setIsListening(false);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          // Auto-restart loop only if voice is still active and assistant is not currently speaking
          if (voiceEnabledRef.current && !isSpeakingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (e) {
          console.warn("Recognition start notice:", e);
        }
      }
    } else {
      // Immediate clean teardown when Voice Intercom is disabled
      setIsListening(false);
      setIsSpeaking(false);
      isSpeakingRef.current = false;

      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    }

    return () => {
      if (recognition) {
        recognition.onend = null;
        try { recognition.stop(); } catch {}
      }
    };
  }, [voiceEnabled]);

  // Voice Push-To-Record (Audio Blob upload fallback)
  const handleVoiceRecord = async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size < 100) {
      console.warn("Audio recording empty");
      return;
    }

    const currentMode = missionModeRef.current;
    setLoading(true);

    try {
      const res = await api.sendVoiceCommand(
        audioBlob,
        undefined,
        true,
        `gs_session_${currentMode}`,
        `groundstation_${currentMode}`,
        currentMode
      ) as unknown as ChatApiResponse;

      const transcript = res?.transcribed_text || res?.transcript || res?.text || "Voice command captured";
      const reply = res?.ai_response || res?.response || res?.message || "Understood.";

      const userMsg: Message = {
        id: `v_u_${Date.now()}`,
        role: "user",
        text: transcript,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      const aiMsg: Message = {
        id: `v_ai_${Date.now()}`,
        role: "ai",
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setModeMessages((prev) => ({
        ...prev,
        [currentMode]: [aiMsg, userMsg, ...(prev[currentMode] || [])],
      }));

      if (voiceEnabledRef.current) {
        speakTextOrAudio(reply, res?.audio_url);
      }
    } catch (e: any) {
      console.warn("Voice command notice:", e);
      const detail = e?.message || "Could not transcribe audio";
      const noticeMsg: Message = {
        id: `v_err_${Date.now()}`,
        role: "ai",
        text: `Voice Input Notice: ${detail}. You can speak directly with Voice Intercom enabled or type below.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setModeMessages((prev) => ({
        ...prev,
        [currentMode]: [noticeMsg, ...(prev[currentMode] || [])],
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 p-4 shadow-xl flex flex-col gap-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: activeConfig.color }} />
          <h4 className="text-sm font-bold text-[var(--text-primary)]">AI Copilot</h4>
        </div>

        <div className="flex items-center gap-3">
          <VoiceToggle enabled={voiceEnabled} onChange={setVoiceEnabled} label="Voice Intercom" />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-mono text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Autoplay Blocked Recovery Banner */}
      {audioBlocked && (
        <button
          onClick={handleUnlockAudio}
          className="w-full p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 active:scale-98 transition-all flex items-center justify-between text-xs font-mono font-bold animate-pulse shadow-lg cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span>🔊</span>
            <span>AUDIO PLAYBACK BLOCKED BY BROWSER</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-500/40 text-white text-[10px]">
            CLICK TO UNMUTE →
          </span>
        </button>
      )}

      {/* Concise Assistant State Indicator */}
      {voiceEnabled && !audioBlocked && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] font-mono">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking
                  ? "bg-purple-400 animate-pulse"
                  : isListening
                  ? "bg-emerald-400 animate-ping"
                  : "bg-gray-400"
              }`}
            />
            <span
              className={
                isSpeaking
                  ? "text-purple-300 font-bold"
                  : isListening
                  ? "text-emerald-400 font-bold"
                  : "text-gray-400"
              }
            >
              {isSpeaking ? "SPEAKING RESPONSE" : isListening ? "LISTENING (SPEAK FREELY)" : "INTERCOM STANDBY"}
            </span>
          </div>
          <button
            onClick={() => setVoiceEnabled(false)}
            className="text-[10px] text-red-400 hover:underline cursor-pointer"
          >
            STOP
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className={`overflow-y-auto space-y-2.5 pr-1 custom-scrollbar transition-all duration-300 ${isExpanded ? "max-h-[360px]" : "max-h-[160px]"}`}>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl text-xs leading-relaxed flex flex-col gap-1 ${
              m.role === "ai"
                ? "bg-white/[0.04] border border-white/5 text-[var(--text-primary)]"
                : "bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/30 text-white ml-6"
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-mono opacity-60">
              <span>{m.role === "ai" ? "COPILOT" : "OPERATOR"}</span>
              <span>{m.timestamp}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.text}</p>
          </div>
        ))}

        {loading && (
          <div className="p-2.5 rounded-xl bg-white/[0.03] text-xs font-mono text-[var(--text-muted)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-ping" />
            <span>Processing query...</span>
          </div>
        )}
      </div>

      {/* Input & Voice Bar */}
      <div className="flex items-center gap-2 pt-1">
        <VoiceButton onRecord={handleVoiceRecord} disabled={loading} />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend(input)}
          placeholder={`Ask ${activeConfig.name.toLowerCase()} copilot...`}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[var(--accent-cyan)] transition-all font-mono"
          disabled={loading}
        />

        <button
          onClick={() => handleSend(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] hover:opacity-90 active:scale-95 text-white font-bold text-xs transition-all disabled:opacity-40"
        >
          SEND
        </button>
      </div>

      {/* Interlock Safety Line */}
      <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between pt-0.5">
        <span>Situational advisory only • No motor disarm</span>
        <span className="text-[var(--accent-green)] font-bold">GUARDED</span>
      </div>
    </div>
  );
}
