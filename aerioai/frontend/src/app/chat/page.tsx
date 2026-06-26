"use client";

import { useState, useRef, useCallback, useEffect } from "react";

import ChatBubble from "@/components/chat/ChatBubble";
import VoiceButton from "@/components/chat/VoiceButton";
import api from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: Message[];
}

const SUGGESTED_PROMPTS = [
  "What do you see right now?",
  "Analyze the last photo",
  "Summarize today's activity",
  "How many vehicles were detected today?",
  "Is there anything unusual?",
  "Start a mission report",
];

const GLASS: React.CSSProperties = {
  background: "rgba(30,30,30,0.6)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

function now() {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "ai",
      content: "Hi! I'm your AERIOAI copilot. Ask me about what the drone sees, analyze photos, or query mission history.",
      timestamp: now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceResponses, setVoiceResponses] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => Date.now().toString());

  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await api.request<any[]>("/api/chat/history?context=ai_chat");
        if (history && history.length > 0) {
          // Group history by session_id (fallback to date for old messages)
          const groups: Record<string, { date: string, messages: Message[] }> = {};
          
          history.forEach(h => {
            const dateObj = new Date(h.created_at);
            const dateKey = dateObj.toLocaleDateString();
            const sid = h.session_id || `legacy-${dateKey}`;
            
            if (!groups[sid]) {
              groups[sid] = { date: dateKey, messages: [] };
            }
            groups[sid].messages.push({
              id: h.id.toString(),
              role: h.role,
              content: h.message,
              timestamp: dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })
            });
          });

          const loadedSessions: ChatSession[] = Object.keys(groups).map((sid, index) => {
            const firstUserMsg = groups[sid].messages.find(m => m.role === 'user');
            return {
              id: sid,
              title: firstUserMsg ? firstUserMsg.content.substring(0, 30) : `Session ${index + 1}`,
              date: groups[sid].date,
              messages: groups[sid].messages
            };
          }).reverse(); // Most recent sessions first

          setSessions(loadedSessions);
          
          // Start fresh or load the most recent session
          if (loadedSessions.length > 0) {
            setMessages(loadedSessions[0].messages);
            setCurrentSessionId(loadedSessions[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load history", err);
      }
    }
    loadHistory();
  }, []);

  const saveCurrentSession = async () => {
    if (messages.length > 1) {
      // The current session is already saved in the database under currentSessionId.
      // But we just want to clear the screen for a new chat!
      
      // Update local sidebar state if it's a new session
      const existingSession = sessions.find(s => s.id === currentSessionId);
      const title = messages.find(m => m.role === 'user')?.content.substring(0, 30) || "New Session";
      
      if (!existingSession) {
        const newSession: ChatSession = {
          id: currentSessionId,
          title,
          date: new Date().toLocaleDateString(),
          messages: [...messages]
        };
        setSessions([newSession, ...sessions]);
      } else {
        setSessions(sessions.map(s => s.id === currentSessionId ? { ...s, messages: [...messages], title } : s));
      }
      
      const newSid = Date.now().toString();
      setCurrentSessionId(newSid);
      setMessages([{ id: "0", role: "ai", content: "New session started.", timestamp: now() }]);
    }
  };

  const deleteSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
    if (currentSessionId === id) {
      setCurrentSessionId(Date.now().toString());
      setMessages([{ id: "0", role: "ai", content: "Talk to your drone copilot.", timestamp: now() }]);
    }
  };

  const loadSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(id);
      setMessages(session.messages);
      if (window.innerWidth < 1024) setIsHistoryOpen(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Detect if a query is asking about live/current camera feed
  const isLiveQuery = (text: string) => {
    const lower = text.toLowerCase();
    return /(what do you see|what.s happening|look now|see now|see right now|current|currently|live|right now|look at|camera now)/.test(lower);
  };

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || loading) return;
      const userMsg: Message = { id: Date.now().toString(), role: "user", content: text, timestamp: now() };
      setMessages((m) => [...m, userMsg]);
      setInput("");
      setLoading(true);

      try {
        // If it's a live query, pass live_stream=true so backend grabs current frame
        const useLive = isLiveQuery(text);
        const res = await api.sendChatMessage(text, undefined, undefined, useLive, voiceResponses, currentSessionId, "ai_chat") as any;
        const reply = res?.response || res?.message || "I couldn't process that. Please try again.";
        const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "ai", content: reply, timestamp: now() };
        setMessages((m) => [...m, aiMsg]);

        // Play ElevenLabs audio from backend if available
        if (voiceResponses && res?.audio_url) {
          const audio = new Audio(`http://localhost:8000${res.audio_url}?t=${Date.now()}`);
          audio.play().catch(e => console.error("Audio play failed", e));
        }
      } catch {
        setMessages((m) => [
          ...m,
          { id: (Date.now() + 1).toString(), role: "ai", content: "Connection error. Please try again.", timestamp: now() },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, voiceResponses, currentSessionId]
  );

  const handleVoice = useCallback(
    async (blob: Blob) => {
      setLoading(true);
      try {
        const res = await api.sendVoiceCommand(blob, undefined, false, currentSessionId, "ai_chat") as any;
        const transcript = res?.transcribed_text || res?.transcript || res?.text || "";
        const reply = res?.ai_response || res?.response || res?.message || "";
        if (transcript) {
          setMessages((m) => [...m, { id: Date.now().toString(), role: "user", content: transcript, timestamp: now() }]);
        }
        if (reply) {
          setMessages((m) => [...m, { id: (Date.now() + 1).toString(), role: "ai", content: reply, timestamp: now() }]);
          // Play ElevenLabs audio from backend
          if (res?.audio_url) {
            const audio = new Audio(`http://localhost:8000${res.audio_url}?t=${Date.now()}`);
            audio.play().catch(e => console.error("Audio play failed", e));
          }
        }
      } catch {
        setMessages((m) => [...m, { id: Date.now().toString(), role: "ai", content: "Could not process voice input.", timestamp: now() }]);
      } finally {
        setLoading(false);
      }
    },
    [voiceResponses, currentSessionId]
  );

  return (
    <div className="flex flex-row h-[calc(100vh-64px)] p-4 sm:p-6 gap-6 overflow-hidden">
      {/* Main Chat Column */}
      <div className="flex-1 flex flex-col h-full gap-4 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">AI Chat</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">Talk to your drone copilot</p>
        </div>

        <div className="flex gap-3">
          {/* Voice responses toggle */}
          <button
            onClick={() => setVoiceResponses(!voiceResponses)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              ...GLASS,
              color: voiceResponses ? "#0071E3" : "#8E8E93",
              border: voiceResponses ? "1px solid rgba(0,113,227,0.3)" : undefined,
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
            Voice Responses {voiceResponses ? "On" : "Off"}
          </button>

          {/* History Button */}
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:bg-[var(--text-primary)]/10"
            style={GLASS}
          >
            <svg className="w-4 h-4 text-[var(--text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </button>
        </div>
      </div>

      {/* Suggested prompts */}
      <div className="flex gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-hide">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => sendMessage(p)}
            disabled={loading}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 hover:opacity-80 active:scale-95 disabled:opacity-40 shrink-0 text-[var(--accent-cyan)]"
            style={GLASS}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto rounded-3xl p-5 space-y-4 min-h-0"
        style={GLASS}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0071E3] to-[#5E5CE6] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
              </svg>
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5" style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.5)" }}>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl shrink-0"
        style={GLASS}
      >
        <VoiceButton onRecord={handleVoice} disabled={loading} />

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Ask your copilot anything…"
          disabled={loading}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30"
          style={{
            background: "linear-gradient(135deg, #0071E3, #5E5CE6)",
          }}
        >
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
          </svg>
        </button>
      </div>
    </div>

      {/* History Side Panel */}
      {isHistoryOpen && (
        <div className="w-80 h-full bg-[var(--bg-secondary)] backdrop-blur-2xl border border-[var(--border-color)] rounded-2xl shadow-xl flex flex-col animate-fade-in shrink-0">
          <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
            <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">Chat History</h2>
            <button onClick={() => setIsHistoryOpen(false)} className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border-color)]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="p-4 border-b border-[var(--border-color)]">
            <button
              onClick={saveCurrentSession}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              + New Chat Session
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="bg-[var(--glass-bg)] border border-[var(--border-color)] rounded-xl p-3 flex justify-between group cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors">
                <div 
                  className="flex flex-col overflow-hidden pr-2 flex-1"
                  onClick={() => {
                    setMessages(session.messages);
                    // optionally do something else if needed
                  }}
                >
                  <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{session.title}</span>
                  <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest mt-1">{session.date}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                  className="text-[var(--accent-red)] opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-red)]/10 p-1.5 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] text-center mt-10">No history available.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
