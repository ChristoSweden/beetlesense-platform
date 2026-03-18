import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gift,
  ShoppingCart,
  Landmark,
  Users,
  Star,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  TRANSFER_METHODS,
  type TransferMethod,
  calculateScenario,
  formatSEK,
} from '@/services/successionService';

const METHOD_ICONS: Record<TransferMethod, React.ReactNode> = {
  gava: <Gift size={18} />,
  kop: <ShoppingCart size={18} />,
  arv: <Landmark size={18} />,
  delat_agande: <Users size={18} />,
};

interface TransferComparisonProps {
  propertyValue?: number;
  taxBasis?: number;
  skogskontoBalance?: number;
}

export function TransferComparison({
  propertyValue = 8000000,
  taxBasis = 3000000,
  skogskontoBalance = 500000,
}: TransferComparisonProps) {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [expandedMethod, setExpandedMethod] = useState<TransferMethod | null>(null);
  const [bestFor, setBestFor] = useState<TransferMethod>('gava');

  const methods: TransferMethod[] = ['gava', 'kop', 'arv', 'delat_agande'];

  const scenarios = methods.map((method) =>
    calculateScenario({
      method,
      propertyValue,
      taxBasis,
      skogskontoBalance,
      skogsavdragUsed: 0,
      numberOfHeirs: 2,
    }),
  );

  // Determine best method (lowest total tax cost, with preference for gåva)
  const sorted = [...scenarios].sort((a, b) => a.totalTaxCost - b.totalTaxCost);
  const bestMethod = sorted[0].method;
  if (bestMethod !== bestFor) setBestFor(bestMethod);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Info size={14} className="text-[var(--text3)]" />
        <p className="text-xs text-[var(--text3)]">
          {t('succession.comparison.basedOn')}{' '}
          <span className="font-mono text-[var(--text2)]">{formatSEK(propertyValue)}</span>
          {' '}{t('succession.comparison.propertyValue')}
        </p>
      </div>

      {/* Desktop: table view */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left p-3 text-[var(--text3)] font-medium border-b border-[var(--border)]">
                &nbsp;
              </th>
              {methods.map((m) => {
                const info = TRANSFER_METHODS[m];
                const isBest = m === bestFor;
                return (
                  <th
                    key={m}
                    className={`text-left p-3 border-b font-medium ${
                      isBest
                        ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--green)]'
                        : 'border-[var(--border)] text-[var(--text)]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={isBest ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
                        {METHOD_ICONS[m]}
                      </span>
                      <span>{isSv ? info.nameSv : info.nameEn}</span>
                      {isBest && <Star size={12} className="text-[var(--green)]" />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {/* Tax impact */}
            <tr>
              <td className="p-3 text-[var(--text3)] font-medium border-b border-[var(--border)]">
                {t('succession.comparison.taxImpact')}
              </td>
              {scenarios.map((s) => (
                <td key={s.method} className="p-3 border-b border-[var(--border)]">
                  <div className="space-y-1">
                    <div className="text-[var(--text)]">
                      {t('succession.comparison.stampDuty')}: <span className="font-mono">{formatSEK(s.stampDuty)}</span>
                    </div>
                    <div className="text-[var(--text)]">
                      {t('succession.comparison.capitalGains')}: <span className="font-mono">{formatSEK(s.capitalGainsTax)}</span>
                    </div>
                    <div className="font-semibold text-[var(--text)]">
                      {t('succession.comparison.total')}: <span className="font-mono">{formatSEK(s.totalTaxCost)}</span>
                    </div>
                  </div>
                </td>
              ))}
            </tr>

            {/* Legal requirements */}
            <tr>
              <td className="p-3 text-[var(--text3)] font-medium border-b border-[var(--border)]">
                {t('succession.comparison.legalRequirements')}
              </td>
              {methods.map((m) => {
                const info = TRANSFER_METHODS[m];
                const reqs = isSv ? info.legalRequirementsSv : info.legalRequirementsEn;
                return (
                  <td key={m} className="p-3 border-b border-[var(--border)] align-top">
                    <ul className="space-y-1">
                      {reqs.map((r, i) => (
                        <li key={i} className="text-[var(--text2)] flex gap-1">
                          <span className="text-[var(--green)] mt-0.5">&#8226;</span> {r}
                        </li>
                      ))}
                    </ul>
                  </td>
                );
              })}
            </tr>

            {/* Skogskonto handling */}
            <tr>
              <td className="p-3 text-[var(--text3)] font-medium border-b border-[var(--border)]">
                {t('succession.comparison.skogskonto')}
              </td>
              {methods.map((m) => {
                const info = TRANSFER_METHODS[m];
                return (
                  <td key={m} className="p-3 border-b border-[var(--border)] text-[var(--text2)]">
                    {info.skogskontoTransferable
                      ? t('succession.comparison.skogskontoYes')
                      : t('succession.comparison.skogskontoNo')}
                  </td>
                );
              })}
            </tr>

            {/* Skogsavdrag */}
            <tr>
              <td className="p-3 text-[var(--text3)] font-medium border-b border-[var(--border)]">
                {t('succession.comparison.skogsavdrag')}
              </td>
              {scenarios.map((s) => (
                <td key={s.method} className="p-3 border-b border-[var(--border)] text-[var(--text2)]">
                  {s.skogsavdragNote}
                </td>
              ))}
            </tr>

            {/* Timeline */}
            <tr>
              <td className="p-3 text-[var(--text3)] font-medium border-b border-[var(--border)]">
                {t('succession.comparison.timeline')}
              </td>
              {methods.map((m) => {
                const info = TRANSFER_METHODS[m];
                return (
                  <td key={m} className="p-3 border-b border-[var(--border)]">
                    <span className="font-mono text-[var(--text)]">
                      {info.timelineMonths[0]}–{info.timelineMonths[1]}
                    </span>{' '}
                    <span className="text-[var(--text3)]">{t('succession.comparison.months')}</span>
                  </td>
                );
              })}
            </tr>

            {/* Complexity */}
            <tr>
              <td className="p-3 text-[var(--text3)] font-medium border-b border-[var(--border)]">
                {t('succession.comparison.complexity')}
              </td>
              {methods.map((m) => {
                const info = TRANSFER_METHODS[m];
                return (
                  <td key={m} className="p-3 border-b border-[var(--border)]">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i <= info.complexity ? 'bg-[var(--green)]' : 'bg-[var(--bg3)]'
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Recommended when */}
            <tr>
              <td className="p-3 text-[var(--text3)] font-medium">
                {t('succession.comparison.recommendedWhen')}
              </td>
              {methods.map((m) => {
                const info = TRANSFER_METHODS[m];
                return (
                  <td key={m} className="p-3 text-[var(--text2)]">
                    {isSv ? info.recommendedWhenSv : info.recommendedWhenEn}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Mobile: accordion cards */}
      <div className="lg:hidden space-y-3">
        {methods.map((m) => {
          const info = TRANSFER_METHODS[m];
          const scenario = scenarios.find((s) => s.method === m)!;
          const isExpanded = expandedMethod === m;
          const isBest = m === bestFor;

          return (
            <div
              key={m}
              className={`rounded-xl border p-4 ${
                isBest
                  ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                  : 'border-[var(--border)]'
              }`}
              style={{ background: isBest ? undefined : 'var(--bg2)' }}
            >
              <button
                onClick={() => setExpandedMethod(isExpanded ? null : m)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={isBest ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
                    {METHOD_ICONS[m]}
                  </span>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text)]">
                        {isSv ? info.nameSv : info.nameEn}
                      </span>
                      {isBest && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] font-medium">
                          {t('succession.comparison.bestFit')}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text3)]">
                      {t('succession.comparison.totalCost')}: {formatSEK(scenario.totalTaxCost)}
                    </span>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} className="text-[var(--text3)]" />
                ) : (
                  <ChevronDown size={16} className="text-[var(--text3)]" />
                )}
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-3 text-xs">
                  <p className="text-[var(--text2)]">
                    {isSv ? info.descriptionSv : info.descriptionEn}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[var(--text3)] mb-1">{t('succession.comparison.stampDuty')}</p>
                      <p className="font-mono text-[var(--text)]">{formatSEK(scenario.stampDuty)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text3)] mb-1">{t('succession.comparison.capitalGains')}</p>
                      <p className="font-mono text-[var(--text)]">{formatSEK(scenario.capitalGainsTax)}</p>
                    </div>
                    <div>
                      <p className="text-[var(--text3)] mb-1">{t('succession.comparison.timeline')}</p>
                      <p className="text-[var(--text)]">
                        {info.timelineMonths[0]}–{info.timelineMonths[1]} {t('succession.comparison.months')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--text3)] mb-1">{t('succession.comparison.complexity')}</p>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i <= info.complexity ? 'bg-[var(--green)]' : 'bg-[var(--bg3)]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[var(--text3)] mb-1">{t('succession.comparison.recommendedWhen')}</p>
                    <p className="text-[var(--text2)]">
                      {isSv ? info.recommendedWhenSv : info.recommendedWhenEn}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
