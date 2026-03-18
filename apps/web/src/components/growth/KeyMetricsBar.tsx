import { useTranslation } from 'react-i18next';
import { TrendingUp, Timer, Package } from 'lucide-react';
import type { ScenarioResult } from '@/services/growthModelService';

interface KeyMetricsBarProps {
  /** The moderate (RCP 6.0) scenario result */
  moderate: ScenarioResult;
  currentAge: number;
}

export function KeyMetricsBar({ moderate, currentAge }: KeyMetricsBarProps) {
  const { t } = useTranslation();

  const yearsToOptimal = moderate.optimalRotationAge - currentAge;

  return (
    <div className="grid grid-cols-3 gap-3">
      <div
        className="rounded-xl border border-[var(--border)] p-3 text-center"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-center gap-1 mb-1">
          <TrendingUp size={12} className="text-[var(--green)]" />
          <span className="text-[10px] text-[var(--text3)]">
            {t('growth.metrics.mai')}
          </span>
        </div>
        <p className="text-xl font-mono font-semibold text-[var(--text)]">
          {moderate.maxMai.toFixed(1)}
        </p>
        <p className="text-[9px] text-[var(--text3)]">
          m³sk/ha/{t('growth.units.year')}
        </p>
      </div>

      <div
        className="rounded-xl border border-[var(--border)] p-3 text-center"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-center gap-1 mb-1">
          <Timer size={12} className="text-[var(--green)]" />
          <span className="text-[10px] text-[var(--text3)]">
            {t('growth.metrics.optimalAge')}
          </span>
        </div>
        <p className="text-xl font-mono font-semibold text-[var(--text)]">
          {moderate.optimalRotationAge}
        </p>
        <p className="text-[9px] text-[var(--text3)]">
          {yearsToOptimal > 0
            ? t('growth.metrics.yearsAway', { years: yearsToOptimal })
            : t('growth.metrics.pastOptimal')}
        </p>
      </div>

      <div
        className="rounded-xl border border-[var(--border)] p-3 text-center"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-center gap-1 mb-1">
          <Package size={12} className="text-[var(--green)]" />
          <span className="text-[10px] text-[var(--text3)]">
            {t('growth.metrics.volumeAtHarvest')}
          </span>
        </div>
        <p className="text-xl font-mono font-semibold text-[var(--text)]">
          {Math.round(moderate.volumeAtOptimal)}
        </p>
        <p className="text-[9px] text-[var(--text3)]">m³sk/ha</p>
      </div>
    </div>
  );
}
