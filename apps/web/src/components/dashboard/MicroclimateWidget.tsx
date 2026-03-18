import { useTranslation } from 'react-i18next';
import { Thermometer, ChevronRight, Snowflake } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getParcelClimate,
  getCurrentMonthIndex,
  getGrowingSeasonProgress,
  getNextFrostRiskDate,
} from '@/services/microclimateService';

export function MicroclimateWidget() {
  const { t } = useTranslation();
  const climate = getParcelClimate('p1');
  const currentIdx = getCurrentMonthIndex();
  const currentMonth = climate.months[currentIdx];
  const progress = getGrowingSeasonProgress(climate);
  const nextFrost = getNextFrostRiskDate(climate);

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            {t('microclimate.widget.title')}
          </h3>
          <Thermometer size={14} className="text-[var(--text3)]" />
        </div>

        {/* Current conditions */}
        <div className="flex items-center gap-4 mb-3">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-[var(--text)]">
                {currentMonth.adjustedAvgTemp}°C
              </span>
              <span className="text-[10px] text-[var(--text3)]">
                {t(`microclimate.months.${currentMonth.name}`)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-[#60a5fa] font-mono">{currentMonth.adjustedMinTemp}°</span>
              <span className="text-[10px] text-[var(--text3)]">/</span>
              <span className="text-[10px] text-[#f97316] font-mono">{currentMonth.adjustedMaxTemp}°</span>
            </div>
          </div>

          <div className="ml-auto text-right">
            <div className="text-[10px] text-[var(--text3)]">{t('microclimate.widget.soilTemp')}</div>
            <div className="text-sm font-mono font-semibold text-[#a78bfa]">
              {currentMonth.soilTemp10cm}°C
            </div>
          </div>
        </div>

        {/* Growing season progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text3)]">{t('microclimate.widget.growingSeason')}</span>
            <span className="text-[10px] font-mono text-[var(--green)]">
              {progress.elapsed}/{progress.total} {t('microclimate.widget.days')}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {/* Next frost risk */}
        {nextFrost && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-[#60a5fa]/5 border border-[#60a5fa]/20 mb-3">
            <Snowflake size={12} className="text-[#60a5fa]" />
            <span className="text-[10px] text-[var(--text2)]">
              {t('microclimate.widget.nextFrost')}: {t(`microclimate.months.${nextFrost}`)}
            </span>
          </div>
        )}

        {/* Link to full page */}
        <Link
          to="/owner/microclimate"
          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
        >
          <span className="text-xs font-medium text-[var(--text)]">
            {t('microclimate.widget.viewAlmanac')}
          </span>
          <ChevronRight size={14} className="text-[var(--text3)]" />
        </Link>
      </div>
    </div>
  );
}
