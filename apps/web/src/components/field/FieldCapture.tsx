import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Camera,
  SwitchCamera,
  Image,
  Check,
  AlertTriangle,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  useFieldModeStore,
  storePhotoBlob,
  type FieldPhoto,
  type FieldGps,
} from '@/stores/fieldModeStore';
// Network status available for sync logic
// import { useNetworkStatus } from '@/lib/offlineSync';

// ─── Capture prompts ───

const CAPTURE_PROMPTS = [
  { key: 'tree_trunk', labelKey: 'field.capture.treeTrunk' },
  { key: 'canopy', labelKey: 'field.capture.canopy' },
  { key: 'ground_damage', labelKey: 'field.capture.groundDamage' },
  { key: 'bark_detail', labelKey: 'field.capture.barkDetail' },
  { key: 'overview', labelKey: 'field.capture.overview' },
] as const;

// ─── Quality checks ───

function checkBlur(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): boolean {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  let variance = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const lap =
        gray[(y - 1) * w + x] +
        gray[(y + 1) * w + x] +
        gray[y * w + (x - 1)] +
        gray[y * w + (x + 1)] -
        4 * gray[y * w + x];
      variance += lap * lap;
      count++;
    }
  }
  return count > 0 ? variance / count > 80 : true;
}

// ─── Component ───

export function FieldCapture() {
  const { t } = useTranslation();
  const { capturedPhotos, addPhoto, removePhoto } = useFieldModeStore();
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [gps, setGps] = useState<FieldGps | null>(null);
  const [compassHeading, setCompassHeading] = useState<number | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [lastCapture, setLastCapture] = useState<{
    thumbnailUrl: string;
    isSharp: boolean;
    meetsResolution: boolean;
  } | null>(null);
  const [showGallery, setShowGallery] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const uploadedCount = capturedPhotos.filter((p) => p.uploaded).length;
  const pendingCount = capturedPhotos.length - uploadedCount;

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
        }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Compass heading (device orientation)
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      // Use webkitCompassHeading for iOS, alpha for Android
      const heading =
        (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
          .webkitCompassHeading ?? (e.alpha !== null ? (360 - e.alpha) % 360 : null);
      if (heading !== null) setCompassHeading(Math.round(heading));
    };
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () =>
      window.removeEventListener('deviceorientation', handleOrientation, true);
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
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
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  }, [stream]);

  // Switch camera
  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }, [stopCamera]);

  // Restart camera when facingMode changes
  useEffect(() => {
    if (cameraActive && !stream) {
      startCamera();
    }
  }, [facingMode, cameraActive, stream, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  // Capture photo
  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !stream) return;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Quality checks
    const analysisW = Math.min(640, canvas.width);
    const analysisH = Math.round((analysisW / canvas.width) * canvas.height);
    const analysisCanvas = document.createElement('canvas');
    analysisCanvas.width = analysisW;
    analysisCanvas.height = analysisH;
    const actx = analysisCanvas.getContext('2d');

    let isSharp = true;
    if (actx) {
      actx.drawImage(canvas, 0, 0, analysisW, analysisH);
      isSharp = checkBlur(actx, analysisW, analysisH);
    }

    const meetsResolution = canvas.width >= 1920 && canvas.height >= 1080;

    // Generate JPEG blob
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    );
    if (!blob) return;

    // Generate thumbnail data URL
    const thumbCanvas = document.createElement('canvas');
    const thumbW = 200;
    const thumbH = Math.round((thumbW / canvas.width) * canvas.height);
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const tctx = thumbCanvas.getContext('2d');
    tctx?.drawImage(canvas, 0, 0, thumbW, thumbH);
    const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.5);

    const photoId = `fp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const idbKey = `field-photo-${photoId}`;

    // Store full blob in IndexedDB
    await storePhotoBlob(idbKey, blob);

    const photo: FieldPhoto = {
      id: photoId,
      thumbnailDataUrl,
      idbKey,
      width: canvas.width,
      height: canvas.height,
      timestamp: Date.now(),
      gps,
      compassHeading,
      prompt: CAPTURE_PROMPTS[selectedPrompt].key,
      uploaded: false,
    };

    addPhoto(photo);
    setLastCapture({ thumbnailUrl: thumbnailDataUrl, isSharp, meetsResolution });

    // Auto-advance prompt
    setSelectedPrompt((prev) =>
      prev < CAPTURE_PROMPTS.length - 1 ? prev + 1 : prev,
    );

    // Clear feedback after 2s
    setTimeout(() => setLastCapture(null), 2000);
  }, [stream, gps, compassHeading, selectedPrompt, addPhoto]);

  // ─── Gallery view ───
  if (showGallery) {
    return (
      <div className="h-full flex flex-col bg-[#020a03]">
        {/* Gallery header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <button
            onClick={() => setShowGallery(false)}
            className="flex items-center gap-2 text-[var(--green)] min-h-[44px]"
          >
            <X size={20} />
            <span className="text-sm font-medium">{t('common.back')}</span>
          </button>
          <div className="text-right">
            <p className="text-xs text-white font-bold">
              {capturedPhotos.length} {t('field.photosCaptured')}
            </p>
            <p className="text-[10px] text-[var(--amber)]">
              {pendingCount} {t('field.pendingUpload')}
            </p>
          </div>
        </div>

        {/* Photo grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {capturedPhotos.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-[var(--text3)]">
                {t('field.capture.noPhotos')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {capturedPhotos.map((photo) => (
                <div key={photo.id} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                  <img
                    src={photo.thumbnailDataUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {/* Upload status badge */}
                  <div
                    className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center ${
                      photo.uploaded
                        ? 'bg-[var(--green)]'
                        : 'bg-[var(--amber)]'
                    }`}
                  >
                    {photo.uploaded ? (
                      <Check size={10} className="text-forest-900" />
                    ) : (
                      <Upload size={10} className="text-forest-900" />
                    )}
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[var(--red)]/80 flex items-center justify-center"
                  >
                    <Trash2 size={12} className="text-white" />
                  </button>
                  {/* Prompt tag */}
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[8px] text-white font-medium">
                    {photo.prompt}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Camera / capture view ───
  return (
    <div className="h-full flex flex-col bg-black">
      {!cameraActive ? (
        // ─── Pre-camera screen ───
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
          <div className="w-20 h-20 rounded-full bg-[var(--green)]/10 border-2 border-[var(--green)]/30 flex items-center justify-center">
            <Camera size={36} className="text-[var(--green)]" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-white mb-1">
              {t('field.capture.title')}
            </h2>
            <p className="text-xs text-[var(--text2)]">
              {t('field.capture.subtitle')}
            </p>
          </div>

          {/* Photo counter */}
          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <p className="text-xl font-bold text-white">{capturedPhotos.length}</p>
              <p className="text-[var(--text3)]">{t('field.photosCaptured')}</p>
            </div>
            <div className="w-px h-8 bg-[var(--border)]" />
            <div className="text-center">
              <p className="text-xl font-bold text-[var(--amber)]">{pendingCount}</p>
              <p className="text-[var(--text3)]">{t('field.pendingUpload')}</p>
            </div>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={startCamera}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[var(--green)] text-forest-900 font-bold text-sm min-h-[48px] active:brightness-90 transition-all"
            >
              <Camera size={18} />
              {t('field.capture.openCamera')}
            </button>
            {capturedPhotos.length > 0 && (
              <button
                onClick={() => setShowGallery(true)}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-[var(--border)] text-[var(--text)] font-medium text-sm min-h-[48px]"
              >
                <Image size={18} />
                {capturedPhotos.length}
              </button>
            )}
          </div>
        </div>
      ) : (
        // ─── Active camera ───
        <>
          {/* Video feed */}
          <div className="flex-1 relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Capture prompt overlay */}
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="bg-black/60 rounded-xl px-4 py-2.5">
                <p className="text-sm font-bold text-white text-center">
                  {t(CAPTURE_PROMPTS[selectedPrompt].labelKey)}
                </p>
                <p className="text-[10px] text-[var(--text2)] text-center mt-0.5">
                  {selectedPrompt + 1} / {CAPTURE_PROMPTS.length}
                </p>
              </div>
            </div>

            {/* Quality feedback overlay */}
            {lastCapture && (
              <div className="absolute top-20 left-4 right-4 z-10">
                <div className="bg-black/70 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    {lastCapture.isSharp ? (
                      <Check size={14} className="text-[var(--green)]" />
                    ) : (
                      <AlertTriangle size={14} className="text-[var(--amber)]" />
                    )}
                    <span className="text-xs text-white">
                      {lastCapture.isSharp
                        ? t('field.capture.sharp')
                        : t('field.capture.blurry')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lastCapture.meetsResolution ? (
                      <Check size={14} className="text-[var(--green)]" />
                    ) : (
                      <AlertTriangle size={14} className="text-[var(--amber)]" />
                    )}
                    <span className="text-xs text-white">
                      {lastCapture.meetsResolution
                        ? t('field.capture.goodResolution')
                        : t('field.capture.lowResolution')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* GPS + compass HUD */}
            <div className="absolute bottom-4 left-4 z-10 bg-black/50 rounded-lg px-2.5 py-1.5">
              <p className="text-[10px] font-mono text-[var(--green)]">
                {gps
                  ? `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)} (\u00b1${Math.round(gps.accuracy)}m)`
                  : 'GPS: ---'}
              </p>
              {compassHeading !== null && (
                <p className="text-[10px] font-mono text-[var(--text2)]">
                  Heading: {compassHeading}&deg;
                </p>
              )}
            </div>

            {/* Photo count */}
            <div className="absolute bottom-4 right-4 z-10 bg-black/50 rounded-lg px-2.5 py-1.5">
              <p className="text-xs font-bold text-white">
                {capturedPhotos.length} {t('field.photosCaptured')}
              </p>
            </div>
          </div>

          {/* Prompt selector strip */}
          <div className="flex gap-1.5 px-3 py-2 bg-[#020a03] overflow-x-auto">
            {CAPTURE_PROMPTS.map((prompt, idx) => (
              <button
                key={prompt.key}
                onClick={() => setSelectedPrompt(idx)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors min-h-[32px] ${
                  selectedPrompt === idx
                    ? 'bg-[var(--green)] text-forest-900'
                    : 'bg-[var(--bg3)] text-[var(--text2)]'
                }`}
              >
                {t(prompt.labelKey)}
              </button>
            ))}
          </div>

          {/* Camera controls */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#020a03]">
            {/* Gallery shortcut */}
            <button
              onClick={() => {
                stopCamera();
                setShowGallery(true);
              }}
              className="w-12 h-12 rounded-xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center overflow-hidden"
            >
              {capturedPhotos.length > 0 ? (
                <img
                  src={capturedPhotos[capturedPhotos.length - 1].thumbnailDataUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <Image size={20} className="text-[var(--text3)]" />
              )}
            </button>

            {/* Shutter button */}
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-[var(--green)] flex items-center justify-center active:scale-90 transition-transform"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            {/* Switch camera */}
            <button
              onClick={switchCamera}
              className="w-12 h-12 rounded-xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--text2)]"
            >
              <SwitchCamera size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
