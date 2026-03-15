import { useState, useRef, useCallback, useEffect } from 'react';

export interface CapturedPhoto {
  id: string;
  blob: Blob;
  thumbnailUrl: string;
  width: number;
  height: number;
  timestamp: number;
  gps: GpsData | null;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
}

interface UseCameraReturn {
  stream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStarting: boolean;
  error: string | null;
  photos: CapturedPhoto[];
  gpsData: GpsData | null;
  facingMode: 'environment' | 'user';
  start: () => Promise<void>;
  stop: () => void;
  capture: () => Promise<CapturedPhoto | null>;
  switchCamera: () => Promise<void>;
  removePhoto: (id: string) => void;
  clearPhotos: () => void;
}

export function useCamera(): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [gpsData, setGpsData] = useState<GpsData | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Get GPS position
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsData({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
        });
      },
      (err) => {
        console.warn('GPS error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const start = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access camera';
      setError(message);
    } finally {
      setIsStarting(false);
    }
  }, [facingMode]);

  const stop = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  const capture = useCallback(async (): Promise<CapturedPhoto | null> => {
    const video = videoRef.current;
    if (!video || !stream) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );

    if (!blob) return null;

    const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.4);

    const photo: CapturedPhoto = {
      id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      blob,
      thumbnailUrl,
      width: canvas.width,
      height: canvas.height,
      timestamp: Date.now(),
      gps: gpsData,
    };

    setPhotos((prev) => [...prev, photo]);
    return photo;
  }, [stream, gpsData]);

  const switchCamera = useCallback(async () => {
    stop();
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    // Will restart on next start() call with new facing mode
  }, [facingMode, stop]);

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id);
      if (photo) {
        URL.revokeObjectURL(photo.thumbnailUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const clearPhotos = useCallback(() => {
    setPhotos([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return {
    stream,
    videoRef,
    isStarting,
    error,
    photos,
    gpsData,
    facingMode,
    start,
    stop,
    capture,
    switchCamera,
    removePhoto,
    clearPhotos,
  };
}
