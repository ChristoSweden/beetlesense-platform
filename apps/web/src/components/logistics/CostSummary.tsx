import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import type { CostSummaryResult, StandInfo } from '@/services/harvestLogisticsService';

interface CostSummaryProps {
  summary: CostSummaryResult;
  stand: StandInfo;
}

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value);
}

function Row({ label, value, bold, color }: { label: string; value: number; bold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-xs ${bold ? 'font-semibold text-[var(--text)]' : 'text-[var(--text2)]'}`}>
        {label}
      </span>
      <span className={`text-xs font-mono ${bold ? 'font-semibold' : ''}`} style={{ color: color ?? 'var(--text)' }}>
        {formatSEK(value)} kr
      </span>
    </div>
  );
}

export function CostSummary({ summary, stand: _stand }: CostSummaryProps) {
  const { t } = useTranslation();
  const isProfit = summary.netProfit > 0;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <DollarSign size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('logistics.costs.title')}
        </h3>
      </div>

      {/* Revenue section */}
      <div className="mb-4">
        <h4 className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
          {t('logistics.costs.revenue')}
        </h4>
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
          <Row label={t('logistics.costs.sawlog')} value={summary.revenue.sawlog} />
          <Row label={t('logistics.costs.pulpwood')} value={summary.revenue.pulpwood} />
          <Row label={t('logistics.costs.energyWood')} value={summary.revenue.energyWood} />
          <div className="border-t border-[var(--border)] mt-1 pt-1">
            <Row label={t('logistics.costs.totalRevenue')} value={summary.revenue.total} bold color="#4ade80" />
          </div>
        </div>
      </div>

      {/* Costs section */}
      <div className="mb-4">
        <h4 className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
          {t('logistics.costs.expenses')}
        </h4>
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
          <Row label={t('logistics.costs.harvesterCost')} value={summary.costs.harvester} />
          <Row label={t('logistics.costs.forwarderCost')} value={summary.costs.forwarder} />
          <Row label={t('logistics.costs.transportCost')} value={summary.costs.transport} />
          <Row label={t('logistics.costs.planning')} value={summary.costs.planning} />
          <Row label={t('logistics.costs.roadMaintenance')} value={summary.costs.roadMaintenance} />
          <div className="border-t border-[var(--border)] mt-1 pt-1">
            <Row label={t('logistics.costs.totalCosts')} value={summary.costs.total} bold color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Net profit */}
      <div
        className={`rounded-lg border p-4 ${
          isProfit ? 'border-[var(--green)]/30 bg-[var(--green)]/5' : 'border-[#ef4444]/30 bg-[#ef4444]/5'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isProfit ? (
              <TrendingUp size={16} className="text-[var(--green)]" />
            ) : (
              <TrendingDown size={16} className="text-[#ef4444]" />
            )}
            <span className="text-sm font-semibold text-[var(--text)]">
              {t('logistics.costs.netProfit')}
            </span>
          </div>
          <span className={`text-xl font-bold font-mono ${isProfit ? 'text-[var(--green)]' : 'text-[#ef4444]'}`}>
            {formatSEK(summary.netProfit)} kr
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className={`font-mono px-2 py-0.5 rounded-full ${
            isProfit ? 'bg-[var(--green)]/10 text-[var(--green)]' : 'bg-[#ef4444]/10 text-[#ef4444]'
          }`}>
            {t('logistics.costs.margin')}: {summary.marginPercent}%
          </span>
          <span className="text-[var(--text3)]">
            {formatSEK(summary.perHectare)} kr/ha
          </span>
          <span className="text-[var(--text3)]">
            {formatSEK(summary.perM3)} kr/m{'\u00B3'}
          </span>
        </div>
      </div>
    </div>
  );
}
