import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  GripVertical,
  Calendar,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/* ─── Types ─── */

export interface SatelliteComparisonProps {
  parcelId: string;
  parcelName: string;
}

type LayerType = 'ndvi' | 'trueColor' | 'falseColor';

interface DatePreset {
  label: string;
  monthsAgo: number;
}

interface ChangeDetection {
  ndviChange: number;
  affectedHectares: number;
  description: string;
  severity: 'none' | 'low' | 'moderate' | 'high' | 'critical';
}

/* ─── Constants ─── */

const DATE_PRESETS: DatePreset[] = [
  { label: 'Last month', monthsAgo: 1 },
  { label: '6 months ago', monthsAgo: 6 },
  { label: 'Last year', monthsAgo: 12 },
  { label: '2 years ago', monthsAgo: 24 },
];

const LAYERS: { id: LayerType; label: string }[] = [
  { id: 'ndvi', label: 'NDVI' },
  { id: 'trueColor', label: 'True Color' },
  { id: 'falseColor', label: 'False Color' },
];

const SEVERITY_COLORS: Record<string, string> = {
  none: '#4ade80',
  low: '#a3e635',
  moderate: '#facc15',
  high: '#f97316',
  critical: '#ef4444',
};

/* ─── Demo synthetic image generation ─── */

function generateSyntheticImage(
  canvas: HTMLCanvasElement,
  layer: LayerType,
  seed: number,
  degradation: number,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Simple seeded pseudo-random
  const rand = (x: number, y: number) => {
    const n = Math.sin(seed * 127.1 + x * 311.7 + y * 183.3) * 43758.5453;
    return n - Math.floor(n);
  };

  const imageData = ctx.createImageData(w, h);
  const d = imageData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const noise = rand(x * 0.02, y * 0.02);
      const noise2 = rand(x * 0.05 + 100, y * 0.05 + 100);

      // Base health value (0 = dead, 1 = healthy)
      let health = 0.6 + 0.35 * noise - degradation * 0.3;
      // Add a stressed patch in the northwest for degraded images
      const nwDist = Math.sqrt((x / w) ** 2 + (y / h) ** 2);
      if (nwDist < 0.5) {
        health -= degradation * 0.25 * (1 - nwDist / 0.5);
      }
      health = Math.max(0, Math.min(1, health + noise2 * 0.1));

      if (layer === 'ndvi') {
        // Green = healthy, Yellow = moderate, Brown/Red = stressed
        if (health > 0.6) {
          d[i] = Math.floor(30 + (1 - health) * 80);
          d[i + 1] = Math.floor(120 + health * 100);
          d[i + 2] = Math.floor(20 + (1 - health) * 40);
        } else if (health > 0.3) {
          d[i] = Math.floor(180 + (0.6 - health) * 120);
          d[i + 1] = Math.floor(160 + health * 60);
          d[i + 2] = Math.floor(20);
        } else {
          d[i] = Math.floor(140 + (0.3 - health) * 200);
          d[i + 1] = Math.floor(60 + health * 120);
          d[i + 2] = Math.floor(20);
        }
      } else if (layer === 'trueColor') {
        // Natural greens/browns
        d[i] = Math.floor(40 + (1 - health) * 100 + noise2 * 30);
        d[i + 1] = Math.floor(80 + health * 100 + noise2 * 20);
        d[i + 2] = Math.floor(30 + noise2 * 30);
      } else {
        // False color: bright red = vegetation, blue = water/bare
        d[i] = Math.floor(health * 220 + noise2 * 30);
        d[i + 1] = Math.floor(40 + health * 60);
        d[i + 2] = Math.floor(60 + (1 - health) * 140 + noise2 * 30);
      }
      d[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/* ─── Demo change detection ─── */

function computeDemoChange(parcelId: string, monthsBetween: number): ChangeDetection {
  // Use parcelId hash for deterministic results
  const hash = parcelId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const baseChange = -((hash % 20) + 3); // -3 to -22
  const scaledChange = baseChange * Math.min(monthsBetween / 12, 1.5);
  const ndviChange = Math.round(scaledChange * 10) / 10;
  const affectedHa = Math.round(((hash % 40) + 10) * (Math.abs(ndviChange) / 15) * 10) / 10;

  let severity: ChangeDetection['severity'] = 'none';
  if (Math.abs(ndviChange) > 20) severity = 'critical';
  else if (Math.abs(ndviChange) > 15) severity = 'high';
  else if (Math.abs(ndviChange) > 10) severity = 'moderate';
  else if (Math.abs(ndviChange) > 5) severity = 'low';

  const direction = ndviChange < -10 ? 'northwest' : ndviChange < -5 ? 'eastern' : 'central';

  return {
    ndviChange,
    affectedHectares: affectedHa,
    description: `NDVI ${ndviChange < 0 ? 'decreased' : 'increased'} by ${Math.abs(ndviChange).toFixed(1)}% in the ${direction} section`,
    severity,
  };
}

/* ─── Date helpers ─── */

function monthsAgoDate(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function monthsBetween(d1: string, d2: string): number {
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.abs((b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth());
}

/* ─── Loading Skeleton ─── */

function ComparisonSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-20 rounded-lg"
            style={{ background: 'var(--bg3)' }}
          />
        ))}
      </div>
      <div
        className="w-full aspect-[16/9] rounded-xl"
        style={{ background: 'var(--bg3)' }}
      />
      <div className="flex gap-3">
        <div className="h-16 flex-1 rounded-lg" style={{ background: 'var(--bg3)' }} />
        <div className="h-16 flex-1 rounded-lg" style={{ background: 'var(--bg3)' }} />
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export function SatelliteComparison({ parcelId, parcelName }: SatelliteComparisonProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [layer, setLayer] = useState<LayerType>('ndvi');
  const [beforeDate, setBeforeDate] = useState(monthsAgoDate(12));
  const [afterDate, setAfterDate] = useState(new Date().toISOString().slice(0, 10));
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [change, setChange] = useState<ChangeDetection | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const beforeCanvasRef = useRef<HTMLCanvasElement>(null);
  const afterCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render synthetic images when inputs change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const w = 640;
      const h = 360;

      if (beforeCanvasRef.current) {
        beforeCanvasRef.current.width = w;
        beforeCanvasRef.current.height = h;
        const seed = parcelId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + 1;
        generateSyntheticImage(beforeCanvasRef.current, layer, seed, 0);
      }

      if (afterCanvasRef.current) {
        afterCanvasRef.current.width = w;
        afterCanvasRef.current.height = h;
        const seed = parcelId.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + 2;
        const months = monthsBetween(beforeDate, afterDate);
        const degradation = Math.min(months / 24, 1);
        generateSyntheticImage(afterCanvasRef.current, layer, seed, degradation);
      }

      const months = monthsBetween(beforeDate, afterDate);
      setChange(computeDemoChange(parcelId, months));
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [parcelId, layer, beforeDate, afterDate]);

  // Slider drag logic
  const handlePointerDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global pointer up to handle drag ending outside
  useEffect(() => {
    if (!isDragging) return;
    const up = () => setIsDragging(false);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  }, [isDragging]);

  const handleAskWingman = useCallback(() => {
    if (!change) return;
    const query = encodeURIComponent(
      `My parcel "${parcelName}" shows ${change.description}. ${change.affectedHectares} hectares are affected. What should I do?`,
    );
    navigate(`/owner/wingman?q=${query}`);
  }, [navigate, parcelName, change]);

  const applyPreset = useCallback((months: number) => {
    setBeforeDate(monthsAgoDate(months));
    setAfterDate(new Date().toISOString().slice(0, 10));
  }, []);

  if (isLoading && !change) {
    return <ComparisonSkeleton />;
  }

  return (
    <div className="space-y-5">
      {/* ─── Controls Row ─── */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        {/* Date pickers */}
        <div className="flex gap-2 items-end flex-1">
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
              Before
            </label>
            <input
              type="date"
              value={beforeDate}
              onChange={(e) => setBeforeDate(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-[var(--border)] text-xs
                text-[var(--text)] font-mono"
              style={{ background: 'var(--bg)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
              After
            </label>
            <input
              type="date"
              value={afterDate}
              onChange={(e) => setAfterDate(e.target.value)}
              className="w-full h-9 px-2.5 rounded-lg border border-[var(--border)] text-xs
                text-[var(--text)] font-mono"
              style={{ background: 'var(--bg)' }}
            />
          </div>
        </div>

        {/* Presets */}
        <div className="flex gap-1.5 flex-wrap">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.monthsAgo}
              onClick={() => applyPreset(p.monthsAgo)}
              className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-[10px] font-medium
                text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              style={{ background: 'var(--bg2)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Layer Toggle ─── */}
      <div className="flex items-center gap-1.5">
        <Layers size={14} className="text-[var(--text3)]" />
        {LAYERS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLayer(l.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              layer === l.id
                ? 'bg-[var(--green)] text-white'
                : 'border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)]'
            }`}
            style={layer !== l.id ? { background: 'var(--bg2)' } : undefined}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* ─── Split View Comparison ─── */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-[var(--border)] select-none touch-none"
        style={{ background: 'var(--bg3)' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'var(--bg2)' }}>
            <Loader2 size={24} className="text-[var(--green)] animate-spin" />
          </div>
        )}

        {/* After image (full width, behind) */}
        <canvas
          ref={afterCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ objectFit: 'cover' }}
        />

        {/* Before image (clipped to left portion) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <canvas
            ref={beforeCanvasRef}
            className="absolute inset-0 h-full"
            style={{
              width: containerRef.current
                ? `${containerRef.current.offsetWidth}px`
                : '100%',
              maxWidth: 'none',
              objectFit: 'cover',
            }}
          />
        </div>

        {/* Date labels */}
        <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-md text-[10px] font-mono font-semibold text-white bg-black/50">
          {formatDate(beforeDate)}
        </div>
        <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md text-[10px] font-mono font-semibold text-white bg-black/50">
          {formatDate(afterDate)}
        </div>

        {/* Slider handle */}
        <div
          className="absolute top-0 bottom-0 z-20 flex items-center cursor-col-resize"
          style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
          onPointerDown={handlePointerDown}
        >
          <div className="w-0.5 h-full bg-white/80" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center
              bg-white shadow-lg border-2 border-[var(--green)]"
          >
            <GripVertical size={14} className="text-[var(--green)]" />
          </div>
        </div>
      </div>

      {/* ─── Change Detection Summary ─── */}
      {change && (
        <div
          className="rounded-xl border border-[var(--border)] p-4 space-y-3"
          style={{ background: 'var(--bg2)' }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-[var(--text3)]" />
            <span className="text-sm font-semibold text-[var(--text)]">
              Change Detection
            </span>
            <span
              className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
              style={{
                background: `${SEVERITY_COLORS[change.severity]}18`,
                color: SEVERITY_COLORS[change.severity],
              }}
            >
              {change.severity}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* NDVI change */}
            <div
              className="rounded-lg border border-[var(--border)] p-3"
              style={{ background: 'var(--bg)' }}
            >
              <div className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
                NDVI Change
              </div>
              <div className="flex items-center gap-1.5">
                {change.ndviChange < 0 ? (
                  <TrendingDown size={16} style={{ color: SEVERITY_COLORS[change.severity] }} />
                ) : change.ndviChange > 0 ? (
                  <TrendingUp size={16} className="text-green-500" />
                ) : (
                  <Minus size={16} className="text-gray-400" />
                )}
                <span className="text-lg font-bold font-mono text-[var(--text)]">
                  {change.ndviChange > 0 ? '+' : ''}
                  {change.ndviChange.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Affected area */}
            <div
              className="rounded-lg border border-[var(--border)] p-3"
              style={{ background: 'var(--bg)' }}
            >
              <div className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
                Affected Area
              </div>
              <span className="text-lg font-bold font-mono text-[var(--text)]">
                {change.affectedHectares} ha
              </span>
            </div>

            {/* Time span */}
            <div
              className="rounded-lg border border-[var(--border)] p-3"
              style={{ background: 'var(--bg)' }}
            >
              <div className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
                Time Span
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-[var(--text3)]" />
                <span className="text-lg font-bold font-mono text-[var(--text)]">
                  {monthsBetween(beforeDate, afterDate)} mo
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--text2)] leading-relaxed">
            {change.description}. Approximately {change.affectedHectares} hectares show significant change.
          </p>

          {/* Ask Wingman button */}
          <button
            onClick={handleAskWingman}
            className="w-full py-2.5 px-4 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20
              text-xs font-semibold text-[var(--green)] hover:bg-[var(--green)]/15
              transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            Ask Wingman about this change
          </button>
        </div>
      )}
    </div>
  );
}
