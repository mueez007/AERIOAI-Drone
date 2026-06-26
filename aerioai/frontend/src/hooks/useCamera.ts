"use client";

import { useState, useCallback } from "react";
import { MediaItem, MediaListResponse, CaptureResponse } from "@/types/api";
import api from "@/lib/api";

export function useCamera() {
  const [photos, setPhotos] = useState<MediaItem[]>([]);
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [totalVideos, setTotalVideos] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async (missionId?: string) => {
    setLoading(true);
    try {
      const data: MediaListResponse = await api.getPhotos(missionId);
      setPhotos(data.photos);
      setTotalPhotos(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch photos");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVideos = useCallback(async (missionId?: string) => {
    setLoading(true);
    try {
      const data: MediaListResponse = await api.getVideos(missionId);
      setVideos(data.videos);
      setTotalVideos(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  }, []);

  const capturePhoto = useCallback(async (missionId?: string) => {
    setIsCapturing(true);
    try {
      const result: CaptureResponse = await api.capturePhoto(missionId);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture photo");
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const startRecording = useCallback(async (missionId?: string) => {
    try {
      await api.startRecording(missionId);
      setIsRecording(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start recording");
    }
  }, []);

  const stopRecording = useCallback(async (missionId?: string) => {
    try {
      const result = await api.stopRecording(missionId);
      setIsRecording(false);
      setError(null);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      return null;
    }
  }, []);

  const deleteMedia = useCallback(async (mediaId: string) => {
    try {
      await api.deleteMedia(mediaId);
      setPhotos((prev) => prev.filter((p) => p.id !== mediaId));
      setVideos((prev) => prev.filter((v) => v.id !== mediaId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete media");
    }
  }, []);

  const getStreamUrl = useCallback(() => {
    return api.getStreamUrl();
  }, []);

  const getDownloadUrl = useCallback((mediaId: string) => {
    return api.getMediaDownloadUrl(mediaId);
  }, []);

  return {
    photos,
    videos,
    totalPhotos,
    totalVideos,
    isCapturing,
    isRecording,
    loading,
    error,
    fetchPhotos,
    fetchVideos,
    capturePhoto,
    startRecording,
    stopRecording,
    deleteMedia,
    getStreamUrl,
    getDownloadUrl,
  };
}
