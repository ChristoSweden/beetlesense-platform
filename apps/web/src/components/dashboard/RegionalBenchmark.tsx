import { useTranslation } from 'react-i18next';
import type { RegionalBenchmarkData } from '@/hooks/useForestHealthScore';

// ─── Helpers ───

function getBarColor(score: number): string {
  if (score <= 33) return '#ef4444';
  if (score <= 66) return '#eab308';
  return '#4ade80';
}

// ─── Bar row ───

interface BenchmarkBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  highlight?: boolean;
}

function BenchmarkBar({ label, value, maxValue, color, highlight }: BenchmarkBarProps) {
  const widthPercent = Math.min(100, (value / maxValue) * 100);

  return (
    <div className="space-y-1" role="group" aria-label={`${label}: score ${value}`}>
      <div className="flex items-center justify-between">
        <span
          className={`text-xs ${highlight ? 'font-semibold text-[var(--text)]' : 'text-[var(--text3)]'}`}
        >
          {label}
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color }}
        >
          {value}
        </span>
      </div>
      <div
        className="h-3 rounded-full overflow-hidden bg-[var(--bg3)]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-label={`${label}: ${value} out of ${maxValue}`}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${widthPercent}%`,
            background: highlight
              ? `linear-gradient(90deg, ${color}cc, ${color})`
              : `${color}66`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───

interface RegionalBenchmarkProps {
  score: number;
  benchmark: RegionalBenchmarkData;
  isLoading?: boolean;
}

export function RegionalBenchmark({ score, benchmark, isLoading }: RegionalBenchmarkProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-48 bg-[var(--bg3)] rounded mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-[var(--bg3)] rounded" />
          <div className="h-3 bg-[var(--bg3)] rounded" />
          <div className="h-3 bg-[var(--bg3)] rounded" />
        </div>
      </div>
    );
  }

  const maxValue = Math.max(score, benchmark.countyAverage, benchmark.nationalAverage, 100);

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">
        {t('health.regionalTitle')}
      </h3>

      <div className="space-y-3">
        <BenchmarkBar
          label={t('health.yourForest')}
          value={score}
          maxValue={maxValue}
          color={getBarColor(score)}
          highlight
        />
        <BenchmarkBar
          label={benchmark.county}
          value={benchmark.countyAverage}
          maxValue={maxValue}
          color={getBarColor(benchmark.countyAverage)}
        />
        <BenchmarkBar
          label={t('health.nationalAverage')}
          value={benchmark.nationalAverage}
          maxValue={maxValue}
          color={getBarColor(benchmark.nationalAverage)}
        />
      </div>

      {/* Summary text */}
      <p className="text-xs text-[var(--text3)] mt-4 text-center">
        {benchmark.percentile >= 50
          ? t('health.aboveBenchmark', {
              percentile: benchmark.percentile,
              county: benchmark.county,
            })
          : t('health.belowBenchmark', {
              percentile: 100 - benchmark.percentile,
              county: benchmark.county,
            })
        }
      </p>
    </div>
  );
}
