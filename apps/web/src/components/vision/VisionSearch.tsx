import { useState, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  MapPin,
  Scan,
  WifiOff,
  ChevronDown,
} from 'lucide-react';
import { useCamera, type CapturedPhoto } from '@/components/capture/useCamera';
import { useVisionSearch } from '@/hooks/useVisionSearch';
import { IdentificationResult } from './IdentificationResult';

interface VisionSearchProps {
  onClose?: () => void;
  onLearnMore?: (context: string) => void;
}

export function VisionSearch({ onClose, onLearnMore }: VisionSearchProps) {
  const {
    stream,
    videoRef,
    isStarting,
    error: cameraError,
    gpsData,
    start,
    stop,
    capture,
    switchCamera,
  } = useCamera();

  const {
    currentResult,
    currentThumbnail,
    isIdentifying,
    error: identifyError,
    pendingOfflineCount,
    identify,
    clearCurrentResult,
    cancel,
    syncOfflineQueue,
  } = useVisionSearch();

  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [scanPhase, setScanPhase] = useState(0);

  // Start camera on mount
  useEffect(() => {
    start();
    return () => stop();
  }, []);

  // Scanning animation
  useEffect(() => {
    if (!isIdentifying) return;
    const interval = setInterval(() => {
      setScanPhase((prev) => (prev + 1) % 4);
    }, 600);
    return () => clearInterval(interval);
  }, [isIdentifying]);

  // Sync offline queue when coming back online
  useEffect(() => {
    const handleOnline = () => {
      if (pendingOfflineCount > 0) {
        syncOfflineQueue();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [pendingOfflineCount, syncOfflineQueue]);

  const handleIdentify = useCallback(async () => {
    const photo = await capture();
    if (!photo) return;

    setCapturedPhoto(photo);
    await identify(photo);
  }, [capture, identify]);

  const handleRetry = useCallback(() => {
    clearCurrentResult();
    setCapturedPhoto(null);
  }, [clearCurrentResult]);

  const handleLearnMore = useCallback(() => {
    if (!currentResult || !currentResult.top_candidates.length) return;
    const top = currentResult.top_candidates[0];
    const context = `I just identified a ${top.common_name_en} (${top.scientific_name}) in the forest. Confidence: ${Math.round(top.confidence * 100)}%. Tell me more about this species in Swedish forestry context.`;
    onLearnMore?.(context);
  }, [currentResult, onLearnMore]);

  const handleSaveToCollection = useCallback(() => {
    // Already saved to history via useVisionSearch hook
    // Show a brief confirmation
  }, []);

  const scanTexts = [
    'Analyzing image...',
    'Matching species database...',
    'Detecting diseases...',
    'Finalizing results...',
  ];

  // ── Camera error state ──────────────────────────────────────────────────
  if (cameraError) {
    return (
      <div className="fixed inset-0 z-50 bg-forest-950 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mb-4">
          <Camera size={28} className="text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Camera Access Required</h2>
        <p className="text-sm text-[var(--text3)] text-center max-w-xs mb-6">{cameraError}</p>
        <div className="flex gap-3">
          <button
            onClick={start}
            className="px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            Try Again
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text2)] text-sm hover:bg-[var(--bg3)] transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Results overlay ─────────────────────────────────────────────────────
  if (currentResult && capturedPhoto) {
    return (
      <div className="fixed inset-0 z-50 bg-forest-950 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">Identification Result</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text2)] text-xs hover:bg-[var(--bg3)] transition-colors"
            >
              <RefreshCw size={12} />
              New Scan
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-forest-900/80 border border-[var(--border)] flex items-center justify-center"
              >
                <X size={16} className="text-[var(--text2)]" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable results */}
        <div className="flex-1 overflow-y-auto">
          {/* Captured image preview */}
          <div className="relative h-48 sm:h-56 overflow-hidden">
            <img
              src={capturedPhoto.thumbnailUrl}
              alt="Captured"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-950 to-transparent" />

            {/* Processing time badge */}
            {currentResult.processing_time_ms > 0 && (
              <div className="absolute bottom-3 right-3 px-2 py-1 rounded bg-forest-950/80 text-[9px] font-mono text-[var(--text3)]">
                {currentResult.processing_time_ms.toFixed(0)}ms
              </div>
            )}
          </div>

          {/* Result cards */}
          <div className="p-4">
            <IdentificationResult
              result={currentResult}
              thumbnailUrl={capturedPhoto.thumbnailUrl}
              onLearnMore={onLearnMore ? handleLearnMore : undefined}
              onSaveToCollection={handleSaveToCollection}
            />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center py-2 border-t border-[var(--border)] bg-forest-950/90">
          <ChevronDown size={16} className="text-[var(--text3)] animate-bounce" />
        </div>
      </div>
    );
  }

  // ── Camera viewfinder mode ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-forest-950 flex flex-col">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-forest-950 to-transparent">
        <div className="flex items-center justify-between">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-forest-900/80 border border-[var(--border)] flex items-center justify-center"
            >
              <X size={16} className="text-[var(--text2)]" />
            </button>
          )}
          <div className="flex items-center gap-2">
            {!navigator.onLine && (
              <span className="flex items-center gap-1 text-[10px] text-amber bg-amber/10 px-2 py-1 rounded-full">
                <WifiOff size={10} />
                Offline
              </span>
            )}
            {pendingOfflineCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-amber bg-amber/10 px-2 py-1 rounded-full">
                {pendingOfflineCount} queued
              </span>
            )}
            {gpsData && (
              <span className="flex items-center gap-1 text-[10px] text-[var(--green)] bg-[var(--green)]/10 px-2 py-1 rounded-full">
                <MapPin size={10} />
                GPS
              </span>
            )}
          </div>
          <button
            onClick={switchCamera}
            className="w-8 h-8 rounded-full bg-forest-900/80 border border-[var(--border)] flex items-center justify-center"
          >
            <RefreshCw size={14} className="text-[var(--text2)]" />
          </button>
        </div>
      </div>

      {/* Video viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Loading overlay */}
        {(isStarting || !stream) && !isIdentifying && (
          <div className="absolute inset-0 flex items-center justify-center bg-forest-950">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          </div>
        )}

        {/* Scanning animation overlay */}
        {isIdentifying && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-forest-950/70 backdrop-blur-sm">
            {/* Animated scan lines */}
            <div className="relative w-48 h-48 mb-6">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-[var(--green)] rounded-tl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-[var(--green)] rounded-tr" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-[var(--green)] rounded-bl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-[var(--green)] rounded-br" />

              {/* Scanning line */}
              <div
                className="absolute left-2 right-2 h-0.5 bg-[var(--green)] transition-all duration-500 ease-in-out"
                style={{ top: `${25 + scanPhase * 20}%`, opacity: 0.8 }}
              />

              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Scan size={36} className="text-[var(--green)] animate-pulse" />
              </div>
            </div>

            {/* Status text */}
            <p className="text-sm text-[var(--green)] font-medium animate-pulse">
              {scanTexts[scanPhase]}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-2">
              Analyzing with EfficientNet + YOLOv8 + ResNet
            </p>

            {/* Cancel button */}
            <button
              onClick={cancel}
              className="mt-6 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text2)] text-xs hover:bg-[var(--bg3)] transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Target frame overlay (viewfinder mode) */}
        {!isIdentifying && stream && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-12 sm:inset-20">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-[var(--green)]/50 rounded-tl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-[var(--green)]/50 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-[var(--green)]/50 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-[var(--green)]/50 rounded-br" />
            </div>

            {/* Instruction text */}
            <div className="absolute bottom-28 left-0 right-0 flex justify-center">
              <div className="bg-forest-950/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[var(--border)]">
                <p className="text-xs text-[var(--text)] font-medium text-center">
                  Point at a tree, plant, animal, or bark damage
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {identifyError && !isIdentifying && (
          <div className="absolute bottom-28 left-4 right-4">
            <div className="bg-danger/15 border border-danger/30 rounded-xl px-4 py-3">
              <p className="text-xs text-danger">{identifyError}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-forest-950/90 border-t border-[var(--border)] px-4 py-5">
        <div className="flex items-center justify-center">
          <button
            onClick={handleIdentify}
            disabled={!stream || isStarting || isIdentifying}
            className="relative w-16 h-16 rounded-full disabled:opacity-50"
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-[var(--green)]/80" />
            {/* Inner button */}
            <div className="absolute inset-1.5 rounded-full bg-[var(--green)] flex items-center justify-center transition-transform active:scale-90">
              <Scan size={24} className="text-[var(--bg)]" />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[var(--green)] animate-ping opacity-20" />
          </button>
        </div>
        <p className="text-center text-[10px] text-[var(--text3)] mt-3 font-mono uppercase tracking-wider">
          Identify
        </p>
      </div>
    </div>
  );
}
