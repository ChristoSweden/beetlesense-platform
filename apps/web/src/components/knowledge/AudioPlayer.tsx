import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);

  useEffect(() => {
    const audio = new Audio(src);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('timeupdate', () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    });
    audio.addEventListener('ended', () => {
      setPlaying(false);
      setProgress(0);
    });

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlaying(!playing);
  }, [playing]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  }, []);

  const cycleSpeed = useCallback(() => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next];
    }
  }, [speedIdx]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full flex items-center justify-center bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20 transition-colors flex-shrink-0"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="h-1.5 rounded-full bg-[var(--bg3)] cursor-pointer relative"
          onClick={handleSeek}
          role="slider"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Audio progress"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--green)] transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] font-mono text-[var(--text3)]">
            {formatTime(progress * duration)}
          </span>
          <span className="text-[9px] font-mono text-[var(--text3)]">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <button
        onClick={cycleSpeed}
        className="text-[9px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded hover:text-[var(--text2)] transition-colors flex-shrink-0"
        aria-label={`Playback speed ${SPEEDS[speedIdx]}x`}
      >
        {SPEEDS[speedIdx]}x
      </button>
    </div>
  );
}
