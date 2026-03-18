/**
 * TimelineScrubber — Draggable timeline from 2026 → 2080 with play/pause animation,
 * event markers, decade labels, and a color gradient from green (now) → teal → blue (far future).
 */

import { useRef, useCallback, useEffect, useState, type PointerEvent as RPointerEvent } from 'react';
import { Play, Pause, SkipBack, FastForward } from 'lucide-react';
import type { TimelineEvent } from '@/hooks/useDigitalTwin';

interface TimelineScrubberProps {
  currentYear: number;
  startYear?: number;
  endYear?: number;
  events: TimelineEvent[];
  isPlaying: boolean;
  playSpeed: number;
  onYearChange: (year: number) => void;
  onTogglePlay: () => void;
  onSpeedChange: (speed: number) => void;
}

const START = 2026;
const END = 2080;
const DECADES = [2030, 2040, 2050, 2060, 2070, 2080];

const EVENT_COLORS: Record<string, string> = {
  thinning: '#4ade80',
  harvest: '#f97316',
  replanting: '#06b6d4',
  climate_milestone: '#f59e0b',
  beetle_risk: '#ef4444',
  storm_risk: '#8b5cf6',
};

const EVENT_ICONS: Record<string, string> = {
  thinning: '✂',
  harvest: '🪓',
  replanting: '🌱',
  climate_milestone: '🌡',
  beetle_risk: '🪲',
  storm_risk: '⛈',
};

export function TimelineScrubber({
  currentYear,
  events,
  isPlaying,
  playSpeed,
  onYearChange,
  onTogglePlay,
  onSpeedChange,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState<TimelineEvent | null>(null);

  const yearToPercent = (year: number) => ((year - START) / (END - START)) * 100;
  const percentToYear = (pct: number) => Math.round(START + (pct / 100) * (END - START));

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    onYearChange(percentToYear(pct));
  }, [onYearChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  const handlePointerDown = useCallback((e: RPointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    if (trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      onYearChange(percentToYear(pct));
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp, onYearChange]);

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const pct = yearToPercent(currentYear);

  // Deduplicate events by year (show only first per year)
  const uniqueEvents = events.reduce<TimelineEvent[]>((acc, ev) => {
    if (!acc.find(e => e.year === ev.year && e.type === ev.type)) acc.push(ev);
    return acc;
  }, []);

  const speeds = [0.5, 1, 2, 4];
  const nextSpeed = () => {
    const idx = speeds.indexOf(playSpeed);
    onSpeedChange(speeds[(idx + 1) % speeds.length]);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Controls row */}
      <div className="flex items-center gap-3 mb-3">
        <button
          onClick={() => onYearChange(START)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors text-[var(--text3)] hover:text-[var(--text)]"
          title="Återställ till 2026"
        >
          <SkipBack size={14} />
        </button>

        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all text-white"
          style={{
            background: isPlaying
              ? 'linear-gradient(135deg, #f97316, #ef4444)'
              : 'linear-gradient(135deg, #4ade80, #06b6d4)',
            boxShadow: isPlaying
              ? '0 0 20px rgba(249,115,22,0.3)'
              : '0 0 20px rgba(74,222,128,0.3)',
          }}
          title={isPlaying ? 'Pausa' : 'Spela upp tidslinje'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <button
          onClick={nextSpeed}
          className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 hover:bg-[var(--bg3)] transition-colors text-[var(--text3)] hover:text-[var(--text)] font-mono text-xs"
          title="Hastighet"
        >
          <FastForward size={12} />
          {playSpeed}x
        </button>

        <div className="flex-1" />

        {/* Current year display */}
        <div
          className="font-mono text-2xl font-bold tracking-tight transition-all duration-300"
          style={{
            color: pct < 30 ? '#4ade80' : pct < 65 ? '#06b6d4' : '#6366f1',
            textShadow: `0 0 30px ${pct < 30 ? 'rgba(74,222,128,0.4)' : pct < 65 ? 'rgba(6,182,212,0.4)' : 'rgba(99,102,241,0.4)'}`,
          }}
        >
          {currentYear}
        </div>
      </div>

      {/* Timeline track */}
      <div className="relative pt-6 pb-4">
        {/* Event markers */}
        <div className="absolute top-0 left-0 right-0 h-5">
          {uniqueEvents.map((ev, i) => {
            const evPct = yearToPercent(ev.year);
            return (
              <div
                key={`${ev.year}-${ev.type}-${i}`}
                className="absolute -translate-x-1/2 cursor-pointer transition-transform hover:scale-125"
                style={{ left: `${evPct}%` }}
                onMouseEnter={() => setHoveredEvent(ev)}
                onMouseLeave={() => setHoveredEvent(null)}
                title={`${ev.year}: ${ev.label}`}
              >
                <span className="text-[10px]">{EVENT_ICONS[ev.type] || '●'}</span>
              </div>
            );
          })}

          {/* Hover tooltip */}
          {hoveredEvent && (
            <div
              className="absolute -top-10 -translate-x-1/2 px-2 py-1 rounded-md text-[10px] font-medium whitespace-nowrap z-10 border"
              style={{
                left: `${yearToPercent(hoveredEvent.year)}%`,
                background: 'var(--surface)',
                borderColor: EVENT_COLORS[hoveredEvent.type] || 'var(--border)',
                color: 'var(--text)',
              }}
            >
              {hoveredEvent.year}: {hoveredEvent.label}
            </div>
          )}
        </div>

        {/* Track background with gradient */}
        <div
          ref={trackRef}
          className="relative h-3 rounded-full cursor-pointer select-none"
          style={{
            background: 'linear-gradient(to right, rgba(74,222,128,0.15), rgba(6,182,212,0.15), rgba(99,102,241,0.15))',
          }}
          onPointerDown={handlePointerDown}
        >
          {/* Filled portion */}
          <div
            className="absolute top-0 left-0 h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(to right, #4ade80, #06b6d4 50%, #6366f1)`,
              transitionDuration: isDragging ? '0ms' : '150ms',
              boxShadow: '0 0 12px rgba(74,222,128,0.3)',
            }}
          />

          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all"
            style={{
              left: `${pct}%`,
              transitionDuration: isDragging ? '0ms' : '150ms',
            }}
          >
            <div
              className="w-5 h-5 rounded-full border-2 border-white shadow-lg transition-transform"
              style={{
                background: pct < 30 ? '#4ade80' : pct < 65 ? '#06b6d4' : '#6366f1',
                transform: isDragging ? 'scale(1.3)' : 'scale(1)',
                boxShadow: `0 0 16px ${pct < 30 ? 'rgba(74,222,128,0.5)' : pct < 65 ? 'rgba(6,182,212,0.5)' : 'rgba(99,102,241,0.5)'}`,
              }}
            />
          </div>

          {/* Decade markers */}
          {DECADES.map(decade => (
            <div
              key={decade}
              className="absolute top-full mt-2 -translate-x-1/2"
              style={{ left: `${yearToPercent(decade)}%` }}
            >
              <div
                className="w-px h-2 mx-auto mb-0.5"
                style={{ background: 'var(--border)' }}
              />
              <span className="text-[9px] font-mono text-[var(--text3)]">
                {decade}
              </span>
            </div>
          ))}

          {/* Start label */}
          <div className="absolute top-full mt-2 left-0">
            <span className="text-[9px] font-mono text-[var(--green)]">2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
