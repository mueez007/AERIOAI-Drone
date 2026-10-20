"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GPSData, AttitudeData } from "@/types/api";
import { MissionModeId, MapWaypoint, SurvivorTarget } from "./types";
import api from "@/lib/api";

interface GroundStationMapInnerProps {
  gps: GPSData | null;
  attitude: AttitudeData | null;
  missionMode: MissionModeId;
  waypoints?: MapWaypoint[];
  onAddWaypoint?: (wp: MapWaypoint) => void;
  survivors?: SurvivorTarget[];
  className?: string;
  isSimulated?: boolean;
}

const TILE_SERVERS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 20,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, Earthstar Geographics',
    subdomains: "",
    maxZoom: 19,
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: "abc",
    maxZoom: 19,
  },
};

export default function GroundStationMapInner({
  gps,
  attitude,
  missionMode,
  waypoints = [],
  onAddWaypoint,
  survivors = [],
  className = "",
  isSimulated = true,
}: GroundStationMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const droneMarkerRef = useRef<L.Marker | null>(null);
  const breadcrumbPolylineRef = useRef<L.Polyline | null>(null);
  const modeLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const waypointsLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activeLayer, setActiveLayer] = useState<"dark" | "satellite" | "streets">("dark");
  const [breadcrumbs, setBreadcrumbs] = useState<[number, number][]>([]);
  const [autoCenter, setAutoCenter] = useState(true);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Validate GPS position truthfulness
  const hasValidGps = Boolean(
    gps &&
    typeof gps.lat === "number" &&
    typeof gps.lon === "number" &&
    !isNaN(gps.lat) &&
    !isNaN(gps.lon) &&
    !(gps.lat === 0 && gps.lon === 0) &&
    (gps.satellites ?? 0) >= 4
  );

  // If GPS is genuinely valid, use it. If simulated mode is active, use simulated coordinates.
  // Otherwise, default to center datum without claiming it is the drone.
  const droneLat = hasValidGps ? gps!.lat : (isSimulated && gps?.lat && gps.lat !== 0 ? gps.lat : 13.0827);
  const droneLon = hasValidGps ? gps!.lon : (isSimulated && gps?.lon && gps.lon !== 0 ? gps.lon : 77.5877);
  const droneAlt = gps?.alt ?? 0;
  const droneHeading = attitude?.heading ?? gps?.heading ?? 0;

  // Fetch server trajectory history on mount
  useEffect(() => {
    api.getTrajectory().then((res) => {
      if (res && res.points && res.points.length > 0) {
        const points = res.points
          .filter(p => p.lat && p.lon && !(p.lat === 0 && p.lon === 0))
          .map(p => [p.lat, p.lon] as [number, number]);
        if (points.length > 0) {
          setBreadcrumbs(points);
          if (breadcrumbPolylineRef.current) {
            breadcrumbPolylineRef.current.setLatLngs(points);
          }
        }
      }
    }).catch((err) => {
      console.warn("Telemetry trajectory fetch error:", err);
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [droneLat, droneLon],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // Tile layer
    const initialTileConfig = TILE_SERVERS[activeLayer];
    const tileLayer = L.tileLayer(initialTileConfig.url, {
      attribution: initialTileConfig.attribution,
      subdomains: initialTileConfig.subdomains,
      maxZoom: initialTileConfig.maxZoom,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Breadcrumbs polyline (Cyan for hardware, Amber for simulated)
    const polyline = L.polyline([], {
      color: isSimulated ? "#ff9f0a" : "#2997ff",
      weight: 3,
      opacity: 0.85,
      dashArray: isSimulated ? "6, 8" : undefined,
    }).addTo(map);
    breadcrumbPolylineRef.current = polyline;

    // Layer groups
    modeLayerGroupRef.current = L.layerGroup().addTo(map);
    waypointsLayerGroupRef.current = L.layerGroup().addTo(map);

    // Track mouse coordinates
    map.on("mousemove", (e: L.LeafletMouseEvent) => {
      setCursorCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
    });

    // Click to add waypoint
    map.on("click", (e: L.LeafletMouseEvent) => {
      if (onAddWaypoint) {
        onAddWaypoint({
          id: `wp_${Date.now()}`,
          lat: e.latlng.lat,
          lon: e.latlng.lng,
          alt: Math.round(droneAlt > 10 ? droneAlt : 50),
          label: `WP ${waypoints.length + 1}`,
          order: waypoints.length + 1,
        });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // Run once on mount

  // Change Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const config = TILE_SERVERS[activeLayer];
    tileLayerRef.current.setUrl(config.url);
  }, [activeLayer]);

  // Update Drone Marker & Heading
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // If hardware is not simulated and GPS is invalid, do not plot fake location
    if (!hasValidGps && !isSimulated) {
      if (droneMarkerRef.current) {
        map.removeLayer(droneMarkerRef.current);
        droneMarkerRef.current = null;
      }
      return;
    }

    const markerColor = isSimulated ? "#ff9f0a" : "#2997ff";
    const droneIconHtml = `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing radar wave -->
        <div style="position: absolute; inset: 0; border-radius: 50%; background: ${isSimulated ? 'rgba(255, 159, 10, 0.25)' : 'rgba(41, 151, 255, 0.25)'}; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <!-- Outer Halo -->
        <div style="position: absolute; inset: 4px; border-radius: 50%; background: rgba(10, 10, 15, 0.85); border: 2px solid ${markerColor}; box-shadow: 0 0 16px ${markerColor}; display: flex; align-items: center; justify-content: center;">
          <!-- Heading Arrow -->
          <div style="transform: rotate(${droneHeading}deg); transition: transform 0.3s ease; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <polygon points="12 2 19 21 12 17 5 21" fill="${markerColor}" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
      </div>
    `;

    const droneIcon = L.divIcon({
      html: droneIconHtml,
      className: "drone-map-marker",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const tooltipLabel = isSimulated
      ? `<b>AERIO-1 [SIMULATED]</b><br/>Alt: ${droneAlt.toFixed(1)}m<br/>Hdg: ${Math.round(droneHeading)}°`
      : `<b>AERIO-1 [LIVE FC]</b><br/>Alt: ${droneAlt.toFixed(1)}m<br/>Hdg: ${Math.round(droneHeading)}°`;

    if (!droneMarkerRef.current) {
      const marker = L.marker([droneLat, droneLon], { icon: droneIcon }).addTo(map);
      marker.bindTooltip(tooltipLabel, {
        direction: "top",
        offset: [0, -20],
        className: "drone-marker-tooltip",
      });
      droneMarkerRef.current = marker;
    } else {
      droneMarkerRef.current.setLatLng([droneLat, droneLon]);
      droneMarkerRef.current.setIcon(droneIcon);
      droneMarkerRef.current.setTooltipContent(tooltipLabel);
    }

    // Only append valid position updates to breadcrumbs
    if (hasValidGps || isSimulated) {
      setBreadcrumbs((prev) => {
        const last = prev[prev.length - 1];
        if (!last || Math.abs(last[0] - droneLat) > 0.00005 || Math.abs(last[1] - droneLon) > 0.00005) {
          const next = [...prev, [droneLat, droneLon] as [number, number]].slice(-300);
          if (breadcrumbPolylineRef.current) {
            breadcrumbPolylineRef.current.setLatLngs(next);
          }
          return next;
        }
        return prev;
      });
    }

    if (autoCenter) {
      map.panTo([droneLat, droneLon], { animate: true, duration: 0.5 });
    }
  }, [droneLat, droneLon, droneAlt, droneHeading, autoCenter, hasValidGps, isSimulated]);

  // Render Mission Mode Overlays (SAR search patterns, Field Boundaries, Inspection asset orbit, etc.)
  useEffect(() => {
    if (!modeLayerGroupRef.current) return;
    const group = modeLayerGroupRef.current;
    group.clearLayers();

    const centerLat = droneLat;
    const centerLon = droneLon;

    if (missionMode === "surveillance") {
      // Tactical Security Perimeter Box around drone
      const delta = 0.003;
      const perimeter = L.polygon(
        [
          [centerLat + delta, centerLon - delta * 1.5],
          [centerLat + delta, centerLon + delta * 1.5],
          [centerLat - delta, centerLon + delta * 1.5],
          [centerLat - delta, centerLon - delta * 1.5],
        ],
        {
          color: "#2997ff",
          weight: 2,
          fillColor: "#2997ff",
          fillOpacity: 0.08,
          dashArray: "4, 6",
        }
      );
      perimeter.bindTooltip("SURVEILLANCE SECTOR ALPHA", { permanent: false, direction: "center" });
      group.addLayer(perimeter);
    } else if (missionMode === "search_rescue") {
      // Search & Rescue: Lawnmower Search Pattern & Survivor Markers
      const delta = 0.004;
      const step = delta / 4;
      const gridPoints: [number, number][] = [];
      for (let i = 0; i <= 4; i++) {
        const lat = centerLat - delta / 2 + i * step;
        if (i % 2 === 0) {
          gridPoints.push([lat, centerLon - delta]);
          gridPoints.push([lat, centerLon + delta]);
        } else {
          gridPoints.push([lat, centerLon + delta]);
          gridPoints.push([lat, centerLon - delta]);
        }
      }

      const searchGrid = L.polyline(gridPoints, {
        color: "#ff453a",
        weight: 2.5,
        opacity: 0.8,
        dashArray: "5, 5",
      });
      searchGrid.bindTooltip("SAR COVERAGE ROUTE (LAWNMOWER)", { permanent: false });
      group.addLayer(searchGrid);

      // Survivor location markers
      const sarTargets: SurvivorTarget[] = survivors.length > 0 ? survivors : [
        {
          id: "sar_1",
          label: "SURVIVOR SIGHTING #1",
          lat: centerLat + 0.0015,
          lon: centerLon + 0.002,
          sightedAt: "10:14 AM",
          triage: "critical",
          detectedBy: "Thermal Infrared",
          confidence: 0.94,
          notes: "Human heat signature detected beneath tree canopy.",
        },
        {
          id: "sar_2",
          label: "DEBRIS / DISTRESS BEACON",
          lat: centerLat - 0.0012,
          lon: centerLon - 0.0022,
          sightedAt: "10:22 AM",
          triage: "moderate",
          detectedBy: "Visual Optical",
          confidence: 0.87,
          notes: "Reflective orange emergency tarp spotted.",
        },
      ];

      sarTargets.forEach((target) => {
        const markerColor = target.triage === "critical" ? "#ff453a" : "#ffd60a";
        const survivorIcon = L.divIcon({
          html: `
            <div style="background: ${markerColor}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${markerColor};">
              <span style="font-size: 14px; font-weight: bold; color: white;">!</span>
            </div>
          `,
          className: "sar-survivor-icon",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const targetMarker = L.marker([target.lat, target.lon], { icon: survivorIcon });
        targetMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #111;">
            <b style="color: ${markerColor}; font-size: 13px;">${target.label}</b><br/>
            <b>Triage:</b> <span style="text-transform: uppercase; font-weight: bold;">${target.triage}</span><br/>
            <b>Sensor:</b> ${target.detectedBy} (${Math.round(target.confidence * 100)}%)<br/>
            <b>Time:</b> ${target.sightedAt}<br/>
            <p style="margin-top: 4px; font-size: 11px;">${target.notes}</p>
          </div>
        `);
        group.addLayer(targetMarker);
      });
    } else if (missionMode === "agriculture") {
      // Precision Agriculture: Field boundary polygon & survey swath
      const fieldPoly = L.polygon(
        [
          [centerLat + 0.003, centerLon - 0.003],
          [centerLat + 0.004, centerLon + 0.002],
          [centerLat - 0.002, centerLon + 0.004],
          [centerLat - 0.003, centerLon - 0.002],
        ],
        {
          color: "#30d158",
          weight: 2.5,
          fillColor: "#30d158",
          fillOpacity: 0.15,
        }
      );
      fieldPoly.bindTooltip("FIELD SECTOR 04 — NORTH ORCHARD (32.4 ACRES)", { permanent: false });
      group.addLayer(fieldPoly);
    } else if (missionMode === "inspection") {
      // Infrastructure Inspection: Asset center point & orbital circle
      const assetLat = centerLat + 0.001;
      const assetLon = centerLon + 0.001;

      const orbitCircle = L.circle([assetLat, assetLon], {
        radius: 80,
        color: "#ffd60a",
        weight: 2,
        fillColor: "#ffd60a",
        fillOpacity: 0.1,
        dashArray: "6, 6",
      });
      orbitCircle.bindTooltip("ORBITAL INSPECTION RADIUS: 80M (WIND TURBINE WT-04)", { permanent: false });
      group.addLayer(orbitCircle);

      const assetIcon = L.divIcon({
        html: `
          <div style="background: #ffd60a; color: #000; width: 28px; height: 28px; border-radius: 6px; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 0 12px #ffd60a;">
            WT
          </div>
        `,
        className: "inspection-asset-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const assetMarker = L.marker([assetLat, assetLon], { icon: assetIcon });
      assetMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #111;">
          <b style="color: #d97706; font-size: 13px;">ASSET: WIND TURBINE WT-04</b><br/>
          <b>Height:</b> 110m | <b>Blade Radius:</b> 55m<br/>
          <b>Target Inspection:</b> Nacelle & Leading Edge Defect Scan
        </div>
      `);
      group.addLayer(assetMarker);
    }
  }, [missionMode, droneLat, droneLon, survivors]);

  // Render Waypoint Markers
  useEffect(() => {
    if (!waypointsLayerGroupRef.current) return;
    const group = waypointsLayerGroupRef.current;
    group.clearLayers();

    waypoints.forEach((wp, index) => {
      const wpIcon = L.divIcon({
        html: `
          <div style="background: rgba(18, 18, 24, 0.9); color: #2997ff; border: 2px solid #2997ff; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.4);">
            ${index + 1}
          </div>
        `,
        className: "waypoint-pin-icon",
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([wp.lat, wp.lon], { icon: wpIcon });
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; color: #111;">
          <b>${wp.label || `Waypoint ${index + 1}`}</b><br/>
          Lat: ${wp.lat.toFixed(5)}, Lon: ${wp.lon.toFixed(5)}<br/>
          Alt: ${wp.alt}m
        </div>
      `);
      group.addLayer(marker);
    });
  }, [waypoints]);

  const handleCenterOnDrone = useCallback(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([droneLat, droneLon], 16, { animate: true, duration: 0.8 });
      setAutoCenter(true);
    }
  }, [droneLat, droneLon]);

  const handleClearBreadcrumbs = useCallback(() => {
    setBreadcrumbs([]);
    if (breadcrumbPolylineRef.current) {
      breadcrumbPolylineRef.current.setLatLngs([]);
    }
  }, []);

  return (
    <div className={`relative w-full h-full min-h-[400px] overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[#090b10] ${className}`}>
      {/* Map container */}
      <div ref={mapContainerRef} className="w-full h-full z-0 cursor-crosshair" />

      {/* Top Floating Telemetry & Mode Badge */}
      <div className="absolute top-4 left-4 z-[400] flex flex-wrap items-center gap-2 pointer-events-auto">
        {hasValidGps ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/10 text-xs font-mono shadow-xl">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[var(--text-primary)] font-bold">DRONE GPS:</span>
            <span className="text-[var(--accent-cyan)]">{droneLat.toFixed(5)}°, {droneLon.toFixed(5)}°</span>
            <span className="text-[var(--text-muted)]">|</span>
            <span className="text-[var(--text-primary)]">{droneAlt.toFixed(1)}m ALT</span>
          </div>
        ) : isSimulated ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-xl border border-amber-500/30 text-xs font-mono shadow-xl">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-400 font-bold">SIMULATED POSITION:</span>
            <span className="text-amber-200">{droneLat.toFixed(5)}°, {droneLon.toFixed(5)}°</span>
            <span className="text-white/30">|</span>
            <span className="text-amber-400">{droneAlt.toFixed(1)}m</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-950/80 backdrop-blur-xl border border-red-500/40 text-xs font-mono shadow-xl">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 font-bold">NO GPS FIX</span>
            <span className="text-red-200 text-[10px]">Awaiting 3D Satellite Lock (Sats: {gps?.satellites ?? 0})</span>
          </div>
        )}

        {isSimulated ? (
          <div className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold tracking-wider">
            [SIMULATED MAP TRACK]
          </div>
        ) : hasValidGps ? (
          <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold tracking-wider">
            [LIVE HARDWARE TRACK]
          </div>
        ) : null}
      </div>

      {/* Top Right Map Layer & Tool Controls */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-auto items-end">
        {/* Layer Selector */}
        <div className="flex bg-black/75 backdrop-blur-xl p-1 rounded-xl border border-white/10 shadow-xl">
          <button
            onClick={() => setActiveLayer("dark")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              activeLayer === "dark" ? "bg-[var(--accent-cyan)] text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Tactical
          </button>
          <button
            onClick={() => setActiveLayer("satellite")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              activeLayer === "satellite" ? "bg-[var(--accent-cyan)] text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setActiveLayer("streets")}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              activeLayer === "streets" ? "bg-[var(--accent-cyan)] text-white shadow" : "text-gray-400 hover:text-white"
            }`}
          >
            Street
          </button>
        </div>

        {/* Center Drone Button */}
        <button
          onClick={handleCenterOnDrone}
          title="Recenter on Drone"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-xl border border-white/10 hover:bg-white/10 text-white text-xs font-bold transition-all shadow-xl"
        >
          <svg className="w-3.5 h-3.5 text-[var(--accent-cyan)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
          Recenter
        </button>

        {/* Clear Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <button
            onClick={handleClearBreadcrumbs}
            className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-gray-400 hover:text-white text-[10px] font-mono transition-all"
          >
            Clear Trail ({breadcrumbs.length})
          </button>
        )}
      </div>

      {/* Bottom Coordinates & Zoom Bar */}
      <div className="absolute bottom-4 left-4 z-[400] flex items-center gap-3 bg-black/75 backdrop-blur-xl px-3 py-1.5 rounded-lg border border-white/10 text-[11px] font-mono text-[var(--text-secondary)] pointer-events-none">
        <span>CURSOR: {cursorCoords ? `${cursorCoords.lat.toFixed(5)}°, ${cursorCoords.lon.toFixed(5)}°` : "Hover to read"}</span>
        <span className="text-white/20">|</span>
        <span>WAYPOINTS: {waypoints.length}</span>
        <span className="text-white/20">|</span>
        <span className="text-[var(--accent-cyan)]">CLICK MAP TO DROP WP</span>
      </div>
    </div>
  );
}
