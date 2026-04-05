import { useMemo, useState } from 'react';
import { Layers } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ConfidenceBandProps {
  value: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  confidence: ConfidenceLevel;
  sourceCount: number;
  lastUpdated?: string;
}

/* ── Constants ─────────────────────────────────────────────────── */

const CONFIDENCE_META: Record<ConfidenceLevel, { color: string; label: string }> = {
  high:   { color: 'var(--risk-low)',  label: 'High' },
  medium: { color: 'var(--risk-mid)',  label: 'Medium' },
  low:    { color: 'var(--risk-high)', label: 'Low' },
};

/* raw hex values for gradient stops (mirrors the CSS vars) */
const RAW_COLORS: Record<ConfidenceLevel, string> = {
  high:   '#10b981',
  medium: '#f59e0b',
  low:    '#ef4444',
};

/* ── Helpers ───────────────────────────────────────────────────── */

function fmt(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

/* ── Component ─────────────────────────────────────────────────── */

export function ConfidenceBand({
  value,
  min,
  max,
  unit,
  label,
  confidence,
  sourceCount,
  lastUpdated,
}: ConfidenceBandProps) {
  const { color, label: confLabel } = CONFIDENCE_META[confidence];
  const rawColor = RAW_COLORS[confidence];

  const range = max - min;
  const plusMinus = range > 0 ? range / 2 : 0;

  const [showTooltip, setShowTooltip] = useState(false);

  // Position of the value marker within the band (0-100%)
  const markerPct = useMemo(() => {
    if (range <= 0) return 50;
    return Math.min(100, Math.max(0, ((value - min) / range) * 100));
  }, [value, min, range]);

  return (
    <div
      className="inline-flex flex-col gap-1 min-w-[120px] relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Label */}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
        {label}
      </span>

      {/* Main value */}
      <div className="flex items-baseline gap-1">
        <span
          className="text-xl font-bold leading-none"
          style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--text)' }}
        >
          {fmt(value)}
        </span>
        <span className="text-xs text-[var(--text2)]">{unit}</span>
      </div>

      {/* Confidence band bar */}
      <div className="relative w-full h-2.5 rounded-full overflow-hidden bg-[var(--bg3)]">
        {/* Gradient fill spanning the range */}
        <div
          className="absolute inset-0 rounded-full transition-opacity duration-300"
          style={{
            background: `linear-gradient(90deg, ${rawColor}33 0%, ${rawColor}66 50%, ${rawColor}33 100%)`,
          }}
        />

        {/* Value marker dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
          style={{
            left: `${markerPct}%`,
            transform: `translateX(-50%) translateY(-50%)`,
          }}
        >
          <div
            className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* Min/max edge ticks */}
        <div
          className="absolute top-0 left-0 h-full rounded-l-full"
          style={{ width: 2, backgroundColor: color, opacity: 0.3 }}
        />
        <div
          className="absolute top-0 right-0 h-full rounded-r-full"
          style={{ width: 2, backgroundColor: color, opacity: 0.3 }}
        />
      </div>

      {/* Plus-minus text */}
      <span className="text-[10px] text-[var(--text3)]">
        &plusmn;{fmt(plusMinus)} {unit}
      </span>

      {/* Bottom row: confidence pill + source count */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {confLabel}
        </span>
        {sourceCount > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[9px] text-[var(--text3)]">
            <Layers size={9} />
            {sourceCount} source{sourceCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 px-3 py-2 rounded-lg border border-[var(--border2)] shadow-lg whitespace-nowrap"
          style={{
            backgroundColor: 'var(--bg)',
            borderRadius: '0.5rem',
          }}
        >
          <p className="text-[10px] text-[var(--text2)] leading-relaxed">
            Based on <strong className="text-[var(--text)]">{sourceCount}</strong> source{sourceCount !== 1 ? 's' : ''}.
            {lastUpdated && (
              <> Last updated: <strong className="text-[var(--text)]">{lastUpdated}</strong>.</>
            )}
            <br />
            Confidence:{' '}
            <strong style={{ color }}>{confLabel}</strong>
          </p>
          {/* Tooltip arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid var(--bg)',
            }}
          />
        </div>
      )}
    </div>
  );
}

export default ConfidenceBand;
