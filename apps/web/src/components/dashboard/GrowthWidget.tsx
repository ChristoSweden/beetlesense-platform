import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, ChevronRight, TrendingUp, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DEMO_PARCELS,
  getAllScenarioResults,
  assessClimateImpact,
} from '@/services/growthModelService';

/**
 * GrowthWidget — compact dashboard card showing projected MAI
 * and climate outlook for the user's primary parcel.
 */
export function GrowthWidget() {
  const { t } = useTranslation();

  const parcel = DEMO_PARCELS[0]; // Primary parcel

  const { mai, outlook, changePercent } = useMemo(() => {
    const scenarios = getAllScenarioResults(parcel, 120);
    const moderate = scenarios.find((s) => s.scenario === 'rcp60');
    const impact = assessClimateImpact(parcel);

    // Determine outlook
    let ol: 'favorable' | 'moderate' | 'challenging' = 'moderate';
    if (impact.growthChangePercent > 3 && impact.beetlePressure !== 'very_high') {
      ol = 'favorable';
    } else if (
      impact.growthChangePercent < -2 ||
      impact.beetlePressure === 'very_high' ||
      impact.droughtRiskLevel === 'high'
    ) {
      ol = 'challenging';
    }

    return {
      mai: moderate?.maxMai ?? 0,
      outlook: ol,
      changePercent: impact.growthChangePercent,
    };
  }, [parcel]);

  const outlookColors: Record<string, string> = {
    favorable: 'text-[var(--green)] bg-[var(--green)]/10',
    moderate: 'text-[#facc15] bg-[#facc15]/10',
    challenging: 'text-[#f87171] bg-[#f87171]/10',
  };

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Sprout size={18} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">
              {t('growth.widget.title')}
            </h3>
            <p className="text-[10px] text-[var(--text3)]">{parcel.name}</p>
          </div>
        </div>
        {changePercent !== 0 && (
          <div className="flex items-center gap-0.5 bg-[var(--green)]/10 text-[var(--green)] px-2 py-0.5 rounded-full">
            <TrendingUp size={10} />
            <span className="text-[10px] font-mono">
              {changePercent > 0 ? '+' : ''}{changePercent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <div>
          <p className="text-2xl font-mono font-semibold text-[var(--text)]">
            {mai.toFixed(1)}
          </p>
          <p className="text-[10px] text-[var(--text3)]">
            m³sk/ha/{t('growth.units.year')} MAI
          </p>
        </div>
        <div>
          <span className={`text-[10px] font-medium px-2 py-1 rounded-full ${outlookColors[outlook]}`}>
            {t(`growth.widget.outlook.${outlook}`)}
          </span>
        </div>
      </div>

      <Link
        to="/owner/growth-model"
        className="flex items-center justify-between w-full mt-3 pt-3 border-t border-[var(--border)] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
      >
        <span className="text-[10px] font-medium flex items-center gap-1">
          <ArrowUpRight size={10} />
          {t('growth.widget.viewFull')}
        </span>
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
