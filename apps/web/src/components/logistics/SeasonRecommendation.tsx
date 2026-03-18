import { useTranslation } from 'react-i18next';
import { CalendarDays, Snowflake, Sun, CloudRain, CheckCircle2 } from 'lucide-react';
import type { SeasonRecommendationResult, SeasonRating } from '@/services/harvestLogisticsService';

interface SeasonRecommendationProps {
  recommendation: SeasonRecommendationResult;
}

const CONDITION_COLORS: Record<SeasonRating['soilCondition'], string> = {
  frozen: '#60a5fa',
  good: '#4ade80',
  moderate: '#fbbf24',
  poor: '#ef4444',
};

const CONDITION_BG: Record<SeasonRating['soilCondition'], string> = {
  frozen: 'rgba(96, 165, 250, 0.15)',
  good: 'rgba(74, 222, 128, 0.10)',
  moderate: 'rgba(251, 191, 36, 0.10)',
  poor: 'rgba(239, 68, 68, 0.10)',
};

const RISK_LABELS: Record<SeasonRating['damageRisk'], string> = {
  none: '--',
  low: 'Low',
  medium: 'Med',
  high: 'High',
};

export function SeasonRecommendation({ recommendation }: SeasonRecommendationProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('logistics.season.title')}
        </h3>
      </div>

      {/* Optimal window highlight */}
      <div className="rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5 p-3 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={14} className="text-[var(--green)]" />
          <span className="text-xs font-semibold text-[var(--green)]">
            {t('logistics.season.optimalWindow')}: {recommendation.optimalWindow}
          </span>
        </div>
        <p className="text-[11px] text-[var(--text2)] leading-relaxed">
          {recommendation.reasoning}
        </p>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-12 gap-1 mb-4">
        {recommendation.ratings.map((rating) => (
          <div
            key={rating.month}
            className={`rounded-lg border p-2 text-center transition-all ${
              rating.isOptimal
                ? 'border-[var(--green)] ring-1 ring-[var(--green)]/30'
                : 'border-[var(--border)]'
            }`}
            style={{ background: CONDITION_BG[rating.soilCondition] }}
          >
            {/* Month label */}
            <span className={`block text-[10px] font-semibold ${
              rating.isOptimal ? 'text-[var(--green)]' : 'text-[var(--text2)]'
            }`}>
              {rating.month}
            </span>

            {/* Soil icon */}
            <div className="mt-1.5 flex justify-center">
              {rating.soilCondition === 'frozen' && (
                <Snowflake size={14} style={{ color: CONDITION_COLORS.frozen }} />
              )}
              {rating.soilCondition === 'good' && (
                <Sun size={14} style={{ color: CONDITION_COLORS.good }} />
              )}
              {rating.soilCondition === 'moderate' && (
                <CloudRain size={14} style={{ color: CONDITION_COLORS.moderate }} />
              )}
              {rating.soilCondition === 'poor' && (
                <CloudRain size={14} style={{ color: CONDITION_COLORS.poor }} />
              )}
            </div>

            {/* Damage risk */}
            <span
              className="block mt-1 text-[8px] font-mono uppercase"
              style={{ color: CONDITION_COLORS[rating.soilCondition] }}
            >
              {RISK_LABELS[rating.damageRisk]}
            </span>

            {/* Price outlook dot */}
            <div className="mt-1 flex justify-center">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    rating.priceOutlook === 'strong' ? '#4ade80'
                    : rating.priceOutlook === 'normal' ? '#fbbf24'
                    : '#ef4444',
                }}
                title={`${t('logistics.season.priceOutlook')}: ${rating.priceOutlook}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px]">
        <div className="font-semibold text-[var(--text3)] uppercase tracking-wider col-span-2 mb-1">
          {t('logistics.season.soilConditions')}
        </div>
        <div className="flex items-center gap-1.5">
          <Snowflake size={10} className="text-[#60a5fa]" />
          <span className="text-[var(--text3)]">{t('logistics.season.frozen')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Sun size={10} className="text-[#4ade80]" />
          <span className="text-[var(--text3)]">{t('logistics.season.good')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CloudRain size={10} className="text-[#fbbf24]" />
          <span className="text-[var(--text3)]">{t('logistics.season.moderate')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CloudRain size={10} className="text-[#ef4444]" />
          <span className="text-[var(--text3)]">{t('logistics.season.poor')}</span>
        </div>

        <div className="font-semibold text-[var(--text3)] uppercase tracking-wider col-span-2 mt-2 mb-1">
          {t('logistics.season.priceOutlook')}
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
          <span className="text-[var(--text3)]">{t('logistics.season.strong')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#fbbf24]" />
          <span className="text-[var(--text3)]">{t('logistics.season.normal')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
          <span className="text-[var(--text3)]">{t('logistics.season.weak')}</span>
        </div>
      </div>
    </div>
  );
}
