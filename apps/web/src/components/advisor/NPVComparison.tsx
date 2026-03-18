import { useTranslation } from 'react-i18next';
import { TrendingUp, Info } from 'lucide-react';
import type { AnalysisResult, RiskLevel } from '@/services/advisorService';

interface NPVComparisonProps {
  analysis: AnalysisResult;
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4ade80',
  moderate: '#fbbf24',
  high: '#f97316',
  very_high: '#ef4444',
};

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

export function NPVComparison({ analysis }: NPVComparisonProps) {
  const { t } = useTranslation();
  const { options, sensitivityAnalysis } = analysis;

  const maxNpv = Math.max(...options.map((o) => o.npv));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp size={16} className="text-[var(--green)]" />
        <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
          {t('advisor.npvComparison')}
        </h3>
        <span className="text-[9px] text-[var(--text3)] font-mono">
          ({t('advisor.discountRate')} 3.5%)
        </span>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="text-left p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]">
                {t('advisor.option')}
              </th>
              <th className="text-right p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]">
                {t('advisor.initialCost')}
              </th>
              <th className="text-left p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]">
                {t('advisor.revenueTimeline')}
              </th>
              <th className="text-right p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]">
                {t('advisor.npv')} (3.5%)
              </th>
              <th className="text-right p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]">
                {t('advisor.irr')}
              </th>
              <th className="text-center p-3 text-[var(--text3)] uppercase tracking-wider font-medium text-[10px]">
                {t('advisor.riskLevel')}
              </th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => (
              <tr
                key={option.id}
                className={`
                  border-b border-[var(--border)] last:border-b-0 transition-colors
                  ${option.recommended ? 'bg-[var(--green)]/5' : 'hover:bg-[var(--bg3)]'}
                `}
              >
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {option.recommended && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] flex-shrink-0" />
                    )}
                    <span
                      className={`font-medium ${
                        option.recommended ? 'text-[var(--green)]' : 'text-[var(--text)]'
                      }`}
                    >
                      {t(option.titleKey)}
                    </span>
                    {option.recommended && (
                      <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)]">
                        {t('advisor.recommended')}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-right font-mono text-[var(--text)]">
                  {option.initialCost > 0 ? formatSEK(option.initialCost) : '-'}
                </td>
                <td className="p-3 text-[var(--text2)] max-w-[180px]">
                  {option.revenueTimeline}
                </td>
                <td className="p-3 text-right">
                  <div className="flex flex-col items-end">
                    <span
                      className={`font-mono font-semibold ${
                        option.npv === maxNpv ? 'text-[var(--green)]' : 'text-[var(--text)]'
                      }`}
                    >
                      {formatSEK(option.npv)}
                    </span>
                    {/* NPV bar */}
                    <div className="w-full mt-1 h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${maxNpv > 0 ? Math.max(5, (option.npv / maxNpv) * 100) : 0}%`,
                          backgroundColor: option.recommended ? 'var(--green)' : 'var(--text3)',
                        }}
                      />
                    </div>
                  </div>
                </td>
                <td className="p-3 text-right font-mono text-[var(--text)]">
                  {option.irr > 0 ? `${option.irr}%` : '-'}
                </td>
                <td className="p-3 text-center">
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-mono uppercase"
                    style={{
                      background: `${RISK_COLORS[option.riskLevel]}15`,
                      color: RISK_COLORS[option.riskLevel],
                    }}
                  >
                    {t(`advisor.risk.${option.riskLevel}`)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sensitivity Analysis */}
      {Object.keys(sensitivityAnalysis.timberPriceUp10).length > 0 && (
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-[var(--text3)]" />
            <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
              {t('advisor.sensitivityAnalysis')}
            </h4>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[var(--text3)] uppercase tracking-wider">
                  <th className="text-left pb-2 font-medium">{t('advisor.scenario')}</th>
                  {options.map((o) => (
                    <th key={o.id} className="text-right pb-2 font-medium">
                      {t(o.titleKey)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-[var(--text2)]">
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2 text-[var(--text)]">{t('advisor.baseCase')}</td>
                  {options.map((o) => (
                    <td key={o.id} className="py-2 text-right font-mono">
                      {formatSEK(o.npv)}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2 text-[var(--green)]">{t('advisor.timberPriceUp10')}</td>
                  {options.map((o) => (
                    <td key={o.id} className="py-2 text-right font-mono text-[var(--green)]">
                      {sensitivityAnalysis.timberPriceUp10[o.id] !== undefined
                        ? formatSEK(sensitivityAnalysis.timberPriceUp10[o.id])
                        : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2 text-[var(--amber)]">{t('advisor.timberPriceDown10')}</td>
                  {options.map((o) => (
                    <td key={o.id} className="py-2 text-right font-mono text-[var(--amber)]">
                      {sensitivityAnalysis.timberPriceDown10[o.id] !== undefined
                        ? formatSEK(sensitivityAnalysis.timberPriceDown10[o.id])
                        : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2">{t('advisor.discountRateUp')}</td>
                  {options.map((o) => (
                    <td key={o.id} className="py-2 text-right font-mono">
                      {sensitivityAnalysis.discountRateUp1[o.id] !== undefined
                        ? formatSEK(sensitivityAnalysis.discountRateUp1[o.id])
                        : '-'}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-[var(--border)]">
                  <td className="py-2">{t('advisor.discountRateDown')}</td>
                  {options.map((o) => (
                    <td key={o.id} className="py-2 text-right font-mono">
                      {sensitivityAnalysis.discountRateDown1[o.id] !== undefined
                        ? formatSEK(sensitivityAnalysis.discountRateDown1[o.id])
                        : '-'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
