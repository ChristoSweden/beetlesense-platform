/**
 * RotationWidget — Dashboard widget showing 80-year forest value summary
 * with a call-to-action to the full Long Rotation Modeling page.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Timer, TrendingUp, Leaf, ChevronRight } from 'lucide-react';
import {
  DEMO_STAND,
  DEFAULT_STREAMS,
  DEFAULT_SENSITIVITY,
  projectStrategy,
  formatKr,
} from '@/services/longRotationService';

export function RotationWidget() {
  const { t } = useTranslation();

  const summary = useMemo(() => {
    // Run the carbon-focused strategy to show the "full picture" value
    const carbonResult = projectStrategy(DEMO_STAND, 'carbon_focused', DEFAULT_STREAMS, DEFAULT_SENSITIVITY, 80);
    const traditionalResult = projectStrategy(DEMO_STAND, 'traditional', DEFAULT_STREAMS, DEFAULT_SENSITIVITY, 80);

    // Calculate annual carbon credit potential
    const avgAnnualCarbon = carbonResult.totalRevenueByStream.carbon / 80;

    return {
      totalValue: Math.max(carbonResult.totalNPV, traditionalResult.totalNPV),
      bestStrategy: carbonResult.totalNPV > traditionalResult.totalNPV ? 'carbon' : 'traditional',
      annualCarbonPotential: avgAnnualCarbon,
      huntingPotential: traditionalResult.totalRevenueByStream.hunting / 80,
    };
  }, []);

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Timer size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--text)]">
            {t('rotation.widget.title')}
          </span>
        </div>
      </div>

      <div className="mb-3">
        <p className="text-lg font-bold font-mono text-[var(--text)]">
          {formatKr(summary.totalValue)}
        </p>
        <p className="text-[10px] text-[var(--text3)]">
          {t('rotation.widget.totalValue')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <div className="flex items-center gap-1 mb-0.5">
            <Leaf size={10} className="text-[var(--green)]" />
            <span className="text-[9px] text-[var(--text3)]">{t('rotation.widget.carbonPotential')}</span>
          </div>
          <p className="text-xs font-mono font-semibold text-[var(--green)]">
            +{formatKr(summary.annualCarbonPotential)}/yr
          </p>
        </div>
        <div className="p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp size={10} className="text-[var(--amber)]" />
            <span className="text-[9px] text-[var(--text3)]">{t('rotation.widget.huntingLease')}</span>
          </div>
          <p className="text-xs font-mono font-semibold text-[var(--amber)]">
            +{formatKr(summary.huntingPotential)}/yr
          </p>
        </div>
      </div>

      <Link
        to="/owner/long-rotation"
        className="flex items-center justify-between w-full p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
      >
        <span className="text-xs font-medium text-[var(--green)]">
          {t('rotation.widget.explore')}
        </span>
        <ChevronRight size={14} className="text-[var(--green)]" />
      </Link>
    </div>
  );
}
