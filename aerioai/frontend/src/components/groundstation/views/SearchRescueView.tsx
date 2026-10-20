"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SARObservation,
  SARDetectorStatus,
  KMLValidationResponse,
  CoverageRouteResponse,
  PolygonCoordinate,
} from "@/types/api";
import api from "@/lib/api";

interface SearchRescueViewProps {
  observations?: SARObservation[];
  selectedObservationId?: string | null;
  onSelectObservation?: (obs: SARObservation) => void;
  onPolygonValidated?: (coords: PolygonCoordinate[]) => void;
  onRouteGenerated?: (route: CoverageRouteResponse | null) => void;
  detectorStatus?: SARDetectorStatus | null;
  isLiveTracking?: boolean;
  onToggleLiveTracking?: () => void;
  isHumanMaskEnabled?: boolean;
  maskStatus?: "off" | "loading" | "active" | "unavailable";
  onToggleHumanMask?: () => void;
}

export default function SearchRescueView({
  observations: externalObservations,
  selectedObservationId: externalSelectedId,
  onSelectObservation,
  onPolygonValidated,
  onRouteGenerated,
  detectorStatus: externalDetectorStatus,
  isLiveTracking: externalIsLiveTracking,
  onToggleLiveTracking: externalOnToggleLiveTracking,
  isHumanMaskEnabled: externalIsHumanMaskEnabled,
  maskStatus: externalMaskStatus,
  onToggleHumanMask: externalOnToggleHumanMask,
}: SearchRescueViewProps) {
  // Detector & Tracking System State
  const [localDetectorStatus, setLocalDetectorStatus] = useState<SARDetectorStatus | null>(null);
  const [localIsLiveTracking, setLocalIsLiveTracking] = useState(false);
  const [localObservations, setLocalObservations] = useState<SARObservation[]>([]);
  const [selectedObsId, setSelectedObsId] = useState<string | null>(externalSelectedId || null);

  // KML & Route Planning State
  const [kmlFile, setKmlFile] = useState<string | null>(null);
  const [kmlValidation, setKmlValidation] = useState<KMLValidationResponse | null>(null);
  const [isValidatingKML, setIsValidatingKML] = useState(false);
  const [kmlError, setKmlError] = useState<string | null>(null);

  // Survey Parameters
  const [gridSpacing, setGridSpacing] = useState(25); // meters
  const [flightAltitude, setFlightAltitude] = useState(40); // meters
  const [sweepAngle, setSweepAngle] = useState(0); // degrees
  const [boundaryMargin, setBoundaryMargin] = useState(3); // meters
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [coverageRoute, setCoverageRoute] = useState<CoverageRouteResponse | null>(null);

  // Test Image Inference State
  const [isTestingImage, setIsTestingImage] = useState(false);
  const [testInferenceMessage, setTestInferenceMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const testImageInputRef = useRef<HTMLInputElement>(null);

  const observations = externalObservations ?? localObservations;
  const activeSelectedId = externalSelectedId ?? selectedObsId;
  const detectorStatus = externalDetectorStatus ?? localDetectorStatus;
  const isLiveTracking = externalIsLiveTracking ?? localIsLiveTracking;
  const isHumanMaskEnabled = externalIsHumanMaskEnabled ?? detectorStatus?.is_mask_enabled ?? false;
  const maskStatus = externalMaskStatus ?? detectorStatus?.mask_status ?? "off";

  // Poll detector status & observations
  const fetchStatusAndObservations = useCallback(async () => {
    try {
      if (!externalDetectorStatus) {
        const status = await api.getSARStatus();
        setLocalDetectorStatus(status);
        setLocalIsLiveTracking(status.is_live_tracking_active);
      }

      if (!externalObservations) {
        const obsList = await api.getSARObservations();
        setLocalObservations(obsList);
      }
    } catch (err) {
      console.warn("[SAR] Status poll warning:", err);
    }
  }, [externalDetectorStatus, externalObservations]);

  useEffect(() => {
    fetchStatusAndObservations();
    const interval = setInterval(fetchStatusAndObservations, 2500);
    return () => clearInterval(interval);
  }, [fetchStatusAndObservations]);

  // Sync external selection
  useEffect(() => {
    if (externalSelectedId !== undefined) {
      setSelectedObsId(externalSelectedId);
    }
  }, [externalSelectedId]);

  // Handle KML File Upload & Validation
  const handleKmlUpload = async (file: File) => {
    setKmlFile(file.name);
    setIsValidatingKML(true);
    setKmlError(null);

    try {
      const res = await api.validateKML(file);
      setKmlValidation(res);
      if (res.is_valid && res.coordinates) {
        onPolygonValidated?.(res.coordinates);
      }
    } catch (err: any) {
      console.error("[SAR] KML validation error:", err);
      setKmlError(err.message || "Failed to validate KML polygon geometry.");
      setKmlValidation(null);
    } finally {
      setIsValidatingKML(false);
    }
  };

  // Generate Lawnmower Route
  const handleGenerateRoute = async () => {
    if (!kmlValidation || !kmlValidation.is_valid || !kmlValidation.coordinates) {
      setKmlError("Please import and validate a search perimeter polygon first.");
      return;
    }

    setIsGeneratingRoute(true);
    setKmlError(null);

    try {
      const res = await api.generateCoverageRoute({
        polygon: kmlValidation.coordinates,
        track_spacing_m: gridSpacing,
        flight_altitude_m: flightAltitude,
        sweep_angle_deg: sweepAngle,
        boundary_margin_m: boundaryMargin,
        drone_speed_mps: 5.0,
      });

      setCoverageRoute(res);
      onRouteGenerated?.(res);
    } catch (err: any) {
      console.error("[SAR] Route generation error:", err);
      setKmlError(err.message || "Route generation failed.");
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  // Toggle Live Tracking Worker
  const handleToggleLiveTracking = async () => {
    if (externalOnToggleLiveTracking) {
      externalOnToggleLiveTracking();
      return;
    }
    const nextAction = isLiveTracking ? "stop" : "start";
    try {
      await api.toggleSARLiveTracking(nextAction, 3.0);
      setLocalIsLiveTracking(!isLiveTracking);
      fetchStatusAndObservations();
    } catch (err) {
      console.error("[SAR] Toggle tracking error:", err);
    }
  };

  // Toggle Human Segmentation Mask
  const handleToggleHumanMask = async () => {
    if (externalOnToggleHumanMask) {
      externalOnToggleHumanMask();
      return;
    }
    const nextAction = isHumanMaskEnabled ? "off" : "on";
    try {
      await api.toggleSARMask(nextAction);
      fetchStatusAndObservations();
    } catch (err) {
      console.error("[SAR] Toggle mask error:", err);
    }
  };

  // Run Test Image Inference
  const handleTestImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsTestingImage(true);
    setTestInferenceMessage(`Running YOLO inference on ${file.name}...`);

    try {
      const obs = await api.runSARDetect(file, 0.25, true);
      setTestInferenceMessage(
        obs.length > 0
          ? `Detected ${obs.length} person(s) in test frame.`
          : "No persons detected in test frame."
      );
      fetchStatusAndObservations();
    } catch (err: any) {
      setTestInferenceMessage(`Test inference failed: ${err.message || err}`);
    } finally {
      setIsTestingImage(false);
      if (testImageInputRef.current) {
        testImageInputRef.current.value = "";
      }
    }
  };

  // Clear Observation Store
  const handleClearObservations = async () => {
    try {
      await api.clearSARObservations();
      setLocalObservations([]);
      setSelectedObsId(null);
    } catch (err) {
      console.error("[SAR] Clear observations error:", err);
    }
  };

  const handleSelectCard = (obs: SARObservation) => {
    setSelectedObsId(obs.observation_id);
    onSelectObservation?.(obs);
  };

  return (
    <div className="flex flex-col gap-5 w-full font-sans text-[var(--text-primary)]">
      {/* ── Status Banner (Limitation Transparency & Model Specs) ── */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs font-mono shadow-lg backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              detectorStatus?.status === "ready" || detectorStatus?.status === "running"
                ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                : "bg-amber-400 animate-pulse"
            }`}
          />
          <div>
            <div className="font-bold tracking-wide flex items-center gap-2 text-white">
              <span>{detectorStatus?.model_version || "Ultralytics YOLO (Pretrained COCO)"}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-[var(--accent-cyan)] font-mono">
                {detectorStatus?.status.toUpperCase() || "INITIALIZING"}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Class: <b>person (id: 0)</b> • Tracker: <b>ByteTrack</b> • Cadence:{" "}
              <b>{detectorStatus?.inference_fps || 0} FPS ({detectorStatus?.mean_inference_ms || 0}ms)</b>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            AUTONOMOUS FLIGHT DISABLED (PREVIEW ONLY)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Left Column: Search Area & Coverage-Route Configuration ── */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold flex items-center gap-2">
                <span>🛰️</span> KML Perimeter & Lawnmower Route Planner
              </h4>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-gray-300">
                SWATH: {gridSpacing}M
              </span>
            </div>

            {/* KML / GeoJSON File Upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-xl bg-black/40 border border-dashed border-white/20 hover:border-[var(--accent-cyan)] transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 relative group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".kml,.geojson,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleKmlUpload(f);
                }}
                className="hidden"
              />
              <span className="text-2xl group-hover:scale-110 transition-transform">📥</span>
              <div className="text-xs font-bold text-[var(--accent-cyan)]">
                {kmlFile ? `Loaded: ${kmlFile}` : "Import KML / GeoJSON Incident Boundary"}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] font-mono">
                Click to browse or drag and drop polygon perimeter
              </p>
            </div>

            {/* KML Validation Output Feedback */}
            {isValidatingKML && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-[var(--accent-cyan)] animate-pulse flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-cyan)]" />
                Validating KML polygon geometry and ring topology...
              </div>
            )}

            {kmlValidation && kmlValidation.is_valid && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-300 flex flex-col gap-1.5">
                <div className="flex items-center justify-between font-bold">
                  <span>✓ SEARCH PERIMETER VALIDATED</span>
                  <span>{kmlValidation.coordinates.length} VERTICES</span>
                </div>
                <div className="flex gap-4 text-[11px] text-gray-300">
                  <span>Area: <b>{kmlValidation.area_sq_meters.toLocaleString()} m²</b></span>
                  <span>Perimeter: <b>{kmlValidation.perimeter_meters.toLocaleString()} m</b></span>
                </div>
                {kmlValidation.warnings.length > 0 && (
                  <div className="text-[10px] text-amber-400 mt-1">
                    Notice: {kmlValidation.warnings.join("; ")}
                  </div>
                )}
              </div>
            )}

            {kmlError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-mono text-red-400">
                Error: {kmlError}
              </div>
            )}

            {/* Survey Configuration Parameters */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Flight Altitude */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">FLIGHT ALTITUDE (AGL)</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-bold font-mono text-[var(--accent-cyan)]">{flightAltitude}m</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFlightAltitude(Math.max(15, flightAltitude - 5))}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setFlightAltitude(Math.min(120, flightAltitude + 5))}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Track Spacing */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">LANE SPACING (SWATH)</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-lg font-bold font-mono text-[var(--accent-cyan)]">{gridSpacing}m</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setGridSpacing(Math.max(10, gridSpacing - 5))}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setGridSpacing(Math.min(80, gridSpacing + 5))}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Sweep Angle */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">SWEEP HEADING</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold font-mono text-white">
                    {sweepAngle}° ({sweepAngle === 0 ? "N-S" : sweepAngle === 90 ? "E-W" : `${sweepAngle}°`})
                  </span>
                  <select
                    value={sweepAngle}
                    onChange={(e) => setSweepAngle(Number(e.target.value))}
                    className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-xs font-mono text-[var(--accent-cyan)]"
                  >
                    <option value={0}>0° (N-S)</option>
                    <option value={45}>45° (NE-SW)</option>
                    <option value={90}>90° (E-W)</option>
                    <option value={135}>135° (SE-NW)</option>
                  </select>
                </div>
              </div>

              {/* Boundary Margin */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/5">
                <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">SAFETY MARGIN</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold font-mono text-white">{boundaryMargin}m</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setBoundaryMargin(Math.max(0, boundaryMargin - 1))}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono"
                    >
                      -
                    </button>
                    <button
                      onClick={() => setBoundaryMargin(Math.min(20, boundaryMargin + 1))}
                      className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-xs font-mono"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action: Generate Lawnmower Route */}
            <button
              onClick={handleGenerateRoute}
              disabled={isGeneratingRoute || !kmlValidation?.is_valid}
              className={`w-full py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                kmlValidation?.is_valid
                  ? "bg-gradient-to-r from-red-600 to-amber-600 text-white hover:brightness-110 shadow-[0_0_15px_rgba(239,68,68,0.3)] cursor-pointer"
                  : "bg-white/5 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isGeneratingRoute ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  COMPUTING OPTIMAL COVERAGE PATH...
                </>
              ) : (
                <>GENERATE LAWNMOWER COVERAGE ROUTE →</>
              )}
            </button>

            {/* Route Summary Card */}
            {coverageRoute && coverageRoute.is_generated && (
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between text-white font-bold border-b border-white/10 pb-2">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span>🚩</span> ROUTE READY ({coverageRoute.waypoints.length} WAYPOINTS)
                  </span>
                  <span className="text-emerald-400">
                    ~{Math.round(coverageRoute.estimated_flight_seconds / 60)} MIN FLIGHT
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px] text-[var(--text-muted)] pt-1">
                  <div>Distance: <b className="text-white">{coverageRoute.total_distance_m.toLocaleString()}m</b></div>
                  <div>Turns: <b className="text-white">{coverageRoute.turn_count}</b></div>
                  <div>Altitude: <b className="text-white">{coverageRoute.flight_altitude_m}m</b></div>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Route preview rendered on map. Autonomous mission dispatch reserved for Phase 2.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Person Observations & Triage ── */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h4 className="text-sm font-bold flex items-center gap-2">
                  <span>🚨</span> Person Observation Triage (ByteTrack)
                </h4>
                <p className="text-xs text-[var(--text-muted)] font-mono">
                  Ground-plane projected coordinates & stable tracking IDs
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 font-mono text-xs font-bold">
                {observations.length} OBSERVATION{observations.length === 1 ? "" : "S"}
              </span>
            </div>

            {/* Inference & Tracking Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-black/30 border border-white/5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleToggleLiveTracking}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isLiveTracking
                      ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLiveTracking ? "bg-red-400 animate-ping" : "bg-emerald-400"
                    }`}
                  />
                  {isLiveTracking ? "STOP LIVE TRACKING" : "START LIVE TRACKING"}
                </button>

                {/* Human Masking Toggle */}
                <button
                  onClick={handleToggleHumanMask}
                  disabled={maskStatus === "unavailable"}
                  title={
                    maskStatus === "unavailable"
                      ? "Pretrained instance segmentation model unavailable"
                      : isHumanMaskEnabled
                      ? "Click to Hide Human Silhouette Mask"
                      : "Click to Display Human Silhouette Mask"
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    maskStatus === "active"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
                      : maskStatus === "loading"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-wait"
                      : maskStatus === "unavailable"
                      ? "bg-black/40 border-white/5 text-gray-600 cursor-not-allowed opacity-60"
                      : "bg-white/10 hover:bg-white/20 text-gray-300 border border-white/10 cursor-pointer"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      maskStatus === "active"
                        ? "bg-emerald-400 shadow-[0_0_6px_#34d399]"
                        : maskStatus === "loading"
                        ? "bg-amber-400 animate-ping"
                        : "bg-gray-500"
                    }`}
                  />
                  {maskStatus === "active"
                    ? "HUMAN MASK: ON"
                    : maskStatus === "loading"
                    ? "MASK LOADING..."
                    : maskStatus === "unavailable"
                    ? "MASK UNAVAILABLE"
                    : "HUMAN MASK: OFF"}
                </button>

                {/* Upload Test Image */}
                <input
                  ref={testImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleTestImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => testImageInputRef.current?.click()}
                  disabled={isTestingImage}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-mono text-gray-300 transition-all cursor-pointer"
                >
                  {isTestingImage ? "TESTING..." : "TEST IMAGE"}
                </button>
              </div>

              {observations.length > 0 && (
                <button
                  onClick={handleClearObservations}
                  className="text-[11px] font-mono text-gray-400 hover:text-red-400 transition-colors"
                >
                  CLEAR ALL
                </button>
              )}
            </div>

            {testInferenceMessage && (
              <div className="text-[11px] font-mono text-[var(--accent-cyan)] p-2 rounded bg-black/40 border border-white/5">
                {testInferenceMessage}
              </div>
            )}

            {/* Observation Cards List */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1 custom-scrollbar">
              {observations.length === 0 ? (
                /* Proper honest empty state */
                <div className="p-8 rounded-xl bg-black/20 border border-white/5 flex flex-col items-center justify-center text-center gap-2 text-[var(--text-muted)] font-mono">
                  <span className="text-3xl opacity-40">👤</span>
                  <div className="text-xs font-bold text-gray-300">NO PERSON OBSERVATIONS ACTIVE</div>
                  <p className="text-[11px] max-w-[280px]">
                    Detector ready. Start live camera tracking or test with an image to triage person detections.
                  </p>
                </div>
              ) : (
                observations.map((obs) => {
                  const isSelected = activeSelectedId === obs.observation_id;
                  const hasValidCoords =
                    typeof obs.latitude === "number" &&
                    typeof obs.longitude === "number" &&
                    !isNaN(obs.latitude) &&
                    !isNaN(obs.longitude);

                  return (
                    <div
                      key={obs.observation_id}
                      onClick={() => handleSelectCard(obs)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                        isSelected
                          ? "bg-red-500/15 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                          : "bg-white/[0.03] border-white/10 hover:border-white/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white tracking-wide">
                            {obs.label}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {obs.observation_id.slice(0, 14)}...
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {obs.track_id !== null && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white">
                              TRACK #{obs.track_id}
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              obs.observation_status === "tracking"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : obs.observation_status === "stale"
                                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                : "bg-red-500/20 text-red-300 border border-red-500/40"
                            }`}
                          >
                            {obs.observation_status}
                          </span>
                        </div>
                      </div>

                      {/* Confidence & Timing */}
                      <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                        <span>
                          Confidence:{" "}
                          <b className="text-white">
                            {Math.round(obs.detection_confidence * 100)}%
                          </b>
                        </span>
                        <span>
                          Seen: <b>{obs.last_seen_at}</b>
                        </span>
                      </div>

                      {/* Geographic Location Status */}
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 font-mono text-[11px] flex flex-col gap-1">
                        {hasValidCoords ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[var(--text-muted)]">ESTIMATED GPS:</span>
                              <span className="text-[var(--accent-cyan)] font-bold">
                                {obs.latitude!.toFixed(6)}°N, {obs.longitude!.toFixed(6)}°E
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                              <span>
                                ACCURACY:{" "}
                                <b className="text-emerald-400">
                                  {obs.location_uncertainty_m
                                    ? `±${obs.location_uncertainty_m.toFixed(1)}m`
                                    : "UNVERIFIED"}
                                </b>
                              </span>
                              <span>METHOD: {obs.location_method}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-amber-400/90 text-[10px]">
                            ⚠️ Location Unavailable: Missing drone telemetry or uncalibrated camera
                            attitude.
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Source & Interactive Map Prompt */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] font-mono text-[var(--text-muted)]">
                        <span className="capitalize text-[10px]">
                          Source: {obs.source_type.replace(/_/g, " ")}
                        </span>
                        {hasValidCoords ? (
                          <span className="text-[var(--accent-cyan)] font-bold hover:underline">
                            SHOW ON MAP →
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px]">NO MAP POSITION</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
