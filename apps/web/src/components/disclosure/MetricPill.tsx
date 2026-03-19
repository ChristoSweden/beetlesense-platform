import { useState, useCallback } from 'react';
import { Sparkline, type SparklineVariant } from './Sparkline';

export type MetricStatus = 'good' | 'warning' | 'critical';

export interface MetricPillProps {
  value: string | number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  status?: MetricStatus;
  sparkData?: number[];
  sparkVariant?: SparklineVariant;
  /** 'up' = green when trending up (e.g. health); 'down' = green when trending down (e.g. pest count) */
  positiveDirection?: 'up' | 'down';
  context?: string;
  className?: string;
}

const STATUS_BORDER: Record<MetricStatus, string> = {
  good: 'border-green-500/40',
  warning: 'border-amber-500/40',
  critical: 'border-red-500/40',
};

const STATUS_BG: Record<MetricStatus, string> = {
  good: 'bg-green-950/30',
  warning: 'bg-amber-950/30',
  critical: 'bg-red-950/30',
};

const TREND_ARROW: Record<'up' | 'down' | 'stable', string> = {
  up: '\u2191',
  down: '\u2193',
  stable: '\u2192',
};

const _TREND_COLOR: Record<string, string> = {
  up: 'text-green-400',
  down: 'text-red-400',
  stable: 'text-gray-400',
};

export function MetricPill({
  value,
  unit,
  trend,
  status = 'good',
  sparkData,
  sparkVariant = 'line',
  positiveDirection = 'up',
  context,
  className = '',
}: MetricPillProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => {
    if (context) setExpanded((prev) => !prev);
  }, [context]);

  // Determine trend color based on positive direction
  const trendColor = (() => {
    if (trend === 'stable') return 'text-gray-400';
    if (positiveDirection === 'up') {
      return trend === 'up' ? 'text-green-400' : 'text-red-400';
    }
    return trend === 'down' ? 'text-green-400' : 'text-red-400';
  })();

  return (
    <div className={`inline-block ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          border ${STATUS_BORDER[status]} ${STATUS_BG[status]}
          text-xs font-medium text-green-100
          transition-all duration-200
          hover:brightness-125
          ${context ? 'cursor-pointer' : 'cursor-default'}
          max-w-[160px]
        `}
        aria-expanded={context ? expanded : undefined}
      >
        <span className="font-mono tabular-nums whitespace-nowrap">
          {value}
        </span>
        <span className="text-green-400/60 text-[10px]">{unit}</span>
        <span className={`${trendColor} text-[11px] leading-none`}>
          {TREND_ARROW[trend]}
        </span>
        {sparkData && sparkData.length > 2 && (
          <Sparkline
            data={sparkData}
            width={40}
            height={14}
            variant={sparkVariant}
            positiveDirection={positiveDirection}
          />
        )}
      </button>

      {expanded && context && (
        <div
          className="mt-1 px-3 py-2 rounded-lg bg-green-950/50 border border-green-800/30
                      text-xs text-green-200/80 max-w-[200px] animate-fade-in"
        >
          {context}
        </div>
      )}
    </div>
  );
}
export default MetricPill;
