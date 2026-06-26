"use client";

import { useState, useCallback } from "react";
import {
  Mission,
  MissionListResponse,
  MissionCompareResponse,
  MissionQueryResponse,
} from "@/types/api";
import api from "@/lib/api";

export function useMission() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [totalMissions, setTotalMissions] = useState(0);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const data: MissionListResponse = await api.getMissions(status);
      setMissions(data.missions);
      setTotalMissions(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch missions");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMission = useCallback(async (missionId: string) => {
    setLoading(true);
    try {
      const data: Mission = await api.getMission(missionId);
      setCurrentMission(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch mission");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createMission = useCallback(async (name: string) => {
    try {
      const data: Mission = await api.createMission(name);
      setMissions((prev) => [data, ...prev]);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create mission");
      return null;
    }
  }, []);

  const startMission = useCallback(async (missionId: string) => {
    try {
      const data: Mission = await api.startMission(missionId);
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? data : m))
      );
      setCurrentMission(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start mission");
      return null;
    }
  }, []);

  const completeMission = useCallback(async (missionId: string) => {
    try {
      const data: Mission = await api.completeMission(missionId);
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? data : m))
      );
      setCurrentMission(data);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete mission");
      return null;
    }
  }, []);

  const deleteMission = useCallback(async (missionId: string) => {
    try {
      await api.deleteMission(missionId);
      setMissions((prev) => prev.filter((m) => m.id !== missionId));
      if (currentMission?.id === missionId) {
        setCurrentMission(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete mission");
    }
  }, [currentMission]);

  const updateMission = useCallback(async (missionId: string, data: Record<string, unknown>) => {
    try {
      const updated: Mission = await api.updateMission(missionId, data);
      setMissions((prev) =>
        prev.map((m) => (m.id === missionId ? updated : m))
      );
      setCurrentMission(updated);
      setError(null);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update mission");
      return null;
    }
  }, []);

  const compareMissions = useCallback(async (missionIds: string[]) => {
    try {
      const data: MissionCompareResponse = await api.compareMissions(missionIds);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compare missions");
      return null;
    }
  }, []);

  const queryMissions = useCallback(async (query: string) => {
    try {
      const data: MissionQueryResponse = await api.queryMissions(query);
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to query missions");
      return null;
    }
  }, []);

  return {
    missions,
    totalMissions,
    currentMission,
    loading,
    error,
    fetchMissions,
    fetchMission,
    createMission,
    startMission,
    completeMission,
    deleteMission,
    updateMission,
    compareMissions,
    queryMissions,
  };
}
