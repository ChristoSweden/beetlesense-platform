import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PercentileGaugeProps {
  /** Percentile value 0-100 (higher = better) */
  percentile: number;
  /** Optional label above the gauge */
  label?: string;
  /** Compact mode for scorecard cards */
  compact?: boolean;
}

export function PercentileGauge({ percentile, label, compact = false }: PercentileGaugeProps) {
  const { t } = useTranslation();
  const [animatedPercentile, setAnimatedPercentile] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercentile(percentile), 100);
    return () => clearTimeout(timer);
  }, [percentile]);

  const markerX = (animatedPercentile / 100) * 100;

  // Color based on percentile
  function getColor(p: number): string {
    if (p >= 75) return '#4ade80';
    if (p >= 50) return '#86efac';
    if (p >= 25) return '#fbbf24';
    return '#ef4444';
  }

  const color = getColor(percentile);

  if (compact) {
    return (
      <div className="w-full" role="meter" aria-valuenow={percentile} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? t('benchmark.percentile')}>
        <div className="relative h-2 rounded-full overflow-hidden bg-[var(--bg3)]">
          {/* Gradient background */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(90deg, #ef444440, #fbbf2440, #86efac40, #4ade8040)',
            }}
          />
          {/* Marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg)] shadow-sm transition-all duration-700 ease-out"
            style={{
              left: `calc(${markerX}% - 5px)`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full" role="meter" aria-valuenow={percentile} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? t('benchmark.percentile')}>
      {label && (
        <p className="text-xs text-[var(--text3)] mb-2">{label}</p>
      )}

      <svg viewBox="0 0 300 40" className="w-full" aria-hidden="true">
        {/* Background track */}
        <rect x="10" y="12" width="280" height="8" rx="4" fill="var(--bg3)" />

        {/* Gradient fill */}
        <defs>
          <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="25%" stopColor="#fbbf24" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#86efac" stopOpacity="0.4" />
            <stop offset="75%" stopColor="#4ade80" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <rect x="10" y="12" width="280" height="8" rx="4" fill="url(#gauge-gradient)" />

        {/* Tick marks */}
        <line x1="80" y1="10" x2="80" y2="22" stroke="var(--border2)" strokeWidth="1" opacity="0.5" />
        <line x1="150" y1="10" x2="150" y2="22" stroke="var(--border2)" strokeWidth="1" opacity="0.5" />
        <line x1="220" y1="10" x2="220" y2="22" stroke="var(--border2)" strokeWidth="1" opacity="0.5" />

        {/* Labels */}
        <text x="45" y="36" textAnchor="middle" fill="var(--text3)" fontSize="8" fontFamily="monospace">
          {t('benchmark.bottom25')}
        </text>
        <text x="150" y="36" textAnchor="middle" fill="var(--text3)" fontSize="8" fontFamily="monospace">
          {t('benchmark.average')}
        </text>
        <text x="220" y="36" textAnchor="middle" fill="var(--text3)" fontSize="8" fontFamily="monospace">
          {t('benchmark.top25')}
        </text>
        <text x="275" y="36" textAnchor="middle" fill="var(--text3)" fontSize="8" fontFamily="monospace">
          {t('benchmark.top10')}
        </text>

        {/* User marker */}
        <circle
          cx={10 + (animatedPercentile / 100) * 280}
          cy="16"
          r="6"
          fill={color}
          stroke="var(--bg)"
          strokeWidth="2"
          className="transition-all duration-700 ease-out"
        />
      </svg>
    </div>
  );
}
