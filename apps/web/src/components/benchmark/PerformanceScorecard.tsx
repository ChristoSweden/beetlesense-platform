import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PercentileGauge } from './PercentileGauge';
import type { BenchmarkMetric } from '@/services/benchmarkService';
import { formatNumber } from '@/services/benchmarkService';

// ─── Metric Card ───

interface MetricCardProps {
  metric: BenchmarkMetric;
}

function MetricCard({ metric }: MetricCardProps) {
  const { t } = useTranslation();

  const isAboveAvg = metric.userValue > metric.countyAvg;
  const percentileLabel = metric.percentile >= 50
    ? t('benchmark.topPercent', { value: 100 - metric.percentile })
    : t('benchmark.bottomPercent', { value: metric.percentile });

  // Format values appropriately
  function formatMetricValue(value: number, key: string): string {
    if (key === 'timberValue') return formatNumber(value);
    if (key === 'speciesDiversity') return value.toFixed(2);
    if (key === 'carbonSequestration') return value.toFixed(1);
    return value.toFixed(1);
  }

  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? '#4ade80' : metric.trend === 'down' ? '#ef4444' : 'var(--text3)';

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header: metric name + trend */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
          {t(`benchmark.metrics.${metric.key}`)}
        </h4>
        <div className="flex items-center gap-1" title={`${metric.trend === 'up' ? '+' : ''}${metric.trendValue} ${metric.unit}`}>
          <TrendIcon size={14} style={{ color: trendColor }} />
        </div>
      </div>

      {/* User value — large */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-2xl font-semibold font-mono tabular-nums text-[var(--text)]">
          {formatMetricValue(metric.userValue, metric.key)}
        </span>
        <span className="text-xs text-[var(--text3)]">{metric.unit}</span>
      </div>

      {/* County average */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-[var(--text3)]">
          {t('benchmark.countyAvg')}: {formatMetricValue(metric.countyAvg, metric.key)}
        </span>
        <span
          className="text-[10px] font-mono px-1.5 py-0.5 rounded-full"
          style={{
            color: isAboveAvg ? '#4ade80' : '#ef4444',
            background: isAboveAvg ? '#4ade8015' : '#ef444415',
          }}
        >
          {isAboveAvg ? '+' : ''}{((metric.userValue - metric.countyAvg) / metric.countyAvg * 100).toFixed(0)}%
        </span>
      </div>

      {/* Percentile gauge */}
      <PercentileGauge percentile={metric.percentile} compact />

      {/* Percentile label */}
      <p className="text-[10px] text-[var(--text3)] mt-2 text-center font-mono">
        {percentileLabel}
      </p>
    </div>
  );
}

// ─── Main Component ───

interface PerformanceScorecardProps {
  metrics: BenchmarkMetric[];
  countyName: string;
}

export function PerformanceScorecard({ metrics, countyName }: PerformanceScorecardProps) {
  const { t } = useTranslation();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('benchmark.scorecard')}
        </h3>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-1 rounded-full">
          {countyName}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>
    </div>
  );
}
