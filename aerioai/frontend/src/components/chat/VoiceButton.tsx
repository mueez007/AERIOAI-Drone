"use client";

import { useRef, useState, useCallback } from "react";

interface Props {
  onRecord: (blob: Blob) => void;
  disabled?: boolean;
}

export default function VoiceButton({ onRecord, disabled }: Props) {
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const startTimeRef = useRef<number>(0);
  const isHoldRef = useRef(false);

  const doStartRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    setRecording(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isRecordingRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const duration = Date.now() - startTimeRef.current;
        if (duration > 400 && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          onRecord(blob);
        }
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      startTimeRef.current = Date.now();
      mr.start(100); // collect data every 100ms for reliability
      mediaRef.current = mr;
    } catch {
      isRecordingRef.current = false;
      setRecording(false);
      console.error("Microphone access denied");
    }
  }, [onRecord]);

  const doStopRecording = useCallback(() => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    setRecording(false);
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    mediaRef.current = null;
  }, []);

  // Click toggles recording on/off
  const handleClick = useCallback(() => {
    if (isHoldRef.current) {
      // This click is the end of a hold, ignore
      isHoldRef.current = false;
      return;
    }
    if (isRecordingRef.current) {
      doStopRecording();
    } else {
      doStartRecording();
    }
  }, [doStartRecording, doStopRecording]);

  // Hold interaction: mousedown starts, mouseup stops
  const handleMouseDown = useCallback(() => {
    isHoldRef.current = false;
  }, []);

  const handleMouseUp = useCallback(() => {
    // If recording was already going when we pressed down,
    // and we held for a while, treat as hold-to-talk
    const held = Date.now() - startTimeRef.current;
    if (isRecordingRef.current && held > 300) {
      isHoldRef.current = true;
      doStopRecording();
    }
  }, [doStopRecording]);

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      disabled={disabled}
      className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40"
      style={{
        background: recording
          ? "linear-gradient(135deg, #FF3B30, #FF6B6B)"
          : "rgba(0,113,227,0.1)",
        boxShadow: recording ? "0 0 0 8px rgba(255,59,48,0.15)" : "none",
        transition: "all 200ms ease",
      }}
      aria-label={recording ? "Recording… click to stop" : "Click to record"}
      title={recording ? "Click to stop recording" : "Click to start recording"}
    >
      {/* Pulse ring while recording */}
      {recording && (
        <span className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30" />
      )}
      {recording ? (
        /* Stop icon (square) when recording */
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        /* Mic icon when idle */
        <svg
          className="w-4 h-4 text-[#0071E3]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
        </svg>
      )}
    </button>
  );
}
