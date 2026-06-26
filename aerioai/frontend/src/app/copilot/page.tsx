"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "AERIOAI Voice & Chat Systems Online. How can I assist with your mission today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await api.sendChatMessage(userMessage) as any;
      setMessages(prev => [...prev, { role: "assistant", content: response.response }]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Connection to AERIOAI neural net lost. Operating in offline cache mode." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto w-full animate-fade-in relative">
      
      {/* Dynamic Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--accent-cyan)]/5 rounded-full blur-[100px] animate-pulse-glow" />
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-10 pt-4">
        <div className="w-16 h-16 mx-auto glass-pill flex items-center justify-center mb-4 border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] shadow-[0_0_30px_rgba(0,113,227,0.2)]">
          <span className="text-3xl animate-pulse">🧠</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Intelligence Copilot</h1>
        <p className="text-[var(--text-secondary)] font-medium mt-1">Natural Language Mission Interface</p>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto pr-4 mb-6 space-y-8 relative z-10 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-slide-up`} style={{ animationDelay: `${i * 0.05}s` }}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] flex flex-shrink-0 items-center justify-center text-sm mr-4 mt-1 border border-[var(--accent-cyan)]/30 shadow-[0_0_10px_rgba(0,113,227,0.2)]">
                A
              </div>
            )}
            
            <div className={`max-w-[80%] rounded-[2rem] px-6 py-4 shadow-md ${
              msg.role === "user" 
                ? "bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-tr-sm" 
                : "glass-panel rounded-tl-sm prose prose-sm dark:prose-invert max-w-none text-[var(--text-primary)] leading-relaxed"
            }`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              ) : (
                <p className="font-medium text-[15px]">{msg.content}</p>
              )}
            </div>
            
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-[var(--text-primary)] flex flex-shrink-0 items-center justify-center text-[var(--bg-primary)] text-sm ml-4 mt-1 font-bold">
                OP
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] flex flex-shrink-0 items-center justify-center text-sm mr-4 border border-[var(--accent-cyan)]/30">
              A
            </div>
            <div className="glass-panel rounded-[2rem] rounded-tl-sm px-6 py-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="relative z-10 pb-4">
        <form onSubmit={handleSend} className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AERIOAI to analyze footage, summarize logs, or alter mission parameters..."
            className="w-full glass-panel !rounded-full pl-6 pr-32 py-5 border-[var(--border-color)] focus:border-[var(--accent-cyan)] focus:shadow-[0_0_0_4px_rgba(0,113,227,0.15)] bg-[var(--bg-primary)]/80 dark:bg-black/80 font-medium text-[15px] outline-none transition-all"
            disabled={loading}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button 
              type="button"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              title="Voice Input"
            >
              🎙️
            </button>
            <button 
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-full bg-[var(--accent-cyan)] text-white flex items-center justify-center disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </form>
        <p className="text-center text-xs font-mono text-[var(--text-muted)] mt-4 tracking-wide uppercase">
          AERIOAI can make mistakes. Verify critical mission intelligence.
        </p>
      </div>
    </div>
  );
}
