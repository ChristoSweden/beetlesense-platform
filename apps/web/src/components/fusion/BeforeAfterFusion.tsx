import { useMemo } from 'react';
import { Satellite, Layers, HelpCircle, ShieldCheck, Bug } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

interface SatelliteOnlyData {
  ndvi: number;
  resolution: string;
  confidence: number;
  diagnosis: string;
  sourcesUsed: number;
}

interface FusedData {
  ndvi: number;
  resolution: string;
  confidence: number;
  diagnosis: string;
  sourcesUsed: number;
  sources: string[];
}

export interface FusionComparison {
  parcelName: string;
  satelliteOnly: SatelliteOnlyData;
  fused: FusedData;
}

interface BeforeAfterFusionProps {
  data: FusionComparison;
  className?: string;
}

/* ── Cell risk for simulated NDVI grids ────────────────────────── */

type CellLevel = 'healthy' | 'stressed' | 'warning' | 'infested';

const SATELLITE_COLORS: Record<CellLevel, string> = {
  healthy: '#9ca38f',
  stressed: '#b5a96a',
  warning: '#b89e72',
  infested: '#a88080',
};

const FUSION_COLORS: Record<CellLevel, string> = {
  healthy: 'var(--risk-low)',
  stressed: 'var(--banana)',
  warning: 'var(--risk-mid)',
  infested: 'var(--risk-high)',
};

/* 4x4 coarse satellite grid (blurry, imprecise) */
const SAT_GRID: CellLevel[] = [
  'healthy', 'healthy', 'stressed', 'healthy',
  'healthy', 'stressed', 'warning', 'stressed',
  'healthy', 'stressed', 'stressed', 'healthy',
  'healthy', 'healthy', 'healthy', 'healthy',
];

/* 8x8 sharp fusion grid (precise, beetle markers) */
const FUSION_GRID: (CellLevel | 'beetle')[] = [
  'healthy', 'healthy', 'healthy', 'healthy', 'stressed', 'stressed', 'healthy', 'healthy',
  'healthy', 'healthy', 'stressed', 'stressed', 'warning', 'warning', 'stressed', 'healthy',
  'healthy', 'stressed', 'warning', 'beetle', 'beetle', 'warning', 'stressed', 'healthy',
  'healthy', 'stressed', 'warning', 'beetle', 'beetle', 'infested', 'stressed', 'healthy',
  'healthy', 'healthy', 'stressed', 'warning', 'warning', 'stressed', 'healthy', 'healthy',
  'healthy', 'healthy', 'stressed', 'stressed', 'stressed', 'healthy', 'healthy', 'healthy',
  'healthy', 'healthy', 'healthy', 'healthy', 'stressed', 'healthy', 'healthy', 'healthy',
  'healthy', 'healthy', 'healthy', 'healthy', 'healthy', 'healthy', 'healthy', 'healthy',
];

/* ── Confidence ring SVG ───────────────────────────────────────── */

function ConfidenceRing({ value, color, size = 56 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value);

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.22}
        fontFamily="var(--font-mono)"
        fontWeight={700}
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

/* ── Source badge ───────────────────────────────────────────────── */

function SourceBadge({ count, expanded }: { count: number; expanded?: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{
          backgroundColor: count > 1 ? 'var(--green)' : 'var(--bg3)',
          color: count > 1 ? '#fff' : 'var(--text3)',
        }}
      >
        {count} source{count !== 1 ? 's' : ''}
      </span>
      {expanded && expanded.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {expanded.map((s) => (
            <span
              key={s}
              className="inline-block px-1.5 py-px rounded text-[9px] font-medium bg-[var(--bg3)] text-[var(--text2)]"
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────── */

export function BeforeAfterFusion({ data, className = '' }: BeforeAfterFusionProps) {
  const { parcelName, satelliteOnly, fused } = data;

  const satConfColor = useMemo(() => {
    if (satelliteOnly.confidence >= 0.7) return 'var(--risk-low)';
    if (satelliteOnly.confidence >= 0.4) return 'var(--risk-mid)';
    return 'var(--risk-high)';
  }, [satelliteOnly.confidence]);

  const fusedConfColor = useMemo(() => {
    if (fused.confidence >= 0.7) return 'var(--risk-low)';
    if (fused.confidence >= 0.4) return 'var(--risk-mid)';
    return 'var(--risk-high)';
  }, [fused.confidence]);

  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 transition-shadow hover:shadow-lg ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Layers size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          Why Multi-Source Fusion Matters
        </h3>
      </div>
      <p className="text-xs text-[var(--text3)] mb-4">
        Parcel: <span className="font-medium text-[var(--text2)]">{parcelName}</span>
      </p>

      {/* Two-card comparison */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-0 md:gap-0 items-stretch">

        {/* ── LEFT: Satellite Only ──────────────────────────────── */}
        <div
          className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-4 flex flex-col gap-3"
          style={{ filter: 'blur(0.5px)' }}
        >
          <div className="flex items-center gap-1.5">
            <Satellite size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text3)]">
              Satellite Only
            </span>
          </div>

          {/* Coarse 4x4 pixelated grid */}
          <div className="grid grid-cols-4 gap-1 w-full max-w-[160px] mx-auto aspect-square opacity-70">
            {SAT_GRID.map((level, i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{ backgroundColor: SATELLITE_COLORS[level] }}
              />
            ))}
          </div>

          {/* Confidence indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-[var(--border)] bg-[var(--bg)]">
              <HelpCircle size={28} className="text-[var(--text3)]" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[var(--text3)]">
                {Math.round(satelliteOnly.confidence * 100)}% confidence
              </span>
              <span className="text-[10px] text-[var(--text3)]">
                {satelliteOnly.resolution} resolution
              </span>
            </div>
          </div>

          {/* Diagnosis */}
          <p className="text-xs text-[var(--text3)] italic leading-relaxed">
            &ldquo;{satelliteOnly.diagnosis}&rdquo;
          </p>

          <SourceBadge count={satelliteOnly.sourcesUsed} />
        </div>

        {/* ── VS divider ────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col items-center justify-center px-3">
          <div className="w-px flex-1 bg-[var(--border)]" />
          <div
            className="w-9 h-9 rounded-full border-2 border-[var(--green)] bg-[var(--bg)] flex items-center justify-center my-2"
          >
            <span className="text-[11px] font-bold text-[var(--green)]">VS</span>
          </div>
          <div className="w-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Mobile VS divider */}
        <div className="flex md:hidden items-center justify-center py-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <div
            className="w-9 h-9 rounded-full border-2 border-[var(--green)] bg-[var(--bg)] flex items-center justify-center mx-3"
          >
            <span className="text-[11px] font-bold text-[var(--green)]">VS</span>
          </div>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* ── RIGHT: BeetleSense Fusion ─────────────────────────── */}
        <div className="rounded-lg border border-[var(--green)]/30 bg-[var(--bg2)] p-4 flex flex-col gap-3 ring-1 ring-[var(--green)]/10">
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-[var(--green)]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--green)]">
              BeetleSense Fusion
            </span>
          </div>

          {/* Sharp 8x8 detailed grid */}
          <div className="grid grid-cols-8 gap-[2px] w-full max-w-[200px] mx-auto aspect-square">
            {FUSION_GRID.map((level, i) => {
              const isBeetle = level === 'beetle';
              const cellLevel: CellLevel = isBeetle ? 'infested' : level;
              return (
                <div
                  key={i}
                  className="relative rounded-[2px] flex items-center justify-center"
                  style={{ backgroundColor: FUSION_COLORS[cellLevel] }}
                >
                  {isBeetle && <Bug size={10} className="text-white drop-shadow" />}
                </div>
              );
            })}
          </div>

          {/* Confidence ring */}
          <div className="flex items-center gap-3">
            <ConfidenceRing value={fused.confidence} color={fusedConfColor} />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-[var(--text)]">
                {Math.round(fused.confidence * 100)}% confidence
              </span>
              <span className="text-[10px] text-[var(--text2)]">
                {fused.resolution} resolution
              </span>
            </div>
          </div>

          {/* Diagnosis */}
          <div className="flex items-start gap-1.5">
            <ShieldCheck size={14} className="text-[var(--green)] mt-0.5 shrink-0" />
            <p className="text-xs font-medium text-[var(--text)] leading-relaxed">
              {fused.diagnosis}
            </p>
          </div>

          <SourceBadge count={fused.sourcesUsed} expanded={fused.sources} />
        </div>
      </div>
    </div>
  );
}

export default BeforeAfterFusion;
