import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Camera,
  SwitchCamera,
  X,
  MapPin,
  Sparkles,
  Trash2,
  Image as ImageIcon,
  ZoomIn,
} from 'lucide-react';

// ─── Types ───

interface CapturedPhoto {
  id: string;
  dataUrl: string;
  timestamp: Date;
  lat: number | null;
  lng: number | null;
}

interface FieldCameraProps {
  onCapture?: (photo: CapturedPhoto) => void;
  onClose?: () => void;
}

// ─── FieldCamera ───

export default function FieldCamera({ onCapture, onClose }: FieldCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<CapturedPhoto | null>(null);

  // GPS tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }
      setError(null);
    } catch {
      setError('Kunde inte komma åt kameran. Kontrollera behörigheter.');
    }
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };

  }, [facingMode]);

  const switchCamera = () => {
    setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'));
  };

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Overlay GPS coordinates
    if (gps) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, canvas.height - 48, canvas.width, 48);
      ctx.fillStyle = '#4ade80';
      ctx.font = '16px monospace';
      ctx.fillText(
        `📍 ${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}  |  ${new Date().toLocaleTimeString('sv-SE')}`,
        12,
        canvas.height - 16,
      );
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const photo: CapturedPhoto = {
      id: crypto.randomUUID(),
      dataUrl,
      timestamp: new Date(),
      lat: gps?.lat ?? null,
      lng: gps?.lng ?? null,
    };
    setPhotos((prev) => [photo, ...prev]);
    onCapture?.(photo);
  }, [gps, onCapture]);

  const deletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (selectedPhoto?.id === id) setSelectedPhoto(null);
  };

  // ─── Gallery view ───
  if (showGallery) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold text-lg">Fältfoton ({photos.length})</h2>
          <button
            onClick={() => { setShowGallery(false); setSelectedPhoto(null); }}
            className="p-3 rounded-full bg-gray-800 text-white min-w-[48px] min-h-[48px] flex items-center justify-center"
          >
            <X size={24} />
          </button>
        </div>

        {selectedPhoto ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
            <img src={selectedPhoto.dataUrl} alt="Foto" className="max-w-full max-h-[60vh] rounded-lg" />
            <div className="text-gray-400 text-sm flex items-center gap-2">
              <MapPin size={14} />
              {selectedPhoto.lat != null
                ? `${selectedPhoto.lat.toFixed(6)}, ${selectedPhoto.lng?.toFixed(6)}`
                : 'Ingen GPS'}
              <span className="mx-2">|</span>
              {selectedPhoto.timestamp.toLocaleString('sv-SE')}
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-amber-900/40 border border-amber-700 rounded-lg">
              <Sparkles size={18} className="text-amber-400" />
              <span className="text-amber-300 text-sm">AI-identifiering kommer snart</span>
            </div>
            <button
              onClick={() => deletePhoto(selectedPhoto.id)}
              className="flex items-center gap-2 px-6 py-3 bg-red-900/60 text-red-300 rounded-xl min-h-[48px]"
            >
              <Trash2 size={18} /> Ta bort
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {photos.length === 0 ? (
              <div className="text-gray-500 text-center mt-20">Inga foton tagna ännu</div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {photos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPhoto(p)}
                    className="relative rounded-lg overflow-hidden aspect-[4/3] group"
                  >
                    <img src={p.dataUrl} alt="Foto" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-active:bg-black/30 transition" />
                    <div className="absolute top-2 right-2 p-1 bg-black/50 rounded-full">
                      <ZoomIn size={14} className="text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Camera view ───
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/60 relative z-10">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-gray-800/80 text-white min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          <X size={24} />
        </button>
        <div className="text-green-400 text-sm font-mono flex items-center gap-1">
          <MapPin size={14} />
          {gps ? `${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'Söker GPS...'}
        </div>
        <button
          onClick={switchCamera}
          className="p-3 rounded-full bg-gray-800/80 text-white min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          <SwitchCamera size={24} />
        </button>
      </div>

      {/* Video */}
      <div className="flex-1 relative">
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-400 p-8 text-center">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-around p-6 bg-black/80">
        <button
          onClick={() => setShowGallery(true)}
          className="relative p-3 rounded-full bg-gray-800 text-white min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          <ImageIcon size={24} />
          {photos.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full text-xs text-black font-bold flex items-center justify-center">
              {photos.length}
            </span>
          )}
        </button>

        <button
          onClick={capture}
          className="w-[72px] h-[72px] rounded-full bg-white border-4 border-green-500 flex items-center justify-center active:scale-90 transition-transform"
        >
          <Camera size={32} className="text-gray-900" />
        </button>

        <div className="w-[48px]" /> {/* spacer */}
      </div>
    </div>
  );
}
