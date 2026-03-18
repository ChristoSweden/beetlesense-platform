import { useTranslation } from 'react-i18next';
import { Factory, Trophy, Truck } from 'lucide-react';
import type { MillOption } from '@/services/harvestLogisticsService';

interface MillComparisonProps {
  mills: MillOption[];
}

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value);
}

export function MillComparison({ mills }: MillComparisonProps) {
  const { t } = useTranslation();

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Factory size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('logistics.mills.title')}
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-xs" role="table">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.mill')}
              </th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.distance')}
              </th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.sawlogPrice')}
              </th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.pulpPrice')}
              </th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.transportCost')}
              </th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.netPerM3')}
              </th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.queueDays')}
              </th>
              <th className="text-right py-2 px-2 text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
                {t('logistics.mills.totalNet')}
              </th>
            </tr>
          </thead>
          <tbody>
            {mills.map((mill) => (
              <tr
                key={mill.id}
                className={`border-b border-[var(--border)]/50 transition-colors ${
                  mill.isBestChoice
                    ? 'bg-[var(--green)]/5'
                    : 'hover:bg-[var(--bg3)]'
                }`}
              >
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2">
                    {mill.isBestChoice && (
                      <Trophy size={12} className="text-[var(--green)] flex-shrink-0" />
                    )}
                    <div>
                      <p className={`font-medium ${mill.isBestChoice ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                        {mill.name}
                      </p>
                      <p className="text-[10px] text-[var(--text3)]">{mill.company}</p>
                    </div>
                  </div>
                </td>
                <td className="text-right py-2.5 px-2 text-[var(--text2)] font-mono">
                  {mill.distanceKm} km
                </td>
                <td className="text-right py-2.5 px-2 text-[var(--text2)] font-mono">
                  {mill.bidPrices.sawlog}
                </td>
                <td className="text-right py-2.5 px-2 text-[var(--text2)] font-mono">
                  {mill.bidPrices.pulpwood}
                </td>
                <td className="text-right py-2.5 px-2 text-[var(--text2)] font-mono">
                  {mill.transportCostPerM3}
                </td>
                <td className="text-right py-2.5 px-2 font-mono font-medium text-[var(--text)]">
                  {mill.netRevenuePerM3Sawlog}
                </td>
                <td className="text-right py-2.5 px-2 text-[var(--text2)] font-mono">
                  <div className="flex items-center justify-end gap-1">
                    <Truck size={10} className="text-[var(--text3)]" />
                    {mill.estimatedQueueDays}d
                  </div>
                </td>
                <td className="text-right py-2.5 px-2">
                  <span className={`font-mono font-semibold ${
                    mill.isBestChoice ? 'text-[var(--green)]' : 'text-[var(--text)]'
                  }`}>
                    {formatSEK(mill.totalNetRevenue)}
                  </span>
                  {mill.isBestChoice && (
                    <span className="ml-1.5 text-[9px] font-mono bg-[var(--green)]/10 text-[var(--green)] px-1.5 py-0.5 rounded-full">
                      {t('logistics.mills.bestChoice')}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <p className="text-[10px] text-[var(--text3)] mt-3 italic">
        {t('logistics.mills.priceNote')}
      </p>
    </div>
  );
}
