import { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, RotateCcw, Check, X, MapPin, RefreshCw } from 'lucide-react';
import { useCamera, type CapturedPhoto } from './useCamera';
import { QualityGate } from './QualityGate';
import { CaptureGallery } from './CaptureGallery';

const INSTRUCTIONS = [
  'Center the trunk',
  'Capture the canopy',
  'Show ground damage',
];

interface CaptureFlowProps {
  onPhotosReady?: (photos: CapturedPhoto[]) => void;
  onUploadAll?: (photos: CapturedPhoto[]) => void;
  onClose?: () => void;
}

export function CaptureFlow({ onPhotosReady, onUploadAll, onClose }: CaptureFlowProps) {
  const {
    stream,
    videoRef,
    isStarting,
    error,
    photos,
    gpsData,
    start,
    stop,
    capture,
    switchCamera,
    removePhoto,
  } = useCamera();

  const [preview, setPreview] = useState<CapturedPhoto | null>(null);
  const [instructionIdx, setInstructionIdx] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const instructionTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Start camera on mount
  useEffect(() => {
    start();
    return () => stop();
  }, []);

  // Cycle instruction text every 4 seconds
  useEffect(() => {
    if (preview) return;

    instructionTimer.current = setInterval(() => {
      setInstructionIdx((prev) => (prev + 1) % INSTRUCTIONS.length);
    }, 4000);

    return () => {
      if (instructionTimer.current) clearInterval(instructionTimer.current);
    };
  }, [preview]);

  const handleCapture = useCallback(async () => {
    setIsPulsing(true);
    const photo = await capture();
    setTimeout(() => setIsPulsing(false), 300);

    if (photo) {
      setPreview(photo);
    }
  }, [capture]);

  const handleAccept = useCallback(() => {
    setPreview(null);
    onPhotosReady?.(photos);
  }, [photos, onPhotosReady]);

  const handleRetake = useCallback(() => {
    if (preview) {
      removePhoto(preview.id);
    }
    setPreview(null);
  }, [preview, removePhoto]);

  const handleUploadAll = useCallback(() => {
    onUploadAll?.(photos);
  }, [photos, onUploadAll]);

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-forest-950 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-danger/20 flex items-center justify-center mb-4">
          <Camera size={28} className="text-danger" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Camera Access Required</h2>
        <p className="text-sm text-[var(--text3)] text-center max-w-xs mb-6">{error}</p>
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

  // Preview mode
  if (preview) {
    return (
      <div className="fixed inset-0 z-50 bg-forest-950 flex flex-col">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-forest-900/80 border border-[var(--border)] flex items-center justify-center"
          >
            <X size={16} className="text-[var(--text2)]" />
          </button>
        )}

        {/* Preview image */}
        <div className="flex-1 relative">
          <img
            src={preview.thumbnailUrl}
            alt="Preview"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Quality Gate */}
        <div className="p-4 bg-forest-950/90 border-t border-[var(--border)]">
          <QualityGate
            imageBlob={preview.blob}
            width={preview.width}
            height={preview.height}
          />

          {/* Accept / Retake buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleRetake}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-[var(--text2)] text-sm font-semibold hover:bg-[var(--bg3)] transition-colors"
            >
              <RotateCcw size={16} />
              Retake
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              <Check size={16} />
              Accept
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera viewfinder mode
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
        {(isStarting || !stream) && (
          <div className="absolute inset-0 flex items-center justify-center bg-forest-950">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          </div>
        )}

        {/* Target frame overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Corner brackets */}
          <div className="absolute inset-8 sm:inset-16">
            {/* Top-left */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--green)]/60 rounded-tl" />
            {/* Top-right */}
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--green)]/60 rounded-tr" />
            {/* Bottom-left */}
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--green)]/60 rounded-bl" />
            {/* Bottom-right */}
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--green)]/60 rounded-br" />
          </div>
        </div>

        {/* Instruction text */}
        {stream && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
            <div className="bg-forest-950/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[var(--border)]">
              <p className="text-xs text-[var(--text)] font-medium text-center transition-all duration-300">
                {INSTRUCTIONS[instructionIdx]}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-forest-950/90 border-t border-[var(--border)] px-4 py-5">
        {/* Gallery strip */}
        {photos.length > 0 && (
          <div className="mb-4">
            <CaptureGallery
              photos={photos}
              onRemove={removePhoto}
              onUploadAll={handleUploadAll}
            />
          </div>
        )}

        {/* Capture button */}
        <div className="flex items-center justify-center">
          <button
            onClick={handleCapture}
            disabled={!stream || isStarting}
            className="relative w-16 h-16 rounded-full disabled:opacity-50"
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-[3px] border-[var(--green)]/80" />
            {/* Inner button */}
            <div
              className={`absolute inset-1.5 rounded-full bg-[var(--green)] transition-transform ${
                isPulsing ? 'scale-90' : 'scale-100'
              }`}
            />
            {/* Pulse animation ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[var(--green)] animate-ping opacity-20" />
          </button>
        </div>

        {/* Photo count */}
        {photos.length > 0 && (
          <p className="text-center text-[10px] text-[var(--text3)] mt-3 font-mono">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} captured
          </p>
        )}
      </div>
    </div>
  );
}
