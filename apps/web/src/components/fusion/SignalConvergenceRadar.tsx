import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bug,
  Leaf,
  Thermometer,
  Droplets,
  Flame,
  Sprout,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RadarAxis {
  id: string;
  label: string;
  value: number;        // 0-100 current reading
  threshold: number;    // 0-100 danger threshold
  unit: string;
  icon: string;         // lucide icon name
  source: string;       // data source attribution
  confidence: number;   // 0-1
}

export interface SignalConvergenceRadarProps {
  axes: RadarAxis[];
  compoundRisk: number;       // 0-100 center score
  compoundLabel?: string;     // e.g., "COMPOUND RISK"
  previousAxes?: RadarAxis[]; // previous period for comparison ghost
  animateIn?: boolean;
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  bug: Bug,
  leaf: Leaf,
  thermometer: Thermometer,
  droplets: Droplets,
  flame: Flame,
  sprout: Sprout,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name.toLowerCase()] ?? Bug;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_SIZE = 400;
const CENTER = VIEW_SIZE / 2;
const OUTER_RADIUS = 150;
const RING_FRACTIONS = [0.33, 0.66, 1.0];
const AXIS_DOT_R = 4;
const ANIMATION_DURATION = 800;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskColor(score: number): string {
  if (score >= 70) return 'var(--risk-high)';
  if (score >= 50) return 'var(--risk-mid)';
  return 'var(--green)';
}

function riskColorRaw(score: number): string {
  if (score >= 70) return '#ef4444';
  if (score >= 50) return '#f59e0b';
  return '#22c55e';
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Get the angle for axis index i of n total axes (starting from top / -90deg) */
function axisAngle(i: number, n: number): number {
  return -Math.PI / 2 + (2 * Math.PI * i) / n;
}

/** Convert a value 0-100 to a point on the radar */
function valueToPoint(
  value: number,
  axisIndex: number,
  axisCount: number,
  radius: number = OUTER_RADIUS,
): { x: number; y: number } {
  const angle = axisAngle(axisIndex, axisCount);
  const r = (Math.min(100, Math.max(0, value)) / 100) * radius;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

/** Build an SVG polygon points string from an array of values */
function polygonPoints(
  values: number[],
  radius: number = OUTER_RADIUS,
): string {
  return values
    .map((v, i) => {
      const pt = valueToPoint(v, i, values.length, radius);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');
}

/** Determine if the majority of values exceed their thresholds */
function overallExceedsThreshold(axes: RadarAxis[]): boolean {
  const exceeding = axes.filter((a) => a.value > a.threshold).length;
  return exceeding > axes.length / 2;
}

// ─── CSS Keyframes ────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes scr-pulse-red {
  0%, 100% { filter: drop-shadow(0 0 6px var(--risk-high)) drop-shadow(0 0 16px rgba(239,68,68,0.3)); }
  50% { filter: drop-shadow(0 0 12px var(--risk-high)) drop-shadow(0 0 28px rgba(239,68,68,0.5)); }
}
@keyframes scr-pulse-amber {
  0%, 100% { filter: drop-shadow(0 0 4px var(--risk-mid)) drop-shadow(0 0 12px rgba(245,158,11,0.25)); }
  50% { filter: drop-shadow(0 0 10px var(--risk-mid)) drop-shadow(0 0 22px rgba(245,158,11,0.4)); }
}
@keyframes scr-glow-green {
  0%, 100% { filter: drop-shadow(0 0 4px var(--green)) drop-shadow(0 0 8px rgba(34,197,94,0.15)); }
}
@keyframes scr-dot-glow {
  0%, 100% { filter: drop-shadow(0 0 2px var(--risk-high)); }
  50% { filter: drop-shadow(0 0 6px var(--risk-high)) drop-shadow(0 0 10px rgba(239,68,68,0.4)); }
}
@keyframes scr-polygon-in {
  from { opacity: 0; transform: scale(0); }
  to { opacity: 1; transform: scale(1); }
}
`;

// ─── Demo Data ────────────────────────────────────────────────────────────────

export const DEMO_AXES: RadarAxis[] = [
  { id: 'beetle', label: 'Beetle Pressure', value: 72, threshold: 60, unit: 'index', icon: 'bug', source: 'Skogsstyrelsen', confidence: 0.91 },
  { id: 'ndvi', label: 'NDVI Anomaly', value: 58, threshold: 50, unit: '\u0394%', icon: 'leaf', source: 'Sentinel-2', confidence: 0.88 },
  { id: 'temperature', label: 'Heat Stress', value: 65, threshold: 70, unit: '\u00B0C days', icon: 'thermometer', source: 'SMHI', confidence: 0.95 },
  { id: 'moisture', label: 'Drought Index', value: 44, threshold: 55, unit: '%deficit', icon: 'droplets', source: 'SMHI', confidence: 0.92 },
  { id: 'fire', label: 'Fire Proximity', value: 18, threshold: 40, unit: 'km\u207B\u00B9', icon: 'flame', source: 'NASA FIRMS', confidence: 0.85 },
  { id: 'phenology', label: 'Phenology Shift', value: 35, threshold: 45, unit: 'GDD', icon: 'sprout', source: 'ForestWard', confidence: 0.78 },
];

export const DEMO_PREVIOUS_AXES: RadarAxis[] = [
  { ...DEMO_AXES[0], value: 60 },
  { ...DEMO_AXES[1], value: 47 },
  { ...DEMO_AXES[2], value: 58 },
  { ...DEMO_AXES[3], value: 38 },
  { ...DEMO_AXES[4], value: 15 },
  { ...DEMO_AXES[5], value: 30 },
];

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useAnimatedValues(
  targetValues: number[],
  enabled: boolean,
  duration: number = ANIMATION_DURATION,
): number[] {
  const [values, setValues] = useState<number[]>(
    enabled ? targetValues.map(() => 0) : targetValues,
  );
  const rafId = useRef<number>(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    const startTime = performance.now();
    const from = targetValues.map(() => 0);

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      setValues(from.map((f, i) => f + (targetValues[i] - f) * eased));

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        setValues(targetValues);
      }
    }

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enabled, targetValues, duration]);

  // When not animating or after animation, track changes
  useEffect(() => {
    if (!startedRef.current || !enabled) {
      setValues(targetValues);
    }
  }, [targetValues, enabled]);

  return values;
}

function useAnimatedNumber(
  target: number,
  enabled: boolean,
  duration: number = ANIMATION_DURATION,
): number {
  const [value, setValue] = useState(enabled ? 0 : target);
  const rafId = useRef<number>(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);

      setValue(target * eased);

      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    }

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [enabled, target, duration]);

  useEffect(() => {
    if (!startedRef.current || !enabled) {
      setValue(target);
    }
  }, [target, enabled]);

  return value;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SignalConvergenceRadar({
  axes,
  compoundRisk,
  compoundLabel,
  previousAxes,
  animateIn = true,
}: SignalConvergenceRadarProps) {
  const { t } = useTranslation();
  const n = axes.length;

  const labelText = compoundLabel ?? t('signalRadar.compoundRisk', 'COMPOUND RISK');

  // Animated values
  const animatedValues = useAnimatedValues(
    axes.map((a) => a.value),
    animateIn,
  );
  const animatedCenter = useAnimatedNumber(compoundRisk, animateIn);

  // Determine polygon fill gradient ID based on whether values exceed thresholds
  const exceeds = useMemo(() => overallExceedsThreshold(axes), [axes]);

  // Precompute axis label positions (outside the radar)
  const labelPositions = useMemo(() => {
    return axes.map((_, i) => {
      const angle = axisAngle(i, n);
      const labelR = OUTER_RADIUS + 32;
      return {
        x: CENTER + labelR * Math.cos(angle),
        y: CENTER + labelR * Math.sin(angle),
        angle,
      };
    });
  }, [axes, n]);

  // Determine center pulse animation
  const centerAnimation = useMemo(() => {
    if (compoundRisk > 70) return 'scr-pulse-red 2s ease-in-out infinite';
    if (compoundRisk > 50) return 'scr-pulse-amber 2.5s ease-in-out infinite';
    return 'scr-glow-green 3s ease-in-out infinite';
  }, [compoundRisk]);

  return (
    <div
      className="w-full max-w-[500px] mx-auto rounded-xl bg-[var(--bg2)] border border-[var(--border)] overflow-hidden"
      style={{ fontFamily: 'var(--font-main)' }}
    >
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <h3
          className="text-lg font-semibold leading-tight m-0"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}
        >
          {t('signalRadar.title', 'Signal Convergence')}
        </h3>
        <p
          className="text-xs mt-1 mb-0 leading-snug"
          style={{ color: 'var(--text3)' }}
        >
          {t('signalRadar.subtitle', '{{count}} data sources converging', { count: n })}
        </p>
      </div>

      {/* Radar SVG */}
      <div className="px-3 pb-2">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="block w-full"
          role="img"
          aria-label={t(
            'signalRadar.ariaLabel',
            'Radar chart showing {{count}} signal strengths with compound risk score of {{risk}}',
            { count: n, risk: Math.round(compoundRisk) },
          )}
        >
          <defs>
            {/* Fill gradient for current values polygon */}
            <linearGradient id="scr-fill-safe" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--green)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--green)" stopOpacity="0.12" />
            </linearGradient>
            <linearGradient id="scr-fill-danger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--risk-high)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--risk-high)" stopOpacity="0.12" />
            </linearGradient>

            {/* Glow filter for dots exceeding threshold */}
            <filter id="scr-dot-glow-filter" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Concentric rings */}
          {RING_FRACTIONS.map((frac) => {
            const r = OUTER_RADIUS * frac;
            return (
              <circle
                key={`ring-${frac}`}
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke="var(--border)"
                strokeWidth="0.8"
                strokeDasharray="4 3"
                opacity="0.5"
              />
            );
          })}

          {/* Axis lines */}
          {axes.map((_, i) => {
            const angle = axisAngle(i, n);
            const endX = CENTER + OUTER_RADIUS * Math.cos(angle);
            const endY = CENTER + OUTER_RADIUS * Math.sin(angle);
            return (
              <line
                key={`axis-line-${i}`}
                x1={CENTER}
                y1={CENTER}
                x2={endX}
                y2={endY}
                stroke="var(--border)"
                strokeWidth="0.6"
                opacity="0.4"
              />
            );
          })}

          {/* Threshold polygon (dashed red outline) */}
          <polygon
            points={polygonPoints(axes.map((a) => a.threshold))}
            fill="none"
            stroke="var(--risk-high)"
            strokeWidth="1.2"
            strokeDasharray="6 4"
            opacity="0.3"
          />

          {/* Previous period ghost polygon */}
          {previousAxes && previousAxes.length === n && (
            <polygon
              points={polygonPoints(previousAxes.map((a) => a.value))}
              fill="none"
              stroke="var(--text3)"
              strokeWidth="1"
              strokeDasharray="4 3"
              opacity="0.3"
            />
          )}

          {/* Current values polygon */}
          <polygon
            points={polygonPoints(animatedValues)}
            fill={exceeds ? 'url(#scr-fill-danger)' : 'url(#scr-fill-safe)'}
            stroke={exceeds ? 'var(--risk-high)' : 'var(--green)'}
            strokeWidth="1.8"
            strokeLinejoin="round"
            style={{
              transformOrigin: `${CENTER}px ${CENTER}px`,
              animation: animateIn
                ? `scr-polygon-in ${ANIMATION_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1) forwards`
                : undefined,
            }}
          />

          {/* Axis value dots */}
          {animatedValues.map((val, i) => {
            const pt = valueToPoint(val, i, n);
            const aboveThreshold = axes[i].value > axes[i].threshold;
            return (
              <circle
                key={`dot-${axes[i].id}`}
                cx={pt.x}
                cy={pt.y}
                r={AXIS_DOT_R}
                fill={aboveThreshold ? 'var(--risk-high)' : 'var(--green)'}
                stroke="var(--bg2)"
                strokeWidth="1.5"
                style={{
                  animation: aboveThreshold
                    ? 'scr-dot-glow 2s ease-in-out infinite'
                    : undefined,
                }}
                filter={aboveThreshold ? 'url(#scr-dot-glow-filter)' : undefined}
              />
            );
          })}

          {/* Axis labels (icon + label + value) */}
          {axes.map((axis, i) => {
            const pos = labelPositions[i];
            const Icon = getIcon(axis.icon);
            const aboveThreshold = axis.value > axis.threshold;

            // Determine text-anchor based on position
            const isLeft = pos.x < CENTER - 20;
            const isRight = pos.x > CENTER + 20;
            const textAnchor = isLeft ? 'end' : isRight ? 'start' : 'middle';

            // Offset icon position
            const iconOffsetX = isLeft ? -10 : isRight ? 10 : 0;
            const iconX = pos.x + iconOffsetX;

            return (
              <g key={`label-${axis.id}`}>
                {/* Icon rendered as foreignObject for Lucide component */}
                <foreignObject
                  x={iconX - 8}
                  y={pos.y - 18}
                  width={16}
                  height={16}
                >
                  <Icon
                    size={14}
                    strokeWidth={2}
                    color={aboveThreshold ? riskColorRaw(axis.value) : 'var(--text2)'}
                  />
                </foreignObject>

                {/* Label text */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor={textAnchor}
                  fontSize="10"
                  fontWeight={600}
                  fontFamily="var(--font-main)"
                  fill="var(--text2)"
                  className="hidden sm:block"
                >
                  {axis.label}
                </text>
                {/* Short label for mobile */}
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor={textAnchor}
                  fontSize="9"
                  fontWeight={600}
                  fontFamily="var(--font-main)"
                  fill="var(--text2)"
                  className="sm:hidden"
                >
                  {axis.label.split(' ')[0]}
                </text>

                {/* Value + unit */}
                <text
                  x={pos.x}
                  y={pos.y + 16}
                  textAnchor={textAnchor}
                  fontSize="10"
                  fontWeight={700}
                  fontFamily="var(--font-main)"
                  fill={aboveThreshold ? riskColorRaw(axis.value) : 'var(--text)'}
                >
                  {Math.round(animatedValues[i])}
                  <tspan fontSize="8" fill="var(--text3)">
                    {' '}{axis.unit}
                  </tspan>
                </text>
              </g>
            );
          })}

          {/* Center compound risk score */}
          <g style={{ animation: centerAnimation }}>
            {/* Background circle */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={34}
              fill="var(--bg2)"
              stroke={riskColor(compoundRisk)}
              strokeWidth="2"
            />

            {/* Score number */}
            <text
              x={CENTER}
              y={CENTER - 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="26"
              fontWeight={800}
              fontFamily="var(--font-main)"
              fill={riskColor(compoundRisk)}
              className="tabular-nums"
            >
              {Math.round(animatedCenter)}
            </text>

            {/* Label below score */}
            <text
              x={CENTER}
              y={CENTER + 18}
              textAnchor="middle"
              fontSize="6.5"
              fontWeight={600}
              fontFamily="var(--font-main)"
              fill="var(--text3)"
              letterSpacing="0.1em"
            >
              {labelText}
            </text>
          </g>
        </svg>
      </div>

      {/* Legend / Footer — confidence chips */}
      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3"
        style={{
          borderTop: '1px solid var(--border)',
        }}
      >
        {axes.map((axis) => {
          const Icon = getIcon(axis.icon);
          const confPct = Math.round(axis.confidence * 100);
          return (
            <div
              key={`conf-${axis.id}`}
              className="flex items-center gap-1.5"
              title={`${axis.source}: ${confPct}% ${t('signalRadar.confidence', 'confidence')}`}
            >
              <Icon
                size={12}
                strokeWidth={2}
                color="var(--text3)"
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: 'var(--text2)' }}
              >
                {axis.source}
              </span>
              {/* Confidence bar */}
              <div
                className="relative rounded-full overflow-hidden"
                style={{
                  width: 40,
                  height: 4,
                  backgroundColor: 'var(--bg3)',
                }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${confPct}%`,
                    backgroundColor:
                      axis.confidence >= 0.9
                        ? 'var(--green)'
                        : axis.confidence >= 0.8
                          ? 'var(--risk-mid)'
                          : 'var(--risk-high)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SignalConvergenceRadar;
