import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, ArrowRight, BarChart3 } from 'lucide-react';
import { formatSEK } from '@/services/timberPriceService';
import type { SimulatorResult } from '@/services/operationCostCalculator';

interface ResultsBreakdownProps {
  result: SimulatorResult;
}

/**
 * Visual breakdown of a forestry operation simulation result.
 * Shows a stacked bar chart (Revenue | Costs | Tax | Net),
 * a detailed line-item table, and a 1-year deferral comparison.
 */
export function ResultsBreakdown({ result }: ResultsBreakdownProps) {
  const { t } = useTranslation();

  const { revenue, costs, tax, netBeforeTax, netAfterTax, deferral } = result;
  const isHarvestOp = result.operationType === 'thinning' || result.operationType === 'finalHarvest';

  // ─── Stacked Bar Segments ───
  const barSegments = useMemo(() => {
    if (!isHarvestOp || revenue.total <= 0) return null;

    const total = revenue.total;
    const costPct = Math.min((costs.total / total) * 100, 100);
    const taxPct = Math.min((tax.incomeTax / total) * 100, 100 - costPct);
    const netPct = Math.max(100 - costPct - taxPct, 0);

    return { costPct, taxPct, netPct };
  }, [revenue.total, costs.total, tax.incomeTax, isHarvestOp]);

  return (
    <div className="space-y-4">
      {/* ─── Net Income Hero ─── */}
      <div
        className="rounded-xl border border-[var(--border2)] p-5 text-center"
        style={{ background: 'var(--bg)' }}
      >
        <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
          {t('simulator.results.netAfterTax')}
        </p>
        <p
          className={`text-4xl font-bold font-mono tracking-tight ${
            netAfterTax >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
          }`}
        >
          {formatSEK(netAfterTax)}
        </p>
        {isHarvestOp && (
          <p className="text-[10px] text-[var(--text3)] mt-1">
            {t('simulator.results.perHectare')}: {formatSEK(Math.round(netAfterTax / result.areaHa))}/ha
          </p>
        )}
      </div>

      {/* ─── Stacked Bar Chart ─── */}
      {barSegments && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={13} className="text-[var(--text3)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
              {t('simulator.results.breakdown')}
            </p>
          </div>

          {/* Bar */}
          <div className="flex h-8 rounded-lg overflow-hidden border border-[var(--border)]">
            <div
              className="flex items-center justify-center text-[9px] font-mono font-semibold text-white"
              style={{
                width: `${barSegments.costPct}%`,
                background: 'var(--red)',
                minWidth: barSegments.costPct > 3 ? undefined : 0,
              }}
            >
              {barSegments.costPct > 8 && `${Math.round(barSegments.costPct)}%`}
            </div>
            <div
              className="flex items-center justify-center text-[9px] font-mono font-semibold text-white"
              style={{
                width: `${barSegments.taxPct}%`,
                background: 'var(--yellow, #eab308)',
                minWidth: barSegments.taxPct > 3 ? undefined : 0,
              }}
            >
              {barSegments.taxPct > 8 && `${Math.round(barSegments.taxPct)}%`}
            </div>
            <div
              className="flex items-center justify-center text-[9px] font-mono font-semibold text-white"
              style={{
                width: `${barSegments.netPct}%`,
                background: 'var(--green)',
              }}
            >
              {barSegments.netPct > 8 && `${Math.round(barSegments.netPct)}%`}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--red)' }} />
              <span className="text-[10px] text-[var(--text2)]">{t('simulator.results.costs')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--yellow, #eab308)' }} />
              <span className="text-[10px] text-[var(--text2)]">{t('simulator.results.tax')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--green)' }} />
              <span className="text-[10px] text-[var(--text2)]">{t('simulator.results.net')}</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detailed Line Items ─── */}
      <div
        className="rounded-lg border border-[var(--border)] overflow-hidden"
        style={{ background: 'var(--bg)' }}
      >
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
              <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                {t('simulator.results.item')}
              </th>
              <th className="text-right px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
                {t('simulator.results.amount')}
              </th>
            </tr>
          </thead>
          <tbody className="text-[var(--text2)]">
            {/* Revenue section */}
            {isHarvestOp && (
              <>
                <tr className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 font-semibold text-[var(--text)]" colSpan={2}>
                    {t('simulator.results.revenue')}
                  </td>
                </tr>
                {revenue.bySpecies.map((s) => (
                  <tr key={s.species} className="border-b border-[var(--border)]">
                    <td className="px-3 py-1.5 pl-6">
                      {t(`simulator.species.${s.species}`)} ({s.volumeM3fub} m&sup3;fub)
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[var(--green)]">
                      +{formatSEK(s.total)}
                    </td>
                  </tr>
                ))}
                <tr className="border-b border-[var(--border2)]" style={{ background: 'var(--bg2)' }}>
                  <td className="px-3 py-2 font-semibold text-[var(--text)]">
                    {t('simulator.results.totalRevenue')}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--green)]">
                    +{formatSEK(revenue.total)}
                  </td>
                </tr>
              </>
            )}

            {/* Costs section */}
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-2 font-semibold text-[var(--text)]" colSpan={2}>
                {t('simulator.results.costs')}
              </td>
            </tr>
            {costs.harvester > 0 && (
              <tr className="border-b border-[var(--border)]">
                <td className="px-3 py-1.5 pl-6">{t('simulator.costs.harvester')}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[var(--red)]">
                  -{formatSEK(costs.harvester)}
                </td>
              </tr>
            )}
            {costs.forwarder > 0 && (
              <tr className="border-b border-[var(--border)]">
                <td className="px-3 py-1.5 pl-6">{t('simulator.costs.forwarder')}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[var(--red)]">
                  -{formatSEK(costs.forwarder)}
                </td>
              </tr>
            )}
            {costs.transport > 0 && (
              <tr className="border-b border-[var(--border)]">
                <td className="px-3 py-1.5 pl-6">{t('simulator.costs.transport')}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[var(--red)]">
                  -{formatSEK(costs.transport)}
                </td>
              </tr>
            )}
            {costs.silviculture > 0 && (
              <tr className="border-b border-[var(--border)]">
                <td className="px-3 py-1.5 pl-6">{t('simulator.costs.silviculture')}</td>
                <td className="px-3 py-1.5 text-right font-mono text-[var(--red)]">
                  -{formatSEK(costs.silviculture)}
                </td>
              </tr>
            )}
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-1.5 pl-6">{t('simulator.costs.planning')}</td>
              <td className="px-3 py-1.5 text-right font-mono text-[var(--red)]">
                -{formatSEK(costs.planning)}
              </td>
            </tr>
            <tr className="border-b border-[var(--border)]">
              <td className="px-3 py-1.5 pl-6">{t('simulator.costs.roadMaintenance')}</td>
              <td className="px-3 py-1.5 text-right font-mono text-[var(--red)]">
                -{formatSEK(costs.roadMaintenance)}
              </td>
            </tr>
            <tr className="border-b border-[var(--border2)]" style={{ background: 'var(--bg2)' }}>
              <td className="px-3 py-2 font-semibold text-[var(--text)]">
                {t('simulator.results.totalCosts')}
              </td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-[var(--red)]">
                -{formatSEK(costs.total)}
              </td>
            </tr>

            {/* Net before tax */}
            {isHarvestOp && (
              <tr className="border-b border-[var(--border)]">
                <td className="px-3 py-2 font-semibold text-[var(--text)]">
                  {t('simulator.results.netBeforeTax')}
                </td>
                <td className={`px-3 py-2 text-right font-mono font-semibold ${
                  netBeforeTax >= 0 ? 'text-[var(--text)]' : 'text-[var(--red)]'
                }`}>
                  {formatSEK(netBeforeTax)}
                </td>
              </tr>
            )}

            {/* Tax section */}
            {isHarvestOp && tax.incomeTax > 0 && (
              <>
                <tr className="border-b border-[var(--border)]">
                  <td className="px-3 py-1.5 pl-6">{t('simulator.tax.estimatedTax')}</td>
                  <td className="px-3 py-1.5 text-right font-mono" style={{ color: 'var(--yellow, #eab308)' }}>
                    -{formatSEK(tax.incomeTax)}
                  </td>
                </tr>
                <tr className="border-b border-[var(--border)]">
                  <td className="px-3 py-1.5 pl-6 text-[var(--text3)]">
                    {t('simulator.tax.effectiveRate')}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-[var(--text3)]">
                    {(tax.effectiveRate * 100).toFixed(1)}%
                  </td>
                </tr>
              </>
            )}

            {/* Net after tax */}
            <tr style={{ background: 'var(--bg2)' }}>
              <td className="px-3 py-3 font-bold text-[var(--text)]">
                {t('simulator.results.netAfterTax')}
              </td>
              <td className={`px-3 py-3 text-right font-mono font-bold text-base ${
                netAfterTax >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
              }`}>
                {formatSEK(netAfterTax)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ─── Deferral Comparison ─── */}
      {isHarvestOp && deferral.additionalGrowthM3fub > 0 && (
        <div
          className="rounded-lg border border-[var(--border)] p-4"
          style={{ background: 'var(--bg)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)] mb-3">
            {t('simulator.deferral.title')}
          </p>

          <div className="flex items-center justify-between gap-3">
            {/* Now */}
            <div className="flex-1 text-center">
              <p className="text-[10px] text-[var(--text3)] mb-1">
                {t('simulator.deferral.harvestNow')}
              </p>
              <p className="text-sm font-mono font-semibold text-[var(--text)]">
                {formatSEK(deferral.currentNetAfterTax)}
              </p>
            </div>

            <ArrowRight size={16} className="text-[var(--text3)] flex-shrink-0" />

            {/* Deferred */}
            <div className="flex-1 text-center">
              <p className="text-[10px] text-[var(--text3)] mb-1">
                {t('simulator.deferral.waitOneYear')}
              </p>
              <p className="text-sm font-mono font-semibold text-[var(--text)]">
                {formatSEK(deferral.deferredNetAfterTax)}
              </p>
            </div>

            {/* Difference */}
            <div className="flex-1 text-center">
              <p className="text-[10px] text-[var(--text3)] mb-1">
                {t('simulator.deferral.difference')}
              </p>
              <div className="flex items-center justify-center gap-1">
                {deferral.difference >= 0 ? (
                  <TrendingUp size={12} className="text-[var(--green)]" />
                ) : (
                  <TrendingDown size={12} className="text-[var(--red)]" />
                )}
                <p className={`text-sm font-mono font-semibold ${
                  deferral.difference >= 0 ? 'text-[var(--green)]' : 'text-[var(--red)]'
                }`}>
                  {deferral.difference >= 0 ? '+' : ''}{formatSEK(deferral.difference)}
                </p>
              </div>
            </div>
          </div>

          <p className="text-[9px] text-[var(--text3)] mt-3 leading-relaxed">
            {t('simulator.deferral.explanation', {
              growth: deferral.additionalGrowthM3fub,
              priceChange: deferral.priceChangePercent,
            })}
          </p>
        </div>
      )}
    </div>
  );
}
