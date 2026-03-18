import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useExpertise, type ExpertiseLevel } from '@/contexts/ExpertiseContext';

/* ─── Metric explanation database ─── */
export interface MetricExplanation {
  beginner: string;
  intermediate: string;
  expert: string;
  normalRange?: { min: number; max: number; unit?: string; context?: string };
}

/** Built-in metric explanations for common forestry metrics */
const METRIC_DB: Record<string, (value: number | string) => MetricExplanation> = {
  ndvi: (v) => ({
    beginner: `NDVI mater hur gron och frisk din skog ar. ${v} = ${Number(v) >= 0.7 ? 'ganska frisk' : Number(v) >= 0.5 ? 'behover uppfoljning' : 'kan vara skadat'}.`,
    intermediate: `NDVI ${v} (normalt 0.7-0.9 for barrskog). Indikerar ${Number(v) >= 0.7 ? 'god' : 'reducerad'} klorofyllproduktion.`,
    expert: `NDVI ${v} (Sentinel-2 B8-B4/B8+B4). Red-edge NDRE 0.58 stodjer klorofyllbedomningen. Atmosfarisk korrektion via Sen2Cor.`,
    normalRange: { min: 0.7, max: 0.9, context: 'barrskog' },
  }),
  volume: (v) => ({
    beginner: `Virkesvolym visar hur mycket virke som finns. ${v} m\u00B3/ha ar ${Number(v) >= 200 ? 'ganska mycket' : 'en normal mangd'} for svensk skog.`,
    intermediate: `Virkesvolym ${v} m\u00B3sk/ha. Rikssnittet ligger runt 150 m\u00B3sk/ha for produktiv skogsmark.`,
    expert: `Volym ${v} m\u00B3sk/ha (LiDAR-baserad ALS-skattning, r\u00B2=0.92). Kalibrerad mot provytor, RMSE \u00B115%.`,
    normalRange: { min: 100, max: 300, unit: 'm\u00B3sk/ha' },
  }),
  'bark-beetle-risk': (v) => ({
    beginner: `Risken for barkborreangrepp ar ${v}%. ${Number(v) >= 60 ? 'Det ar hog risk - overvakning rekommenderas.' : 'Risknivan ar hanterbar just nu.'}`,
    intermediate: `Barkborreriskniva ${v}%. Baserat pa temperatur, vindskadeinventering och feromonfangsdata.`,
    expert: `Ips typographus riskindex ${v}% (ensemble: RF + gradient boosting). Features: degreedays>${400}, windthrow_proximity, trap_catches, host_vitality.`,
    normalRange: { min: 0, max: 100, unit: '%', context: 'riskindex' },
  }),
  canopy: (v) => ({
    beginner: `Krontakning visar hur mycket av marken som tacks av tradkronor. ${v}% ar ${Number(v) >= 70 ? 'tatskog' : 'glesare skog'}.`,
    intermediate: `Krontackning ${v}%. Over 70% klassas normalt som sluten skog enligt Skogsstyrelsen.`,
    expert: `Krontackning ${v}% (CHM-deriverad, 2m rasterupplosnng). Referensvarden: sluten skog >70%, gles skog 30-70%.`,
    normalRange: { min: 30, max: 95, unit: '%' },
  }),
  temperature: (v) => ({
    beginner: `Temperaturen ar ${v}\u00B0C. ${Number(v) >= 18 ? 'Varmt vader okar risken for barkborre.' : 'Normal temperatur for skogsaktivitet.'}`,
    intermediate: `Temp ${v}\u00B0C. Barkborresvarming kravs >18\u00B0C under 2-3 veckor. Daggrader ackumuleras over 5\u00B0C.`,
    expert: `Temp ${v}\u00B0C (SMHI mesoskalig analys, 1km grid). DD5-ackumulering for I. typographus svarmningstroskel: 600 daggrader.`,
    normalRange: { min: -5, max: 30, unit: '\u00B0C' },
  }),
};

/* ─── Props ─── */
export interface InsightTooltipProps {
  /** The value to display */
  value: string | number;
  /** Unit label (e.g., "m\u00B3/ha", "%", "\u00B0C") */
  unit?: string;
  /** Metric key matching METRIC_DB or a custom explanation */
  metric: string;
  /** Override expertise level (defaults to context) */
  expertiseLevel?: ExpertiseLevel;
  /** Custom explanations (overrides built-in DB) */
  explanations?: MetricExplanation;
  /** Trend data for sparkline context */
  trend?: { direction: 'up' | 'down' | 'stable'; changePercent?: number };
  /** Additional class names */
  className?: string;
  children?: ReactNode;
}

export function InsightTooltip({
  value,
  unit,
  metric,
  expertiseLevel,
  explanations: customExplanations,
  trend,
  className = '',
  children,
}: InsightTooltipProps) {
  const { level: contextLevel } = useExpertise();
  const level = expertiseLevel ?? contextLevel;

  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close tooltip on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Resolve explanation
  const dbEntry = METRIC_DB[metric];
  const explanation = customExplanations ?? dbEntry?.(value);
  const text = explanation?.[level] ?? `${metric}: ${value}${unit ? ' ' + unit : ''}`;
  const normalRange = explanation?.normalRange;

  // Range position calculation
  let rangePosition: number | null = null;
  if (normalRange && typeof value === 'number') {
    const span = normalRange.max - normalRange.min;
    rangePosition = span > 0 ? Math.max(0, Math.min(1, (value - normalRange.min) / span)) : 0.5;
  }

  const trendLabel = trend
    ? trend.direction === 'up'
      ? `\u2191 ${trend.changePercent != null ? `+${trend.changePercent}%` : 'okande'}`
      : trend.direction === 'down'
        ? `\u2193 ${trend.changePercent != null ? `${trend.changePercent}%` : 'minskande'}`
        : '\u2192 stabil'
    : null;

  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      {/* Value display */}
      {children ?? (
        <span className="font-mono text-sm text-[var(--text)]">
          {value}
          {unit && <span className="ml-0.5 text-[var(--text3)]">{unit}</span>}
        </span>
      )}

      {/* "?" trigger */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--border2)] text-[10px] font-bold text-[var(--text3)] transition-colors hover:border-[var(--green)] hover:text-[var(--green)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]"
        aria-label={`Forklaring: ${metric}`}
        aria-expanded={isOpen}
      >
        ?
      </button>

      {/* Tooltip */}
      {isOpen && (
        <div
          ref={tooltipRef}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg border border-[var(--border2)] bg-[var(--bg2)] p-3 shadow-xl shadow-black/40"
        >
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-[var(--border2)] bg-[var(--bg2)]" />

          {/* Explanation text */}
          <p className="text-xs leading-relaxed text-[var(--text2)]">{text}</p>

          {/* Normal range indicator */}
          {normalRange && (
            <div className="mt-2 border-t border-[var(--border)] pt-2">
              <div className="flex items-center justify-between text-[10px] text-[var(--text3)]">
                <span>Vad ar normalt?</span>
                <span>
                  {normalRange.min}\u2013{normalRange.max}
                  {normalRange.unit ? ` ${normalRange.unit}` : unit ? ` ${unit}` : ''}
                  {normalRange.context ? ` (${normalRange.context})` : ''}
                </span>
              </div>
              {rangePosition != null && (
                <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--border)]">
                  <div className="relative h-full rounded-full bg-gradient-to-r from-[var(--red)] via-[var(--amber)] to-[var(--green)]">
                    <div
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--bg2)] bg-[var(--text)] shadow-sm"
                      style={{ left: `${rangePosition * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trend */}
          {trendLabel && (
            <div className="mt-1.5 text-[10px] text-[var(--text3)]">
              Trend: {trendLabel}
            </div>
          )}
        </div>
      )}
    </span>
  );
}
export default InsightTooltip;
