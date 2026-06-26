"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { TelemetryData, GPSData, AttitudeData, BatteryData, DroneStatus } from "@/types/api";
import api from "@/lib/api";
import { INTERVALS } from "@/lib/constants";

export function useTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [gps, setGPS] = useState<GPSData | null>(null);
  const [attitude, setAttitude] = useState<AttitudeData | null>(null);
  const [battery, setBattery] = useState<BatteryData | null>(null);
  const [droneStatus, setDroneStatus] = useState<DroneStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTelemetry = useCallback(async () => {
    try {
      const data = await api.getTelemetry();
      setTelemetry(data);
      setIsConnected(true);
      setError(null);
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
    }, INTERVALS.TELEMETRY);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchTelemetry, fetchGPS, fetchAttitude, fetchBattery, fetchDroneStatus]);

  return {
    telemetry,
    gps,
    attitude,
    battery,
    droneStatus,
    isConnected,
    error,
    refetch: fetchTelemetry,
  };
}
