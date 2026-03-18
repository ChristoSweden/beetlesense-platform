import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Save,
  MapPin,
  Clock,
  X,
} from 'lucide-react';

// ─── Types ───

interface VoiceNote {
  id: string;
  audioUrl: string;
  duration: number;
  timestamp: Date;
  lat: number | null;
  lng: number | null;
}

interface VoiceRecorderProps {
  onSave?: (note: VoiceNote) => void;
  onClose?: () => void;
}

// ─── Format seconds to mm:ss ───

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── VoiceRecorder ───

export default function VoiceRecorder({ onSave, onClose }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop());
    };

  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Discard previous recording
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      setPlaybackTime(0);
      setDuration(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);

      setError(null);
    } catch {
      setError('Kunde inte komma åt mikrofonen. Kontrollera behörigheter.');
    }
  }, [audioUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setDuration(recordingTime);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [recordingTime]);

  const togglePlayback = useCallback(() => {
    if (!audioUrl) return;

    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
    };

    audio.play();
    setIsPlaying(true);
    setPlaybackTime(0);

    playbackTimerRef.current = setInterval(() => {
      setPlaybackTime((t) => t + 1);
    }, 1000);
  }, [audioUrl, isPlaying]);

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setPlaybackTime(0);
    setDuration(0);
    setIsPlaying(false);
    audioRef.current?.pause();
    if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
  };

  const handleSave = () => {
    if (!audioUrl) return;
    const note: VoiceNote = {
      id: crypto.randomUUID(),
      audioUrl,
      duration,
      timestamp: new Date(),
      lat: gps?.lat ?? null,
      lng: gps?.lng ?? null,
    };
    onSave?.(note);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <h2 className="text-white font-semibold text-lg flex items-center gap-2">
          <Mic size={22} className="text-green-400" />
          Röstanteckning
        </h2>
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-gray-800 text-white min-w-[48px] min-h-[48px] flex items-center justify-center"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {error && (
          <div className="text-red-400 bg-red-950/50 border border-red-800 rounded-xl p-3 text-sm text-center w-full">
            {error}
          </div>
        )}

        {/* GPS badge */}
        <div className="flex items-center gap-2 text-sm font-mono text-green-400">
          <MapPin size={14} />
          {gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : 'Söker GPS-position...'}
        </div>

        {/* Timer display */}
        <div className="text-6xl font-mono font-bold text-white tracking-wider">
          {isRecording
            ? formatTime(recordingTime)
            : audioUrl
              ? formatTime(isPlaying ? playbackTime : duration)
              : '00:00'}
        </div>

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            Spelar in...
          </div>
        )}

        {/* Waveform placeholder */}
        <div className="w-full h-16 flex items-center justify-center gap-[3px]">
          {Array.from({ length: 32 }).map((_, i) => {
            const h = isRecording
              ? Math.random() * 48 + 8
              : audioUrl
                ? 12 + Math.sin(i * 0.5) * 20
                : 8;
            return (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isRecording ? 'bg-red-500' : audioUrl ? 'bg-green-500' : 'bg-gray-700'
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6">
          {!audioUrl && !isRecording && (
            <button
              onClick={startRecording}
              className="w-[88px] h-[88px] rounded-full bg-red-600 text-white flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-red-900/50"
            >
              <Mic size={40} />
            </button>
          )}

          {isRecording && (
            <button
              onClick={stopRecording}
              className="w-[88px] h-[88px] rounded-full bg-gray-800 border-4 border-red-500 text-red-400 flex items-center justify-center active:scale-90 transition-transform animate-pulse"
            >
              <Square size={36} />
            </button>
          )}

          {audioUrl && !isRecording && (
            <>
              <button
                onClick={discardRecording}
                className="w-[56px] h-[56px] rounded-full bg-gray-800 border border-gray-700 text-red-400 flex items-center justify-center"
              >
                <Trash2 size={24} />
              </button>
              <button
                onClick={togglePlayback}
                className="w-[72px] h-[72px] rounded-full bg-green-700 text-white flex items-center justify-center active:scale-90 transition-transform"
              >
                {isPlaying ? <Pause size={32} /> : <Play size={32} />}
              </button>
              <button
                onClick={handleSave}
                className="w-[56px] h-[56px] rounded-full bg-green-600 text-white flex items-center justify-center"
              >
                <Save size={24} />
              </button>
            </>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-gray-500 text-sm flex items-center gap-2">
          <Clock size={14} />
          {new Date().toLocaleString('sv-SE')}
        </div>
      </div>
    </div>
  );
}
