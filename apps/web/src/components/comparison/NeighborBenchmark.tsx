import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import type { RegionalBenchmark, BenchmarkMetric } from '@/hooks/useComparisonData';

interface NeighborBenchmarkProps {
  benchmark: RegionalBenchmark;
  className?: string;
}

const METRIC_COLORS: Record<BenchmarkMetric['key'], { yours: string; avg: string }> = {
  ndvi: { yours: '#22c55e', avg: '#4b5563' },
  pestRisk: { yours: '#f59e0b', avg: '#4b5563' },
  speciesDiversity: { yours: '#3b82f6', avg: '#4b5563' },
};

const METRIC_LABELS: Record<BenchmarkMetric['key'], string> = {
  ndvi: 'comparison.benchmark.ndvi',
  pestRisk: 'comparison.benchmark.pestRisk',
  speciesDiversity: 'comparison.benchmark.speciesDiversity',
};

/** Invert display for metrics where lower is better */
const LOWER_IS_BETTER = new Set<BenchmarkMetric['key']>(['pestRisk']);

export function NeighborBenchmark({ benchmark, className = '' }: NeighborBenchmarkProps) {
  const { t } = useTranslation();

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('comparison.benchmark.title')}
        </h3>
      </div>

      {/* Metrics */}
      <div className="space-y-5">
        {benchmark.metrics.map((metric) => {
          const colors = METRIC_COLORS[metric.key] ?? { yours: '#22c55e', avg: '#4b5563' };
          const lowerBetter = LOWER_IS_BETTER.has(metric.key);
          const maxVal = Math.max(metric.yourValue, metric.countyAverage) * 1.2 || 1;
          const yourBarPct = (metric.yourValue / maxVal) * 100;
          const avgBarPct = (metric.countyAverage / maxVal) * 100;

          // Determine if "yours" is better
          const isBetter = lowerBetter
            ? metric.yourValue <= metric.countyAverage
            : metric.yourValue >= metric.countyAverage;

          return (
            <div key={metric.key}>
              {/* Metric label */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text2)]">
                  {t(METRIC_LABELS[metric.key] ?? metric.labelKey)}
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    isBetter ? 'text-[var(--green)]' : 'text-[var(--amber)]'
                  }`}
                >
                  {t('comparison.benchmark.topPercent', {
                    percent: lowerBetter ? 100 - metric.percentile : metric.percentile,
                    county: benchmark.county,
                  })}
                </span>
              </div>

              {/* Your value bar */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text3)] w-16 shrink-0">
                    {t('comparison.benchmark.yours')}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--bg3)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${yourBarPct}%`,
                        backgroundColor: colors.yours,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text)] w-10 text-right">
                    {metric.yourValue.toFixed(2)}
                  </span>
                </div>

                {/* County average bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text3)] w-16 shrink-0">
                    {benchmark.county}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--bg3)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${avgBarPct}%`,
                        backgroundColor: colors.avg,
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text3)] w-10 text-right">
                    {metric.countyAverage.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-[var(--text3)] mt-4 leading-relaxed">
        {t('comparison.benchmark.disclaimer')}
      </p>
    </div>
  );
}
