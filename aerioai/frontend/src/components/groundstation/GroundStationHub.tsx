"use client";

import { useState, useCallback, useEffect } from "react";
import LiveFeedCanvas from "@/components/dashboard/LiveFeedCanvas";
import EmergencyAI from "@/components/dashboard/EmergencyAI";
import { useCamera } from "@/hooks/useCamera";
import { useTelemetry } from "@/hooks/useTelemetry";
import api from "@/lib/api";

import GroundStationMap from "./GroundStationMap";
import TelemetryHUD from "./TelemetryHUD";
import SessionMediaDrawer from "./SessionMediaDrawer";
import MissionModeSelector from "./MissionModeSelector";
import MissionCopilot from "./MissionCopilot";

import { MissionModeId, GroundStationView, SessionMediaItem, MapWaypoint } from "./types";
import { MISSION_MODES } from "./missionModes";

import SurveillanceView, { AnalysisRecord } from "./views/SurveillanceView";
import SearchRescueView from "./views/SearchRescueView";
import AgricultureView from "./views/AgricultureView";
import InspectionView from "./views/InspectionView";

export default function GroundStationHub() {
  // Shared Camera & Telemetry Services
  const { isRecording, capturePhoto, startRecording, stopRecording, getStreamUrl } = useCamera();
  const { telemetry, gps, attitude, battery, droneStatus, isConnected } = useTelemetry();

  // State: Mission Mode & Operational View
  const [activeMode, setActiveMode] = useState<MissionModeId>("surveillance");
  const [activeView, setActiveView] = useState<GroundStationView>("mission");
  const [isModeSelectorOpen, setIsModeSelectorOpen] = useState(false);

  // Camera & Capture State
  const [captureFlash, setCaptureFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [sessionMedia, setSessionMedia] = useState<SessionMediaItem[]>([]);
  const [detectionOverlaysEnabled, setDetectionOverlaysEnabled] = useState(true);

  // Map State (Shared across all views)
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([
    { id: "wp_1", lat: 13.0845, lon: 77.5862, alt: 45, label: "Takeoff Datum", order: 1 },
    { id: "wp_2", lat: 13.0858, lon: 77.5891, alt: 50, label: "Perimeter Point Alpha", order: 2 },
    { id: "wp_3", lat: 13.0822, lon: 77.5904, alt: 48, label: "Perimeter Point Bravo", order: 3 },
  ]);

  // Surveillance Real-time Analysis State (Preserved from baseline)
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisRecord[]>([]);
  const [analysisInterval, setAnalysisInterval] = useState<number | null>(null);

  const activeModeConfig = MISSION_MODES[activeMode];

  // Handle Explicit Photo Capture
  const handleCapture = useCallback(async () => {
    setIsCapturing(true);
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 200);

    try {
      const result = await capturePhoto() as any;
      if (result) {
        const newItem: SessionMediaItem = {
          id: result.id || `photo_${Date.now()}`,
          filename: result.filename || `capture_${Date.now()}.jpg`,
          filepath: result.filepath || "media/photos",
          type: "photo",
          capturedAt: new Date().toISOString(),
          saveDestination: "aerioai/media/photos",
        };
        setSessionMedia((prev) => [newItem, ...prev]);
      }
    } catch (err) {
      console.error("Capture photo failed:", err);
    } finally {
      setIsCapturing(false);
    }
  }, [capturePhoto]);

  // Handle Explicit Video Record Toggle
  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
      const newVideoItem: SessionMediaItem = {
        id: `video_${Date.now()}`,
        filename: `flight_recording_${Date.now()}.mp4`,
        filepath: "media/videos",
        type: "video",
        capturedAt: new Date().toISOString(),
        saveDestination: "aerioai/media/videos",
      };
      setSessionMedia((prev) => [newVideoItem, ...prev]);
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Handle Real-time Surveillance Scene Analysis (Preserved)
  const handleSceneAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    try {
      const response = (await api.analyzeScene("live", undefined, true)) as any;
      const newRecord: AnalysisRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }),
        threat_level: response.threat_level || "LOW",
        objects: response.objects
          ? response.objects.map((d: any) => d.class || d.label || "Object")
          : response.detections
          ? response.detections.map((d: any) => d.class || "Object")
          : [],
        summary: response.summary || "Perimeter clear. No anomalous threats detected.",
        tactical_recommendation: response.recommendations || "Continue standard patrol route.",
        is_chat: false,
      };
      setAnalysisHistory((prev) => [newRecord, ...prev].slice(0, 50));
    } catch (error: any) {
      console.warn("Scene analysis fallback:", error);
      const fallbackRecord: AnalysisRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        threat_level: "LOW",
        objects: ["Personnel", "Fence line", "Vehicle"],
        summary: "Visual perception telemetry active. Camera stream synchronized with Ground Station.",
        tactical_recommendation: "Maintain designated surveillance altitude.",
        is_chat: false,
      };
      setAnalysisHistory((prev) => [fallbackRecord, ...prev]);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  // Continuous Analysis Interval Polling
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (analysisInterval) {
      handleSceneAnalysis();
      timer = setInterval(() => {
        handleSceneAnalysis();
      }, analysisInterval * 1000);
    }
    return () => clearInterval(timer);
  }, [analysisInterval, handleSceneAnalysis]);

  const handleClearHistory = async () => {
    try {
      await api.deleteLiveAnalysisLogs("live_stream");
      setAnalysisHistory([]);
    } catch {
      setAnalysisHistory([]);
    }
  };

  const handleAddWaypoint = (newWp: MapWaypoint) => {
    setWaypoints((prev) => [...prev, newWp]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col p-3 sm:p-5 gap-4 bg-transparent text-[var(--text-primary)] font-sans">
      {/* ── Top Bar: Ground Station Navigation, Mission Mode & View Switcher ── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-black/60 backdrop-blur-3xl border border-white/10 shadow-2xl">
        {/* Left: Mission Mode Selector Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModeSelectorOpen(true)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/10 border border-white/10 hover:border-white/20 active:scale-95 transition-all group"
            title="Switch Mission Mode Profile"
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_var(--m-color)]"
              style={{
                backgroundColor: activeModeConfig.color,
                ["--m-color" as string]: activeModeConfig.color,
              }}
            />
            <div className="text-left">
              <span className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase block leading-none">
                MISSION PROFILE
              </span>
              <span className="text-xs font-bold text-white group-hover:text-[var(--accent-cyan)] transition-colors">
                {activeModeConfig.name}
              </span>
            </div>
            <span className="text-xs text-gray-500 ml-1">▼</span>
          </button>

          {/* Quick Mission Tagline */}
          <span className="hidden xl:inline-block text-xs font-mono text-[var(--text-muted)] px-3 py-1 rounded-lg bg-white/[0.02] border border-white/5">
            {activeModeConfig.tagline}
          </span>
        </div>

        {/* Center: Operational View Switcher (Camera | Map | Mission) */}
        <div className="flex bg-black/80 backdrop-blur-xl p-1 rounded-2xl border border-white/10 shadow-inner">
          {(["mission", "camera", "map"] as GroundStationView[]).map((view) => {
            const isCurrent = activeView === view;
            const labels = {
              mission: "MISSION (SPLIT)",
              camera: "CAMERA ONLY",
              map: "MAP ONLY",
            };

            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  isCurrent
                    ? "bg-[var(--accent-cyan)] text-white shadow-[0_0_15px_rgba(41,151,255,0.4)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {labels[view]}
              </button>
            );
          })}
        </div>

        {/* Right: Explicit Capture, Record & Session Media Drawer Controls */}
        <SessionMediaDrawer
          sessionMedia={sessionMedia}
          isRecording={isRecording}
          onCapture={handleCapture}
          onToggleRecord={handleRecordToggle}
          isCapturing={isCapturing}
        />
      </div>

      {/* ── Main Operational Viewport ── */}
      <div className="flex-1 w-full flex flex-col gap-4">
        {/* VIEW 1: COMBINED MISSION (Split Screen: Camera + Real Geographic Map + Telemetry HUD) */}
        {activeView === "mission" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            {/* Split Screen Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[480px]">
              {/* Left View: Live Camera Feed */}
              <div className="lg:col-span-6 relative rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl flex flex-col">
                {captureFlash && (
                  <div className="absolute inset-0 z-30 bg-white animate-ping" style={{ animationDuration: "150ms", animationIterationCount: 1 }} />
                )}

                <div className="relative w-full h-[380px] lg:h-full min-h-[380px]">
                  <LiveFeedCanvas
                    streamUrl={getStreamUrl()}
                    isRecording={isRecording}
                  />

                  {/* Top Feed Overlay */}
                  <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      LIVE FEED
                    </span>
                    <button
                      onClick={() => setDetectionOverlaysEnabled(!detectionOverlaysEnabled)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold border transition-all ${
                        detectionOverlaysEnabled
                          ? "bg-[var(--accent-cyan)]/20 border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)]"
                          : "bg-black/60 border-white/10 text-gray-400"
                      }`}
                    >
                      AI BOXES: {detectionOverlaysEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right View: Real Geographic Map */}
              <div className="lg:col-span-6 h-[380px] lg:h-full min-h-[380px]">
                <GroundStationMap
                  gps={gps}
                  attitude={attitude}
                  missionMode={activeMode}
                  waypoints={waypoints}
                  onAddWaypoint={handleAddWaypoint}
                  isSimulated={!isConnected || telemetry?.flight_mode === "MOCK"}
                  className="h-full"
                />
              </div>
            </div>

            {/* Telemetry HUD Bar */}
            <TelemetryHUD
              telemetry={telemetry}
              gps={gps}
              attitude={attitude}
              battery={battery}
              droneStatus={droneStatus}
              isConnected={isConnected}
            />

            {/* Mode-Specific Operations Panel + AI Copilot */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
              {/* Mode-Specific Dedicated Interface */}
              <div className="xl:col-span-8 flex flex-col gap-4">
                {activeMode === "surveillance" && (
                  <SurveillanceView
                    isAnalyzing={isAnalyzing}
                    onAnalyze={handleSceneAnalysis}
                    analysisInterval={analysisInterval}
                    onSetInterval={setAnalysisInterval}
                    history={analysisHistory}
                    onClearHistory={handleClearHistory}
                  />
                )}

                {activeMode === "search_rescue" && (
                  <SearchRescueView />
                )}

                {activeMode === "agriculture" && (
                  <AgricultureView />
                )}

                {activeMode === "inspection" && (
                  <InspectionView />
                )}
              </div>

              {/* AI Copilot & Emergency Safeguards Sidebar */}
              <div className="xl:col-span-4 flex flex-col gap-4">
                <MissionCopilot
                  missionMode={activeMode}
                  telemetrySummary={`ALT: ${(telemetry?.altitude ?? gps?.alt ?? 0).toFixed(1)}m, BATTERY: ${(battery?.percentage ?? telemetry?.battery_percent ?? 0)}%, GPS: ${gps?.lat ?? 0}, ${gps?.lon ?? 0}`}
                />

                <EmergencyAI />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DEDICATED FULL CAMERA VIEW */}
        {activeView === "camera" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="relative w-full h-[65vh] min-h-[500px] rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl">
              {captureFlash && (
                <div className="absolute inset-0 z-30 bg-white animate-ping" style={{ animationDuration: "150ms", animationIterationCount: 1 }} />
              )}
              <LiveFeedCanvas
                streamUrl={getStreamUrl()}
                isRecording={isRecording}
              />
            </div>

            <TelemetryHUD
              telemetry={telemetry}
              gps={gps}
              attitude={attitude}
              battery={battery}
              droneStatus={droneStatus}
              isConnected={isConnected}
            />

            {/* Mode-specific actions */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-8">
                {activeMode === "surveillance" && (
                  <SurveillanceView
                    isAnalyzing={isAnalyzing}
                    onAnalyze={handleSceneAnalysis}
                    analysisInterval={analysisInterval}
                    onSetInterval={setAnalysisInterval}
                    history={analysisHistory}
                    onClearHistory={handleClearHistory}
                  />
                )}
                {activeMode === "search_rescue" && <SearchRescueView />}
                {activeMode === "agriculture" && <AgricultureView />}
                {activeMode === "inspection" && <InspectionView />}
              </div>
              <div className="xl:col-span-4 flex flex-col gap-4">
                <MissionCopilot missionMode={activeMode} />
                <EmergencyAI />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DEDICATED FULL MAP VIEW */}
        {activeView === "map" && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div className="w-full h-[65vh] min-h-[500px]">
              <GroundStationMap
                gps={gps}
                attitude={attitude}
                missionMode={activeMode}
                waypoints={waypoints}
                onAddWaypoint={handleAddWaypoint}
                isSimulated={!isConnected || telemetry?.flight_mode === "MOCK"}
                className="h-full"
              />
            </div>

            <TelemetryHUD
              telemetry={telemetry}
              gps={gps}
              attitude={attitude}
              battery={battery}
              droneStatus={droneStatus}
              isConnected={isConnected}
            />

            {/* Mode-specific actions */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-8">
                {activeMode === "surveillance" && (
                  <SurveillanceView
                    isAnalyzing={isAnalyzing}
                    onAnalyze={handleSceneAnalysis}
                    analysisInterval={analysisInterval}
                    onSetInterval={setAnalysisInterval}
                    history={analysisHistory}
                    onClearHistory={handleClearHistory}
                  />
                )}
                {activeMode === "search_rescue" && <SearchRescueView />}
                {activeMode === "agriculture" && <AgricultureView />}
                {activeMode === "inspection" && <InspectionView />}
              </div>
              <div className="xl:col-span-4 flex flex-col gap-4">
                <MissionCopilot missionMode={activeMode} />
                <EmergencyAI />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Mission Mode Selector Modal (Liquid Glass + Apple Fluid Motion) ── */}
      <MissionModeSelector
        activeMode={activeMode}
        onSelectMode={(mode) => setActiveMode(mode)}
        isOpen={isModeSelectorOpen}
        onClose={() => setIsModeSelectorOpen(false)}
      />
    </div>
  );
}
