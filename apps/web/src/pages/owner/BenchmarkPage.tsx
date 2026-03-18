import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Shield, Info, Download } from 'lucide-react';
import { PerformanceScorecard } from '@/components/benchmark/PerformanceScorecard';
import { ComparisonChart } from '@/components/benchmark/ComparisonChart';
import { PercentileGauge } from '@/components/benchmark/PercentileGauge';
import { MarketIntelligence } from '@/components/benchmark/MarketIntelligence';
import {
  getBenchmarkData,
  getMarketIntelligence,
  getDemoParcels,
  type ParcelOption,
} from '@/services/benchmarkService';
import { exportToCSV } from '@/services/exportService';

export default function BenchmarkPage() {
  const { t } = useTranslation();
  const parcels = useMemo(() => getDemoParcels(), []);
  const [selectedParcel, setSelectedParcel] = useState<ParcelOption>(parcels[0]);

  const benchmarkData = useMemo(
    () => getBenchmarkData(selectedParcel.countyCode),
    [selectedParcel.countyCode],
  );

  const marketData = useMemo(
    () => getMarketIntelligence(selectedParcel.countyCode),
    [selectedParcel.countyCode],
  );

  // Find the best metric for the leaderboard display
  const bestMetric = benchmarkData.metrics.reduce(
    (best, m) => (m.percentile > best.percentile ? m : best),
    benchmarkData.metrics[0],
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-5 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--green)]/10 border border-[var(--border2)]">
                <BarChart3 size={20} className="text-[var(--green)]" />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                  {t('benchmark.title')}
                </h1>
                <p className="text-xs text-[var(--text3)]">
                  {t('benchmark.subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const data = benchmarkData.metrics.map((m) => ({
                  metric: t(`benchmark.metrics.${m.key}`),
                  userValue: m.userValue,
                  countyAvg: m.countyAvg,
                  nationalAvg: m.nationalAvg,
                  percentile: m.percentile,
                  unit: m.unit,
                  trend: m.trend,
                  trendValue: m.trendValue,
                }));
                exportToCSV({
                  data: data as unknown as Record<string, unknown>[],
                  columns: [
                    { key: 'metric', label: 'Metric' },
                    { key: 'userValue', label: 'Your Value' },
                    { key: 'countyAvg', label: 'County Average' },
                    { key: 'nationalAvg', label: 'National Average' },
                    { key: 'percentile', label: 'Percentile' },
                    { key: 'unit', label: 'Unit' },
                    { key: 'trend', label: 'Trend' },
                    { key: 'trendValue', label: 'Trend Value' },
                  ],
                  filename: `beetlesense-benchmark-${selectedParcel.name.toLowerCase().replace(/\s+/g, '-')}`,
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text2)] border border-[var(--border)] hover:text-[var(--green)] hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors"
            >
              <Download size={14} />
              {t('export.exportButton')}
            </button>
          </div>

          {/* Privacy notice */}
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/10">
            <Shield size={14} className="text-[var(--green)] flex-shrink-0" />
            <p className="text-[10px] text-[var(--text3)]">
              {t('benchmark.privacyNotice')}
            </p>
          </div>
        </div>

        {/* Parcel Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-[var(--text2)]">
            {t('benchmark.selectParcel')}
          </label>
          <div className="flex gap-2">
            {parcels.map((parcel) => (
              <button
                key={parcel.id}
                onClick={() => setSelectedParcel(parcel)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                  selectedParcel.id === parcel.id
                    ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                    : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] border-[var(--border)]'
                }`}
              >
                <span className="block">{parcel.name}</span>
                <span className="text-[10px] opacity-60">{parcel.area} ha</span>
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard-style ranking */}
        <div className="rounded-xl border border-[var(--green)]/20 p-5" style={{ background: 'var(--green)05' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <p className="text-lg font-semibold text-[var(--text)]">
                {t('benchmark.rankingStatement', {
                  percentile: 100 - bestMetric.percentile,
                  county: benchmarkData.countyName.replace(' län', ''),
                  metric: t(`benchmark.metrics.${bestMetric.key}`).toLowerCase(),
                })}
              </p>
              <p className="text-xs text-[var(--text3)] mt-1">
                {t('benchmark.rankingContext', {
                  owners: benchmarkData.totalOwners.toLocaleString('sv-SE'),
                  county: benchmarkData.countyName,
                })}
              </p>
            </div>
            <div className="w-full md:w-64">
              <PercentileGauge percentile={bestMetric.percentile} label={t(`benchmark.metrics.${bestMetric.key}`)} />
            </div>
          </div>
        </div>

        {/* Performance Scorecard */}
        <PerformanceScorecard metrics={benchmarkData.metrics} countyName={benchmarkData.countyName} />

        {/* Comparison Chart */}
        <ComparisonChart metrics={benchmarkData.metrics} countyName={benchmarkData.countyName} />

        {/* Full Percentile Gauges */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-4">
            {t('benchmark.percentileDistribution')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benchmarkData.metrics.map((metric) => (
              <div
                key={metric.key}
                className="rounded-xl border border-[var(--border)] p-4"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-semibold text-[var(--text)]">
                    {t(`benchmark.metrics.${metric.key}`)}
                  </h4>
                  <span className="text-xs font-mono text-[var(--green)]">
                    {t('benchmark.topPercent', { value: 100 - metric.percentile })}
                  </span>
                </div>
                <PercentileGauge percentile={metric.percentile} />
              </div>
            ))}
          </div>
        </div>

        {/* Market Intelligence */}
        <MarketIntelligence data={marketData} countyName={benchmarkData.countyName} />

        {/* Data source notice */}
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <Info size={14} className="text-[var(--text3)] flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-[var(--text3)] leading-relaxed">
            {t('benchmark.dataSource')}
          </p>
        </div>
      </div>
    </div>
  );
}
