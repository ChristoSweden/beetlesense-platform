import { useTranslation } from 'react-i18next';
import { BarChart3, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getBenchmarkData } from '@/services/benchmarkService';
import { PercentileGauge } from '@/components/benchmark/PercentileGauge';

export function BenchmarkWidget() {
  const { t } = useTranslation();
  const data = getBenchmarkData('G');

  // Pick the best metric to highlight (highest percentile)
  const bestMetric = data.metrics.reduce((best, m) =>
    m.percentile > best.percentile ? m : best, data.metrics[0]);

  // Also show volume growth as the primary metric
  const growthMetric = data.metrics.find(m => m.key === 'volumeGrowth') ?? bestMetric;

  return (
    <Link
      to="/owner/benchmark"
      className="block rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-colors group"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <BarChart3 size={16} className="text-[var(--green)]" />
          </div>
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {t('benchmark.widgetTitle')}
          </h3>
        </div>
        <ChevronRight size={14} className="text-[var(--text3)] group-hover:text-[var(--green)] transition-colors" />
      </div>

      {/* Key ranking statement */}
      <p className="text-sm font-medium text-[var(--text)] mb-2">
        {t('benchmark.widgetRanking', {
          percentile: 100 - bestMetric.percentile,
          county: data.countyName.replace(' län', ''),
        })}
      </p>

      {/* Growth metric comparison */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-lg font-semibold font-mono text-[var(--green)]">
          {growthMetric.userValue.toFixed(1)}
        </span>
        <span className="text-xs text-[var(--text3)]">
          {growthMetric.unit}
        </span>
        <span className="text-xs text-[var(--text3)]">
          {t('benchmark.vs')} {growthMetric.countyAvg.toFixed(1)} {t('benchmark.avg')}
        </span>
      </div>

      {/* Mini percentile gauge */}
      <PercentileGauge percentile={growthMetric.percentile} compact />
    </Link>
  );
}
