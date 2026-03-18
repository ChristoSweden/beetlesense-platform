import { useTranslation } from 'react-i18next';
import {
  Snowflake,
  Sun,
  Cloud,
  CloudRain,
  Leaf,
  Flower2,
  TreePine,
  Thermometer,
} from 'lucide-react';
import type { MonthData, FrostRisk } from '@/services/microclimateService';

const SEASONAL_ICONS: Record<number, typeof Sun> = {
  1: Snowflake, 2: Snowflake, 3: Cloud,
  4: Flower2, 5: Flower2, 6: Sun,
  7: Sun, 8: Sun, 9: Leaf,
  10: Leaf, 11: CloudRain, 12: Snowflake,
};

const FROST_COLORS: Record<FrostRisk, string> = {
  none: '#4ade80',
  low: '#86efac',
  medium: '#fbbf24',
  high: '#ef4444',
};

interface MonthCardProps {
  data: MonthData;
  isCurrentMonth: boolean;
}

export function MonthCard({ data, isCurrentMonth }: MonthCardProps) {
  const { t } = useTranslation();
  const Icon = SEASONAL_ICONS[data.month] ?? TreePine;
  const frostColor = FROST_COLORS[data.frostRisk];

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all ${
        isCurrentMonth
          ? 'border-[var(--green)] ring-1 ring-[var(--green)]/30'
          : 'border-[var(--border)] hover:border-[var(--border2)]'
      }`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b border-[var(--border)] ${
        isCurrentMonth ? 'bg-[var(--green)]/5' : ''
      }`}>
        <div className="flex items-center gap-2">
          <Icon size={16} className={isCurrentMonth ? 'text-[var(--green)]' : 'text-[var(--text3)]'} />
          <h3 className="text-sm font-semibold text-[var(--text)] capitalize">
            {t(`microclimate.months.${data.name}`)}
          </h3>
          {isCurrentMonth && (
            <span className="text-[9px] font-semibold text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full uppercase">
              {t('microclimate.current')}
            </span>
          )}
        </div>
        {/* Frost risk badge */}
        <span
          className="text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase"
          style={{ color: frostColor, background: `${frostColor}15` }}
        >
          {t(`microclimate.frost.${data.frostRisk}`)}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Temperature row */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{t('microclimate.avg')}</p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">{data.adjustedAvgTemp}°</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{t('microclimate.min')}</p>
            <p className="text-sm font-mono font-semibold text-[#60a5fa]">{data.adjustedMinTemp}°</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{t('microclimate.max')}</p>
            <p className="text-sm font-mono font-semibold text-[#f97316]">{data.adjustedMaxTemp}°</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg p-2 bg-[var(--bg)]/50">
            <p className="text-[10px] text-[var(--text3)]">{t('microclimate.precip')}</p>
            <p className="text-xs font-mono font-semibold text-[var(--text)]">{data.precipitation} mm</p>
          </div>
          <div className="rounded-lg p-2 bg-[var(--bg)]/50">
            <p className="text-[10px] text-[var(--text3)]">{t('microclimate.daylight')}</p>
            <p className="text-xs font-mono font-semibold text-[var(--text)]">{data.daylightHours}h</p>
          </div>
          <div className="rounded-lg p-2 bg-[var(--bg)]/50">
            <p className="text-[10px] text-[var(--text3)]">{t('microclimate.frostDays')}</p>
            <p className="text-xs font-mono font-semibold text-[var(--text)]">{data.frostDays}d</p>
          </div>
        </div>

        {/* Soil temperature */}
        <div className="flex items-center gap-2 rounded-lg p-2 bg-[var(--bg)]/50">
          <Thermometer size={12} className="text-[var(--text3)]" />
          <span className="text-[10px] text-[var(--text3)]">{t('microclimate.soilTemp')}</span>
          <span className="text-xs font-mono font-semibold text-[var(--text)] ml-auto">
            {data.soilTemp10cm}°C
          </span>
          {data.soilTemp10cm < 0 && (
            <span className="text-[9px] font-semibold text-[#60a5fa] bg-[#60a5fa]/10 px-1.5 py-0.5 rounded-full">
              {t('microclimate.frozen')}
            </span>
          )}
          {data.soilTemp10cm >= 6 && (
            <span className="text-[9px] font-semibold text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded-full">
              {t('microclimate.growthActive')}
            </span>
          )}
        </div>

        {/* Forestry activities */}
        {data.forestryActivities.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-1.5">
              {t('microclimate.activities.title')}
            </p>
            <div className="space-y-1">
              {data.forestryActivities.map((key) => (
                <div key={key} className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[var(--green)] mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-[var(--text2)]">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Phenology notes */}
        {data.phenologyNotes.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider mb-1.5">
              {t('microclimate.inYourForest')}
            </p>
            <div className="space-y-1">
              {data.phenologyNotes.map((key) => (
                <div key={key} className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-[var(--amber)] mt-1.5 flex-shrink-0" />
                  <span className="text-xs text-[var(--text3)] italic">{t(key)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GDD */}
        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
          <span className="text-[10px] text-[var(--text3)]">{t('microclimate.gddAccumulated')}</span>
          <span className="text-xs font-mono font-semibold text-[var(--green)]">
            {data.gddAccumulated} GDD
          </span>
        </div>
      </div>
    </div>
  );
}
