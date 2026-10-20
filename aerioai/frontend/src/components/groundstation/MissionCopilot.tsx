"use client";

import { useState, useEffect } from "react";
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeConfig = MISSION_MODES[missionMode];

  // Pre-seed greeting when mode changes
  useEffect(() => {
    const greeting: Message = {
      id: `init_${Date.now()}`,
      role: "ai",
      text: `Tactical Copilot online for **${activeConfig.name}**. Real-time telemetry and visual perception linked. Ask any situational or mission planning query.`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([greeting]);
  }, [missionMode]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Pass dynamic mission mode context to the existing chat backend
      const contextualQuery = `[Context: ${activeConfig.name}] ${textToSend.trim()} ${telemetrySummary ? `[Telemetry: ${telemetrySummary}]` : ""}`;
      const response = await api.sendChatMessage(
        contextualQuery,
        undefined,
        undefined,
        true,
        voiceEnabled,
        "live",
      ) as unknown as ChatApiResponse;

      const aiText = response?.response || response?.message || "Operational advisory received.";

      const aiMsg: Message = {
        id: `ai_${Date.now()}`,
        role: "ai",
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // If voice is enabled, play ElevenLabs audio stream if provided
      if (voiceEnabled && response?.audio_url) {
        new Audio(api.getAudioUrl(response.audio_url)).play().catch(() => {});
      }
    } catch (error) {
      console.error("Copilot query error:", error);
      const errMsg: Message = {
        id: `err_${Date.now()}`,
        role: "ai",
        text: "Copilot connection advisory: Backend AI service currently offline or running in mock mode. Real flight hardware controls remain locked.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceRecord = async (audioBlob: Blob) => {
    setLoading(true);
    try {
      const res = await api.sendVoiceCommand(
        audioBlob,
        undefined,
        true,
        "live",
        `groundstation_${missionMode}`
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

      setMessages((prev) => [...prev, userMsg, aiMsg]);

      if (res?.audio_url) {
        new Audio(api.getAudioUrl(res.audio_url)).play().catch(() => {});
      }
    } catch (e) {
      console.error("Voice command error:", e);
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
          <h4 className="text-sm font-bold text-[var(--text-primary)]">AI Mission Copilot</h4>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
            {activeConfig.shortName} Context
          </span>
        </div>

        <div className="flex items-center gap-3">
          <VoiceToggle enabled={voiceEnabled} onChange={setVoiceEnabled} label="Voice TTS" />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-mono text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

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
              <span>{m.role === "ai" ? "AERIOAI COPILOT" : "OPERATOR"}</span>
              <span>{m.timestamp}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.text}</p>
          </div>
        ))}

        {loading && (
          <div className="p-2.5 rounded-xl bg-white/[0.03] text-xs font-mono text-[var(--text-muted)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-ping" />
            <span>Analyzing tactical stream...</span>
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
          placeholder={`Query ${activeConfig.shortName.toLowerCase()} copilot...`}
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

      {/* Flight Safety Interlock Footer */}
      <div className="text-[10px] font-mono text-[var(--text-muted)] flex items-center justify-between pt-1">
        <span>SAFETY: Copilot provides situational awareness only; no direct motor disarm.</span>
        <span className="text-[var(--accent-green)]">GUARDED</span>
      </div>
    </div>
  );
}
