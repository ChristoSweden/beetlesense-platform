/**
 * TaxSimulator — Interactive tax calculator for forest succession.
 *
 * Inputs: estate value, number of heirs, transfer method, timeline.
 * Outputs: total tax liability, per-heir share, effective tax rate,
 * comparison chart, optimization suggestions, staged transfer slider.
 *
 * Swedish forest taxation specifics:
 * - Skogsavdrag: deduct 50% of acquisition cost
 * - Skogskonto: defer income from timber sales
 * - Rantefordelning: allocate income between capital and business
 * - Kapitalvinstskatt: 22/30 * 30% on property gains
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  Users,
  Lightbulb,
  BarChart3,
  SlidersHorizontal,
  Info,
  ChevronDown,
  ChevronUp,
  Banknote,
  TreePine,
} from 'lucide-react';
import { formatSEK, type TransferMethod } from '@/services/successionService';
import type { TaxSimulation, HeirConfig } from '@/hooks/useSuccessionPlan';

interface TaxSimulatorProps {
  estateValue: number;
  taxBasis: number;
  setTaxBasis: (v: number) => void;
  skogskontoBalance: number;
  setSkogskontoBalance: (v: number) => void;
  heirs: HeirConfig[];
  addHeir: () => void;
  removeHeir: (id: string) => void;
  updateHeir: (id: string, updates: Partial<HeirConfig>) => void;
  taxSimulations: TaxSimulation[];
  currentSimulation: TaxSimulation;
  selectedMethod: TransferMethod;
  setSelectedMethod: (m: TransferMethod) => void;
  stagedTransferYears: number;
  setStagedTransferYears: (y: number) => void;
}

const METHOD_LABELS: Record<TransferMethod, { sv: string; en: string }> = {
  gava: { sv: 'Gava', en: 'Gift' },
  kop: { sv: 'Kop', en: 'Sale' },
  arv: { sv: 'Arv', en: 'Inheritance' },
  delat_agande: { sv: 'Delat', en: 'Co-own' },
};

const TAX_BAR_COLORS: Record<TransferMethod, string> = {
  gava: '#4ade80',
  kop: '#f59e0b',
  arv: '#60a5fa',
  delat_agande: '#a78bfa',
};

export function TaxSimulator({
  estateValue,
  taxBasis,
  setTaxBasis,
  skogskontoBalance,
  setSkogskontoBalance,
  heirs,
  addHeir,
  removeHeir,
  updateHeir,
  taxSimulations,
  currentSimulation,
  selectedMethod,
  setSelectedMethod,
  stagedTransferYears,
  setStagedTransferYears,
}: TaxSimulatorProps) {
  const { i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [showTaxNotes, setShowTaxNotes] = useState(false);

  const maxTax = Math.max(...taxSimulations.map((s) => s.result.totalTaxCost), 1);

  return (
    <div className="space-y-5">
      {/* Input controls */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <SlidersHorizontal size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {isSv ? 'Simuleringsparametrar' : 'Simulation parameters'}
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Estate value (read-only) */}
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">
              {isSv ? 'Fastvarde' : 'Estate value'}
            </label>
            <div className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-mono text-[var(--text)]" style={{ background: 'var(--bg)' }}>
              {formatSEK(estateValue)}
            </div>
          </div>

          {/* Tax basis */}
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">
              {isSv ? 'Anskaffningsvarde (skattemassigt)' : 'Tax basis (acquisition value)'}
            </label>
            <input
              type="range"
              min={500000}
              max={estateValue}
              step={100000}
              value={taxBasis}
              onChange={(e) => setTaxBasis(Number(e.target.value))}
              className="w-full accent-[var(--green)]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text3)]">
              <span>{formatSEK(500000)}</span>
              <span className="text-[var(--text)] font-semibold">{formatSEK(taxBasis)}</span>
              <span>{formatSEK(estateValue)}</span>
            </div>
          </div>

          {/* Skogskonto balance */}
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">
              Skogskonto
            </label>
            <input
              type="range"
              min={0}
              max={2000000}
              step={50000}
              value={skogskontoBalance}
              onChange={(e) => setSkogskontoBalance(Number(e.target.value))}
              className="w-full accent-[var(--green)]"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text3)]">
              <span>{formatSEK(0)}</span>
              <span className="text-[var(--text)] font-semibold">{formatSEK(skogskontoBalance)}</span>
              <span>{formatSEK(2000000)}</span>
            </div>
          </div>

          {/* Staged transfer */}
          <div>
            <label className="text-[10px] text-[var(--text3)] block mb-1">
              {isSv ? 'Stegvis overlatelse (ar)' : 'Staged transfer (years)'}
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5].map((y) => (
                <button
                  key={y}
                  onClick={() => setStagedTransferYears(y)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                    stagedTransferYears === y
                      ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                      : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text)]'
                  }`}
                >
                  {y === 1 ? (isSv ? 'Direkt' : 'Immediate') : `${y} ${isSv ? 'ar' : 'yr'}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Heirs */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-[var(--text3)]" />
              <span className="text-[10px] text-[var(--text3)]">
                {isSv ? 'Arvingar' : 'Heirs'} ({heirs.length})
              </span>
            </div>
            <button
              onClick={addHeir}
              className="text-[10px] text-[var(--green)] hover:underline"
            >
              + {isSv ? 'Lagg till' : 'Add heir'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {heirs.map((heir) => (
              <div
                key={heir.id}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-1.5"
                style={{ background: 'var(--bg)' }}
              >
                <input
                  value={heir.name}
                  onChange={(e) => updateHeir(heir.id, { name: e.target.value })}
                  className="text-xs bg-transparent text-[var(--text)] border-none outline-none w-20"
                />
                <span className="text-[10px] font-mono text-[var(--text3)]">
                  {(heir.share * 100).toFixed(0)}%
                </span>
                {heirs.length > 1 && (
                  <button
                    onClick={() => removeHeir(heir.id)}
                    className="text-[var(--text3)] hover:text-[#ef4444] text-xs"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison chart */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {isSv ? 'Skattejamforelse per metod' : 'Tax comparison by method'}
          </h3>
        </div>

        <div className="space-y-3">
          {taxSimulations.map((sim) => {
            const barWidth = maxTax > 0 ? (sim.result.totalTaxCost / maxTax) * 100 : 0;
            const isActive = sim.method === selectedMethod;

            return (
              <button
                key={sim.method}
                onClick={() => setSelectedMethod(sim.method)}
                className={`w-full text-left rounded-lg p-3 border transition-all ${
                  isActive
                    ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                    : 'border-[var(--border)] hover:border-[var(--border)]'
                }`}
                style={{ background: isActive ? undefined : 'var(--bg)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isActive ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                    {isSv ? METHOD_LABELS[sim.method].sv : METHOD_LABELS[sim.method].en}
                  </span>
                  <span className="text-sm font-mono font-bold text-[var(--text)]">
                    {formatSEK(sim.result.totalTaxCost)}
                  </span>
                </div>

                {/* Bar */}
                <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(barWidth, sim.result.totalTaxCost === 0 ? 2 : barWidth)}%`,
                      backgroundColor: TAX_BAR_COLORS[sim.method],
                    }}
                  />
                </div>

                {/* Breakdown row */}
                <div className="flex gap-4 mt-2 text-[10px] text-[var(--text3)]">
                  <span>
                    {isSv ? 'Stampel' : 'Stamp'}: {formatSEK(sim.result.stampDuty)}
                  </span>
                  <span>
                    {isSv ? 'Kapitalvinst' : 'Cap. gains'}: {formatSEK(sim.result.capitalGainsTax)}
                  </span>
                  {sim.stagedSavings > 0 && (
                    <span className="text-[var(--green)]">
                      {isSv ? 'Besparing' : 'Savings'}: -{formatSEK(sim.stagedSavings)}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Current simulation details */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {isSv ? 'Detaljerad berakning' : 'Detailed calculation'} —{' '}
            {isSv ? METHOD_LABELS[selectedMethod].sv : METHOD_LABELS[selectedMethod].en}
          </h3>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Total skatt' : 'Total tax'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {formatSEK(currentSimulation.result.totalTaxCost)}
            </p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Per arvinge' : 'Per heir'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {formatSEK(
                heirs.length > 0
                  ? Math.round(currentSimulation.result.totalTaxCost / heirs.length)
                  : 0,
              )}
            </p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-1">
              {isSv ? 'Effektiv skattesats' : 'Effective tax rate'}
            </p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {estateValue > 0
                ? ((currentSimulation.result.totalTaxCost / estateValue) * 100).toFixed(1)
                : '0.0'}
              %
            </p>
          </div>
        </div>

        {/* Per-heir breakdown */}
        {currentSimulation.perHeir.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold text-[var(--text)] mb-2">
              {isSv ? 'Per arvinge' : 'Per heir breakdown'}
            </p>
            <div className="space-y-2">
              {currentSimulation.perHeir.map((ph) => (
                <div
                  key={ph.heirId}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2"
                  style={{ background: 'var(--bg)' }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[var(--green)]/10 flex items-center justify-center">
                      <Users size={10} className="text-[var(--green)]" />
                    </div>
                    <span className="text-xs font-medium text-[var(--text)]">{ph.heirName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-mono text-[var(--text)]">
                      {formatSEK(ph.shareValue)}
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {isSv ? 'skatt' : 'tax'}: {formatSEK(ph.taxCost)} ({ph.effectiveRate.toFixed(1)}%)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optimization suggestion */}
        {(currentSimulation.optimizationTip || currentSimulation.optimizationTipSv) && (
          <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
            <div className="flex items-start gap-2">
              <Lightbulb size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[10px] font-semibold text-[var(--green)] mb-1">
                  {isSv ? 'Optimeringsforslag' : 'Optimization suggestion'}
                </p>
                <p className="text-xs text-[var(--text2)]">
                  {isSv ? currentSimulation.optimizationTipSv : currentSimulation.optimizationTip}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Swedish tax notes */}
      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden"
        style={{ background: 'var(--bg2)' }}
      >
        <button
          onClick={() => setShowTaxNotes(!showTaxNotes)}
          className="w-full flex items-center justify-between p-4"
        >
          <div className="flex items-center gap-2">
            <Info size={14} className="text-[var(--text3)]" />
            <span className="text-xs font-semibold text-[var(--text)]">
              {isSv ? 'Svensk skogsbeskattning — forklaringar' : 'Swedish forest taxation — explained'}
            </span>
          </div>
          {showTaxNotes ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </button>

        {showTaxNotes && (
          <div className="px-4 pb-4 space-y-3">
            {[
              {
                icon: <TreePine size={12} />,
                title: 'Skogsavdrag',
                descSv:
                  'Du far gora avdrag med 50% av anskaffningsvardets skogsandel. Avdraget sprids over tiden du ager fastigheten och minskar den skattepliktiga inkomsten fran avverkningar.',
                descEn:
                  'You can deduct 50% of the acquisition value\'s forest portion. The deduction is spread over your ownership period and reduces taxable income from harvests.',
              },
              {
                icon: <Banknote size={12} />,
                title: 'Skogskonto',
                descSv:
                  'Insattning pa skogskonto gors vid forsakringsersattning eller virkesforsaljning. Medlen beskattas forst vid uttag (inom 10 ar). Max 60% av intakten far sattas in.',
                descEn:
                  'Deposits to forest account are made from insurance payouts or timber sales. Funds are taxed only on withdrawal (within 10 years). Max 60% of income can be deposited.',
              },
              {
                icon: <BarChart3 size={12} />,
                title: isSv ? 'Rantefordelning' : 'Interest allocation',
                descSv:
                  'Positiv rantefordelning innebar att en del av naringsinkomsten omklassificeras till kapitalinkomst (20% skatt istallet for ~50% marginalskatt). Baseras pa kapitalunderlaget.',
                descEn:
                  'Positive interest allocation means part of business income is reclassified as capital income (20% tax instead of ~50% marginal tax). Based on the capital basis.',
              },
              {
                icon: <Calculator size={12} />,
                title: isSv ? 'Kapitalvinstskatt (22/30-regeln)' : 'Capital gains tax (22/30 rule)',
                descSv:
                  'Vid forsaljning av skogsfastighet beskattas 22/30 av vinsten som kapitalinkomst (30% skatt). Effektiv skattesats: 22%. Vinst = forsaljningspris minus anskaffningsvarde minus forbattringsutgifter.',
                descEn:
                  'On sale of forest property, 22/30 of the gain is taxed as capital income (30% tax). Effective rate: 22%. Gain = sale price minus acquisition value minus improvement costs.',
              },
            ].map((note) => (
              <div
                key={note.title}
                className="rounded-lg border border-[var(--border)] p-3"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[var(--green)]">{note.icon}</span>
                  <p className="text-xs font-semibold text-[var(--text)]">{note.title}</p>
                </div>
                <p className="text-[10px] text-[var(--text2)] leading-relaxed">
                  {isSv ? note.descSv : note.descEn}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
