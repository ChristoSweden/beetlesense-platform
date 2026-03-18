import { useTranslation } from 'react-i18next';
import { CloudRain, Wind, Bug, Sprout, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ClimateImpact } from '@/services/growthModelService';

interface ClimateImpactSummaryProps {
  impact: ClimateImpact;
  species: string;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'bg-[var(--green)]/10 text-[var(--green)]',
    moderate: 'bg-[#facc15]/10 text-[#facc15]',
    high: 'bg-[#f87171]/10 text-[#f87171]',
    very_high: 'bg-[#ef4444]/15 text-[#ef4444]',
  };

  const { t } = useTranslation();

  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[level] ?? colors.moderate}`}>
      {t(`growth.climate.risk.${level}`)}
    </span>
  );
}

export function ClimateImpactSummary({ impact, species: _species }: ClimateImpactSummaryProps) {
  const { t } = useTranslation();

  const isPositive = impact.growthChangePercent > 0;
  const absChange = Math.abs(impact.growthChangePercent);

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
          <Sprout size={16} className="text-[var(--green)]" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {t('growth.climate.title')}
          </h3>
          <p className="text-[10px] text-[var(--text3)]">
            {t('growth.climate.subtitle')}
          </p>
        </div>
      </div>

      {/* Growth change headline */}
      <div
        className={`rounded-lg p-3 mb-4 border ${
          isPositive
            ? 'border-[var(--green)]/20 bg-[var(--green)]/5'
            : 'border-[#f87171]/20 bg-[#f87171]/5'
        }`}
      >
        <div className="flex items-center gap-2">
          {isPositive ? (
            <CheckCircle size={14} className="text-[var(--green)]" />
          ) : (
            <AlertTriangle size={14} className="text-[#f87171]" />
          )}
          <p className="text-xs font-medium text-[var(--text)]">
            {t('growth.climate.growthChange', {
              direction: isPositive ? t('growth.climate.faster') : t('growth.climate.slower'),
              percent: absChange.toFixed(1),
            })}
          </p>
        </div>
        <p className="text-[10px] text-[var(--text3)] mt-1 ml-[22px]">
          {t('growth.climate.comparedToSLU')}
        </p>
      </div>

      {/* Risk factors */}
      <div className="space-y-2.5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain size={14} className="text-[#60a5fa]" />
            <span className="text-xs text-[var(--text)]">
              {t('growth.climate.droughtFrequency')}
            </span>
          </div>
          <RiskBadge level={impact.droughtRiskLevel} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind size={14} className="text-[var(--text2)]" />
            <span className="text-xs text-[var(--text)]">
              {t('growth.climate.stormExposure')}
            </span>
          </div>
          <RiskBadge level={impact.stormExposure} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bug size={14} className="text-[#f59e0b]" />
            <span className="text-xs text-[var(--text)]">
              {t('growth.climate.beetlePressure')}
            </span>
          </div>
          <RiskBadge level={impact.beetlePressure} />
        </div>
      </div>

      {/* Recommendations */}
      {impact.recommendations.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3">
          <p className="text-[10px] font-semibold text-[var(--text)] mb-2 flex items-center gap-1">
            <Info size={10} />
            {t('growth.climate.recommendations')}
          </p>
          <ul className="space-y-1.5">
            {impact.recommendations.map((rec) => (
              <li
                key={rec}
                className="flex items-start gap-2 text-[10px] text-[var(--text2)]"
              >
                <span className="w-1 h-1 rounded-full bg-[var(--green)] mt-1.5 flex-shrink-0" />
                {t(`growth.climate.rec.${rec}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
