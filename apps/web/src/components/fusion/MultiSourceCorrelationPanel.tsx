import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Satellite,
  Thermometer,
  Bug,
  Droplets,
  Wind,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CorrelationPair {
  sourceA: string;
  sourceB: string;
  coefficient: number; // -1 to +1 Pearson correlation
  significance: 'strong' | 'moderate' | 'weak';
  insight: string;
}

export interface SourceSignal {
  id: string;
  label: string;
  icon: string; // lucide icon name
  currentValue: string;
  trend: 'rising' | 'falling' | 'stable';
  trendPct: number;
  sparkline: number[]; // last 30 values normalized 0-1
}

export interface MultiSourceCorrelationPanelProps {
  sources: SourceSignal[];
  correlations: CorrelationPair[];
  highlightedPair?: [string, string];
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  satellite: Satellite,
  thermometer: Thermometer,
  bug: Bug,
  droplets: Droplets,
  wind: Wind,
};

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name.toLowerCase()] ?? Bug;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

function generateSparkline(pattern: 'decline' | 'rise' | 'spike' | 'falling' | 'flat'): number[] {
  const points: number[] = [];
  for (let i = 0; i < 30; i++) {
    const t = i / 29;
    let v: number;
    switch (pattern) {
      case 'decline':
        v = 0.8 - t * 0.35 + Math.sin(i * 0.7) * 0.04;
        break;
      case 'rise':
        v = 0.25 + t * 0.45 + Math.sin(i * 0.5) * 0.03;
        break;
      case 'spike':
        v = t < 0.6 ? 0.15 + t * 0.1 : 0.15 + (t - 0.6) * 2.1;
        break;
      case 'falling':
        v = 0.7 - t * 0.4 + Math.sin(i * 0.9) * 0.05;
        break;
      case 'flat':
        v = 0.45 + Math.sin(i * 0.4) * 0.08;
        break;
    }
    points.push(Math.max(0, Math.min(1, v)));
  }
  return points;
}

export const DEMO_SOURCES: SourceSignal[] = [
  {
    id: 'ndvi',
    label: 'NDVI (Sentinel-2)',
    icon: 'satellite',
    currentValue: '0.68',
    trend: 'falling',
    trendPct: -8,
    sparkline: generateSparkline('decline'),
  },
  {
    id: 'temperature',
    label: 'Temperature (SMHI)',
    icon: 'thermometer',
    currentValue: '18\u00b0C',
    trend: 'rising',
    trendPct: 12,
    sparkline: generateSparkline('rise'),
  },
  {
    id: 'beetle-traps',
    label: 'Beetle Traps (Skogsstyrelsen)',
    icon: 'bug',
    currentValue: '47/week',
    trend: 'rising',
    trendPct: 340,
    sparkline: generateSparkline('spike'),
  },
  {
    id: 'soil-moisture',
    label: 'Soil Moisture (SMHI)',
    icon: 'droplets',
    currentValue: '38%',
    trend: 'falling',
    trendPct: -22,
    sparkline: generateSparkline('falling'),
  },
  {
    id: 'wind-speed',
    label: 'Wind Speed (SMHI)',
    icon: 'wind',
    currentValue: '8 m/s',
    trend: 'stable',
    trendPct: 0,
    sparkline: generateSparkline('flat'),
  },
];

export const DEMO_CORRELATIONS: CorrelationPair[] = [
  {
    sourceA: 'temperature',
    sourceB: 'beetle-traps',
    coefficient: 0.87,
    significance: 'strong',
    insight: 'Temperature >20\u00b0C precedes beetle emergence by 5-7 days',
  },
  {
    sourceA: 'ndvi',
    sourceB: 'beetle-traps',
    coefficient: -0.82,
    significance: 'strong',
    insight: 'NDVI decline of >0.1 correlates with active beetle boring in 89% of cases',
  },
  {
    sourceA: 'temperature',
    sourceB: 'soil-moisture',
    coefficient: -0.71,
    significance: 'strong',
    insight: 'Extended heat periods reduce soil moisture, compounding tree stress',
  },
  {
    sourceA: 'soil-moisture',
    sourceB: 'ndvi',
    coefficient: 0.65,
    significance: 'moderate',
    insight: 'Drought-stressed trees show delayed NDVI response within 2 weeks',
  },
  {
    sourceA: 'wind-speed',
    sourceB: 'beetle-traps',
    coefficient: 0.32,
    significance: 'weak',
    insight: 'Wind aids pheromone dispersal, mild correlation with trap counts',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CELL_SIZE = 44;
const CELL_GAP = 2;

function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (r > 0) {
    if (abs > 0.6) return 'var(--green)';
    if (abs > 0.3) return 'color-mix(in srgb, var(--green) 50%, var(--bg3))';
    return 'var(--text3)';
  } else {
    if (abs > 0.6) return 'var(--risk-high)';
    if (abs > 0.3) return 'var(--risk-mid)';
    return 'var(--text3)';
  }
}

function correlationOpacity(r: number): number {
  const abs = Math.abs(r);
  if (abs > 0.6) return 1;
  if (abs > 0.3) return 0.75;
  return 0.45;
}

function significanceLabel(sig: 'strong' | 'moderate' | 'weak'): string {
  switch (sig) {
    case 'strong': return 'strong';
    case 'moderate': return 'moderate';
    case 'weak': return 'weak';
  }
}

function trendColor(trend: 'rising' | 'falling' | 'stable'): string {
  switch (trend) {
    case 'rising': return 'var(--risk-mid)';
    case 'falling': return 'var(--risk-high)';
    case 'stable': return 'var(--text3)';
  }
}

function findCorrelation(
  correlations: CorrelationPair[],
  idA: string,
  idB: string,
): CorrelationPair | undefined {
  return correlations.find(
    (c) =>
      (c.sourceA === idA && c.sourceB === idB) ||
      (c.sourceA === idB && c.sourceB === idA),
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 80;
  const h = 30;
  const pad = 2;
  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - v * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="shrink-0"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Trend Icon ───────────────────────────────────────────────────────────────

function TrendIcon({ trend }: { trend: 'rising' | 'falling' | 'stable' }) {
  switch (trend) {
    case 'rising': return <TrendingUp size={14} />;
    case 'falling': return <TrendingDown size={14} />;
    case 'stable': return <Minus size={14} />;
  }
}

// ─── CSS Keyframes ────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes msc-glow {
  0%, 100% { box-shadow: 0 0 0 0 var(--glow-color); }
  50% { box-shadow: 0 0 14px 3px var(--glow-color); }
}
@keyframes msc-cell-ring {
  0%, 100% { box-shadow: 0 0 0 0px var(--ring-color); }
  50% { box-shadow: 0 0 8px 2px var(--ring-color); }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export function MultiSourceCorrelationPanel({
  sources,
  correlations,
  highlightedPair: externalHighlight,
}: MultiSourceCorrelationPanelProps) {
  const { t } = useTranslation();
  const [hoveredPair, setHoveredPair] = useState<[string, string] | null>(null);

  const activePair = hoveredPair ?? (externalHighlight ?? null);

  const activeCorrelation = useMemo(() => {
    if (!activePair) return null;
    return findCorrelation(correlations, activePair[0], activePair[1]);
  }, [activePair, correlations]);

  const handleCellEnter = useCallback((idA: string, idB: string) => {
    setHoveredPair([idA, idB]);
  }, []);

  const handleCellLeave = useCallback(() => {
    setHoveredPair(null);
  }, []);

  const n = sources.length;

  // Labels for sources — abbreviated for matrix headers
  const sourceLabels = useMemo(() => {
    return sources.map((s) => {
      // Take first word or abbreviation
      const parts = s.label.split(' ');
      return parts[0].length <= 6 ? parts[0] : parts[0].slice(0, 5);
    });
  }, [sources]);

  const isHighlighted = useCallback(
    (sourceId: string) => {
      if (!activePair) return false;
      return activePair[0] === sourceId || activePair[1] === sourceId;
    },
    [activePair],
  );

  // Compute source labels from the active pair for the insight bar
  const pairLabels = useMemo(() => {
    if (!activePair) return null;
    const a = sources.find((s) => s.id === activePair[0]);
    const b = sources.find((s) => s.id === activePair[1]);
    return a && b ? [a.label, b.label] : null;
  }, [activePair, sources]);

  return (
    <div
      className="rounded-xl w-full"
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--font-main)',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <div
        className="px-5 pt-5 pb-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <h3
          className="text-lg font-semibold m-0"
          style={{
            fontFamily: 'var(--font-serif)',
            color: 'var(--text)',
          }}
        >
          {t('fusion.correlationMatrix', 'Signal Correlation Matrix')}
        </h3>
        <p
          className="text-xs mt-1 m-0"
          style={{ color: 'var(--text3)' }}
        >
          {t(
            'fusion.correlationSubtitle',
            'How data sources converge to indicate risk',
          )}
        </p>
      </div>

      {/* Body: matrix + signal cards */}
      <div className="flex flex-col md:flex-row gap-4 p-4">
        {/* Left: Correlation Matrix (Heat Map Grid) */}
        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto">
            {/* Column headers */}
            <div
              className="flex items-end"
              style={{ paddingLeft: CELL_SIZE + CELL_GAP + 4 }}
            >
              {sources.slice(0, n - 1).map((src, colIdx) => (
                <div
                  key={src.id}
                  className="text-center shrink-0 overflow-hidden"
                  style={{
                    width: CELL_SIZE,
                    marginRight: CELL_GAP,
                    color: isHighlighted(src.id)
                      ? 'var(--green)'
                      : 'var(--text3)',
                    fontSize: '9px',
                    lineHeight: '1.1',
                    transition: 'color 0.15s',
                  }}
                  title={src.label}
                >
                  {sourceLabels[colIdx]}
                </div>
              ))}
            </div>

            {/* Matrix rows — lower-left triangle */}
            {sources.slice(1).map((rowSrc, rowOffset) => {
              const rowIdx = rowOffset + 1;
              return (
                <div
                  key={rowSrc.id}
                  className="flex items-center"
                  style={{
                    marginTop: rowOffset === 0 ? 4 : CELL_GAP,
                  }}
                >
                  {/* Row label */}
                  <div
                    className="shrink-0 text-right pr-1 overflow-hidden"
                    style={{
                      width: CELL_SIZE + 4,
                      color: isHighlighted(rowSrc.id)
                        ? 'var(--green)'
                        : 'var(--text3)',
                      fontSize: '9px',
                      lineHeight: '1.1',
                      transition: 'color 0.15s',
                    }}
                    title={rowSrc.label}
                  >
                    {sourceLabels[rowIdx]}
                  </div>

                  {/* Cells — only up to the diagonal */}
                  {sources.slice(0, rowIdx).map((colSrc, colIdx) => {
                    const corr = findCorrelation(correlations, rowSrc.id, colSrc.id);
                    const coeff = corr?.coefficient ?? 0;
                    const hasData = corr !== undefined;
                    const color = hasData ? correlationColor(coeff) : 'var(--bg3)';
                    const opacity = hasData ? correlationOpacity(coeff) : 0.25;
                    const isCellActive =
                      activePair !== null &&
                      ((activePair[0] === rowSrc.id && activePair[1] === colSrc.id) ||
                        (activePair[0] === colSrc.id && activePair[1] === rowSrc.id));

                    return (
                      <div
                        key={`${rowSrc.id}-${colSrc.id}`}
                        className="shrink-0 rounded-md flex items-center justify-center cursor-pointer select-none"
                        style={{
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          marginRight: colIdx < rowIdx - 1 ? CELL_GAP : 0,
                          background: color,
                          opacity,
                          transition: 'opacity 0.15s, box-shadow 0.2s',
                          boxShadow: isCellActive
                            ? `0 0 10px 2px ${color}`
                            : 'none',
                          ['--ring-color' as string]: color,
                        }}
                        onMouseEnter={() => handleCellEnter(rowSrc.id, colSrc.id)}
                        onMouseLeave={handleCellLeave}
                        role="gridcell"
                        aria-label={
                          hasData
                            ? `${rowSrc.label} and ${colSrc.label}: r=${coeff.toFixed(2)}`
                            : `${rowSrc.label} and ${colSrc.label}: no data`
                        }
                        tabIndex={0}
                        onFocus={() => handleCellEnter(rowSrc.id, colSrc.id)}
                        onBlur={handleCellLeave}
                      >
                        {hasData && (
                          <span
                            className="font-mono font-semibold"
                            style={{
                              fontSize: '10px',
                              color: 'var(--bg)',
                              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                            }}
                          >
                            {coeff > 0 ? '+' : ''}
                            {coeff.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Signal Cards Stack */}
        <div
          className="flex flex-col gap-2 md:w-64 shrink-0"
          role="list"
          aria-label={t('fusion.signalSources', 'Signal Sources')}
        >
          {sources.map((src) => {
            const Icon = getIcon(src.icon);
            const highlighted = isHighlighted(src.id);
            const sparkColor =
              src.trend === 'rising'
                ? 'var(--risk-mid)'
                : src.trend === 'falling'
                  ? 'var(--risk-high)'
                  : 'var(--green)';

            return (
              <div
                key={src.id}
                className="rounded-lg px-3 py-2.5 transition-all duration-200"
                style={{
                  background: 'var(--bg3)',
                  border: highlighted
                    ? '1.5px solid var(--green)'
                    : '1px solid var(--border)',
                  boxShadow: highlighted
                    ? '0 0 12px 2px color-mix(in srgb, var(--green) 30%, transparent)'
                    : 'none',
                  ['--glow-color' as string]: 'var(--green)',
                  animation: highlighted ? 'msc-glow 2s ease-in-out infinite' : 'none',
                }}
                role="listitem"
              >
                <div className="flex items-start gap-2.5">
                  {/* Icon + label + value */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon
                        size={14}
                        style={{
                          color: highlighted ? 'var(--green)' : 'var(--text2)',
                        }}
                        aria-hidden="true"
                      />
                      <span
                        className="text-xs truncate"
                        style={{ color: 'var(--text2)' }}
                      >
                        {src.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{ color: 'var(--text)' }}
                      >
                        {src.currentValue}
                      </span>
                      <span
                        className="flex items-center gap-0.5 text-xs font-medium"
                        style={{ color: trendColor(src.trend) }}
                      >
                        <TrendIcon trend={src.trend} />
                        {src.trendPct > 0 ? '+' : ''}
                        {src.trendPct}%
                      </span>
                    </div>
                  </div>

                  {/* Sparkline */}
                  <Sparkline data={src.sparkline} color={sparkColor} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Insight Bar */}
      <div
        className="px-5 py-3"
        style={{
          borderTop: '1px solid var(--border)',
          minHeight: 52,
        }}
      >
        {activeCorrelation && pairLabels ? (
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--text)' }}
              >
                {pairLabels[0]}
                {' '}
                <span style={{ color: 'var(--text3)' }}>&harr;</span>
                {' '}
                {pairLabels[1]}
              </span>
              <span
                className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: correlationColor(activeCorrelation.coefficient),
                  color: 'var(--bg)',
                  fontWeight: 600,
                }}
              >
                r={activeCorrelation.coefficient > 0 ? '+' : ''}
                {activeCorrelation.coefficient.toFixed(2)}
              </span>
              <span
                className="text-xs"
                style={{ color: 'var(--text3)' }}
              >
                ({significanceLabel(activeCorrelation.significance)}{' '}
                {activeCorrelation.coefficient >= 0
                  ? t('fusion.positive', 'positive')
                  : t('fusion.negative', 'negative')}
                )
              </span>
            </div>
            <p
              className="text-xs m-0"
              style={{ color: 'var(--text2)' }}
            >
              <span style={{ color: 'var(--text3)' }}>
                {t('fusion.insight', 'Insight')}:
              </span>{' '}
              {activeCorrelation.insight}
            </p>
          </div>
        ) : (
          <p
            className="text-xs m-0 italic"
            style={{ color: 'var(--text3)' }}
          >
            {t(
              'fusion.hoverHint',
              'Hover a matrix cell to explore correlations between data sources',
            )}
          </p>
        )}
      </div>
    </div>
  );
}

export default MultiSourceCorrelationPanel;
