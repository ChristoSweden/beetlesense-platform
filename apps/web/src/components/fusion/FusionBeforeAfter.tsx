import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bug, Satellite, Layers } from 'lucide-react';

interface FusionBeforeAfterProps {
  parcelName?: string;
  className?: string;
}

/** Cell risk level for the simulated NDVI grid */
type CellLevel = 'healthy' | 'stressed' | 'warning' | 'infested';

interface GridCell {
  level: CellLevel;
  hasBeetle?: boolean;
}

/* ── Colour maps ─────────────────────────────────────────────── */
const SATELLITE_COLORS: Record<CellLevel, string> = {
  healthy: '#8fbc8f',   // muted sage
  stressed: '#c9b458',  // muted gold
  warning: '#c4915e',   // muted amber
  infested: '#b07070',  // muted rose
};

const FUSION_COLORS: Record<CellLevel, string> = {
  healthy: 'var(--green)',
  stressed: 'var(--banana)',
  warning: 'var(--risk-mid)',
  infested: 'var(--risk-high)',
};

/* ── Static grid data (6x6 = 36 cells) ──────────────────────── */
const SATELLITE_GRID: GridCell[] = [
  { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'stressed' }, { level: 'stressed' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'stressed' }, { level: 'stressed' }, { level: 'warning' }, { level: 'stressed' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'stressed' }, { level: 'warning' }, { level: 'warning' }, { level: 'stressed' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'healthy' }, { level: 'stressed' }, { level: 'stressed' }, { level: 'healthy' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'stressed' }, { level: 'healthy' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' },
];

const FUSION_GRID: GridCell[] = [
  { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'stressed' }, { level: 'stressed' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'stressed' }, { level: 'warning' }, { level: 'infested', hasBeetle: true }, { level: 'warning' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'warning' }, { level: 'infested', hasBeetle: true }, { level: 'infested', hasBeetle: true }, { level: 'warning' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'healthy' }, { level: 'stressed' }, { level: 'warning' }, { level: 'stressed' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'stressed' }, { level: 'healthy' }, { level: 'healthy' },
  { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' }, { level: 'healthy' },
];

/* ── Grid renderer ───────────────────────────────────────────── */
function NdviGrid({
  cells,
  colorMap,
  showBeetles,
}: {
  cells: GridCell[];
  colorMap: Record<CellLevel, string>;
  showBeetles: boolean;
}) {
  return (
    <div className="grid grid-cols-6 gap-[2px] w-full aspect-square">
      {cells.map((cell, i) => (
        <div
          key={i}
          className="relative rounded-sm flex items-center justify-center"
          style={{ backgroundColor: colorMap[cell.level] }}
        >
          {showBeetles && cell.hasBeetle && (
            <Bug size={14} className="text-white drop-shadow-md" />
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Comparison table row ────────────────────────────────────── */
function ComparisonRow({
  label,
  satellite,
  fusion,
}: {
  label: string;
  satellite: string;
  fusion: string;
}) {
  return (
    <tr className="border-b border-[var(--border)]">
      <td className="py-1.5 pr-3 text-xs font-medium text-[var(--text2)]">{label}</td>
      <td className="py-1.5 pr-3 text-xs text-[var(--text3)]">{satellite}</td>
      <td className="py-1.5 text-xs font-semibold text-[var(--green)]">{fusion}</td>
    </tr>
  );
}

/* ── Main component ──────────────────────────────────────────── */
export function FusionBeforeAfter({ parcelName, className = '' }: FusionBeforeAfterProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dividerPct, setDividerPct] = useState(50);
  const draggingRef = useRef(false);

  /* ── Drag logic ── */
  const getPercentFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 50;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    return Math.min(95, Math.max(5, pct));
  }, []);

  const handlePointerDown = useCallback(() => {
    draggingRef.current = true;
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      setDividerPct(getPercentFromClientX(e.clientX));
    },
    [getPercentFromClientX],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      const touch = e.touches[0];
      if (touch) {
        setDividerPct(getPercentFromClientX(touch.clientX));
      }
    },
    [getPercentFromClientX],
  );

  const title = parcelName
    ? t('fusion.beforeAfter.titleWithParcel', { parcel: parcelName, defaultValue: `Fusion Comparison — ${parcelName}` })
    : t('fusion.beforeAfter.title', { defaultValue: 'Why Multi-Source Fusion Matters' });

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Layers size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
      </div>

      {/* Split-screen comparison */}
      <div
        ref={containerRef}
        className="relative w-full h-[300px] md:h-[400px] select-none overflow-hidden rounded-lg border border-[var(--border)]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        {/* LEFT: Satellite Only (full width, clipped by divider) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${dividerPct}%` }}
        >
          <div className="absolute inset-0 bg-[var(--bg3)] p-4 flex flex-col">
            <div className="flex items-center gap-1.5 mb-1">
              <Satellite size={12} className="text-[var(--text3)]" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                {t('fusion.beforeAfter.satelliteOnly', { defaultValue: 'Satellite Only' })}
              </span>
            </div>
            <span className="text-[10px] text-[var(--text3)] mb-3">
              Sentinel-2 — 10m resolution
            </span>
            <div className="flex-1 max-w-[200px] mx-auto w-full opacity-70">
              <NdviGrid cells={SATELLITE_GRID} colorMap={SATELLITE_COLORS} showBeetles={false} />
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-[11px] text-[var(--text3)] font-medium">
                {t('fusion.beforeAfter.satelliteStatus', { defaultValue: 'Anomaly detected. Cause unknown.' })}
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                {t('fusion.beforeAfter.satelliteConfidence', { defaultValue: 'Confidence: Low (single source)' })}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: BeetleSense Fusion (full width, visible from divider onward) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ left: `${dividerPct}%`, width: `${100 - dividerPct}%` }}
        >
          <div
            className="absolute inset-0 bg-[var(--bg2)] p-4 flex flex-col"
            style={{ width: `calc(100vw - 100vw + ${containerRef.current?.offsetWidth ?? 600}px)`, marginLeft: `-${dividerPct}%` }}
          >
            {/* Offset content so it stays visually aligned */}
            <div style={{ marginLeft: `${dividerPct}%`, width: `${100 - dividerPct}%` }} className="flex flex-col h-full">
              <div className="flex items-center gap-1.5 mb-1">
                <Layers size={12} className="text-[var(--green)]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--green)]">
                  {t('fusion.beforeAfter.fusionLabel', { defaultValue: 'BeetleSense Fusion' })}
                </span>
              </div>
              <span className="text-[10px] text-[var(--text2)] mb-3">
                5 sources fused — sub-meter confidence
              </span>
              <div className="flex-1 max-w-[200px] mx-auto w-full">
                <NdviGrid cells={FUSION_GRID} colorMap={FUSION_COLORS} showBeetles={true} />
              </div>
              <div className="mt-3 space-y-1">
                <p className="text-[11px] text-[var(--text)] font-medium">
                  {t('fusion.beforeAfter.fusionStatus', { defaultValue: 'Ips typographus confirmed. 2.3 ha affected.' })}
                </p>
                <p className="text-[10px] text-[var(--green)]">
                  {t('fusion.beforeAfter.fusionConfidence', { defaultValue: 'Confidence: High (5/6 sources corroborate)' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Draggable divider */}
        <div
          className="absolute top-0 bottom-0 z-10"
          style={{ left: `${dividerPct}%`, transform: 'translateX(-50%)' }}
        >
          {/* Vertical line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[2px] -translate-x-1/2 bg-[var(--green)]" />

          {/* Grab handle */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[var(--bg)] border-2 border-[var(--green)] flex items-center justify-center cursor-col-resize shadow-md"
            onPointerDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 6L0 3.5V8.5L3 6Z" fill="var(--green)" />
              <path d="M9 6L12 3.5V8.5L9 6Z" fill="var(--green)" />
            </svg>
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border2)]">
              <th className="py-1.5 pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]" />
              <th className="py-1.5 pr-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                {t('fusion.beforeAfter.satelliteOnly', { defaultValue: 'Satellite Only' })}
              </th>
              <th className="py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--green)]">
                {t('fusion.beforeAfter.fusionLabel', { defaultValue: 'BeetleSense Fusion' })}
              </th>
            </tr>
          </thead>
          <tbody>
            <ComparisonRow
              label={t('fusion.beforeAfter.sources', { defaultValue: 'Sources' })}
              satellite="1"
              fusion="5"
            />
            <ComparisonRow
              label={t('fusion.beforeAfter.resolution', { defaultValue: 'Resolution' })}
              satellite="10 m"
              fusion="Sub-meter"
            />
            <ComparisonRow
              label={t('fusion.beforeAfter.confidence', { defaultValue: 'Confidence' })}
              satellite="34%"
              fusion="91%"
            />
            <ComparisonRow
              label={t('fusion.beforeAfter.detection', { defaultValue: 'Detection' })}
              satellite={t('fusion.beforeAfter.anomaly', { defaultValue: 'Anomaly' })}
              fusion={t('fusion.beforeAfter.confirmedBeetle', { defaultValue: 'Confirmed beetle' })}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FusionBeforeAfter;
