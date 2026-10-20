"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TelemetryData, GPSData, AttitudeData, BatteryData, DroneStatus } from "@/types/api";
import api from "@/lib/api";
import { INTERVALS } from "@/lib/constants";

export type TelemetrySource = 
  | "HARDWARE — INAV/MSP"
  | "SIMULATED"
  | "STALE"
  | "DISCONNECTED"
  | "UNAVAILABLE";

export function useTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [gps, setGPS] = useState<GPSData | null>(null);
  const [attitude, setAttitude] = useState<AttitudeData | null>(null);
  const [battery, setBattery] = useState<BatteryData | null>(null);
  const [droneStatus, setDroneStatus] = useState<DroneStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReceivedAt, setLastReceivedAt] = useState<Date | null>(null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPacketTimeRef = useRef<number>(0);

  const fetchTelemetry = useCallback(async () => {
    try {
      const data = await api.getTelemetry();
      // Verify if backend returned a genuine packet or disconnected state
      if (data && data.source === "disconnected") {
        setIsConnected(false);
        setTelemetry(null);
        setError("Flight Controller Disconnected");
        return;
      }
      setTelemetry(data);
      setIsConnected(true);
      setIsStale(false);
      setError(null);
      lastPacketTimeRef.current = Date.now();
      setLastReceivedAt(new Date());
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err.message : "Telemetry fetch failed");
    }
  }, []);

  const fetchGPS = useCallback(async () => {
    try {
      const data = await api.getGPS();
      setGPS(data);
    } catch {
      // GPS might not be available
    }
  }, []);

  const fetchAttitude = useCallback(async () => {
    try {
      const data = await api.getAttitude();
      setAttitude(data);
    } catch {
      // Attitude might not be available
    }
  }, []);

  const fetchBattery = useCallback(async () => {
    try {
      const data = await api.getBattery();
      setBattery(data);
    } catch {
      // Battery might not be available
    }
  }, []);

  const fetchDroneStatus = useCallback(async () => {
    try {
      const data = await api.getSystemStatus();
      setDroneStatus(data);
    } catch {
      // Status might not be available
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchTelemetry();
    fetchGPS();
    fetchAttitude();
    fetchBattery();
    fetchDroneStatus();

    // Polling
    intervalRef.current = setInterval(() => {
      fetchTelemetry();
      fetchGPS();
      fetchAttitude();
      fetchBattery();
      fetchDroneStatus();

      // Staleness watchdog (threshold: 3.5s)
      if (lastPacketTimeRef.current > 0 && Date.now() - lastPacketTimeRef.current > 3500) {
        setIsStale(true);
      }
    }, INTERVALS.TELEMETRY);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTelemetry, fetchGPS, fetchAttitude, fetchBattery, fetchDroneStatus]);

  // Provenance & Source Computation
  const isSimulated = !telemetry || telemetry.is_simulated === true || telemetry.source === "mock" || telemetry.flight_mode === "MOCK";
  
  let telemetrySource: TelemetrySource = "UNAVAILABLE";
  if (!isConnected) {
    telemetrySource = "DISCONNECTED";
  } else if (isStale) {
    telemetrySource = "STALE";
  } else if (isSimulated) {
    telemetrySource = "SIMULATED";
  } else if (telemetry?.source === "msp" && !isSimulated) {
    telemetrySource = "HARDWARE — INAV/MSP";
  } else {
    telemetrySource = "SIMULATED";
  }

  return {
    telemetry,
    gps,
    attitude,
    battery,
    droneStatus,
    isConnected,
    isStale,
    isSimulated,
    telemetrySource,
    lastReceivedAt,
    error,
    refetch: fetchTelemetry,
  };
}
