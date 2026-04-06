import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Leaf, TrendingUp, ChevronRight } from 'lucide-react';
import {
  DEMO_PARCELS,
  analyzeParcel,
  formatCO2,
  formatSEK,
  CERTIFICATION_PROGRAMS,
  SEK_PER_EUR,
} from '@/services/carbonService';

export function CarbonWidget() {
  const { t } = useTranslation();

  const summary = useMemo(() => {
    const results = DEMO_PARCELS.map(analyzeParcel);
    const totalStored = results.reduce((s, r) => s + r.stock.totalCO2, 0);
    const totalAnnual = results.reduce((s, r) => s + r.annualSequestration, 0);
    const potentialRevenue = totalAnnual * CERTIFICATION_PROGRAMS.verra.priceEurPerTon * SEK_PER_EUR;
    return { totalStored, totalAnnual, potentialRevenue };
  }, []);

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Leaf size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--text)]">
            {t('carbon.widget.title')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-lg font-bold font-mono text-[var(--text)]">
            {formatCO2(summary.totalStored)}
          </p>
          <p className="text-[10px] text-[var(--text3)]">{t('carbon.widget.tonCO2Stored')}</p>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <TrendingUp size={12} className="text-[var(--green)]" />
            <p className="text-lg font-bold font-mono text-[var(--green)]">
              {formatSEK(summary.potentialRevenue)}
            </p>
          </div>
          <p className="text-[10px] text-[var(--text3)]">{t('carbon.widget.potentialRevenue')}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Link
          to="/owner/carbon"
          className="flex items-center justify-between w-full p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
        >
          <span className="text-xs font-medium text-[var(--green)]">
            {t('carbon.widget.explore')}
          </span>
          <ChevronRight size={14} className="text-[var(--green)]" />
        </Link>
        <Link
          to="/owner/carbon-sale"
          className="flex items-center justify-between w-full p-2.5 rounded-lg bg-[var(--green)] hover:brightness-110 transition-all"
        >
          <span className="text-xs font-semibold text-white">Sell carbon credits</span>
          <ChevronRight size={14} className="text-white" />
        </Link>
      </div>
    </div>
  );
}
