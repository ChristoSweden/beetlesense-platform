/**
 * IndependenceCalculator — Side-by-side: "Med kontrakt" vs "Oberoende med BeetleSense".
 * Includes 5-year NPV, risk slider, and break-even analysis.
 */

import { Scale, TrendingUp, Shield, Leaf, Wrench, Clock, ArrowRight } from 'lucide-react';
import type { IndependenceComparison } from '@/hooks/useContractAnalysis';
import { formatSEK } from '@/hooks/useContractAnalysis';

interface Props {
  comparison: IndependenceComparison;
  riskTolerance: number;
  onRiskChange: (value: number) => void;
}

function ScenarioCard({
  scenario,
  variant,
}: {
  scenario: IndependenceComparison['withContract'];
  variant: 'contract' | 'independent';
}) {
  const isIndependent = variant === 'independent';
  const _borderColor = isIndependent ? 'var(--green)' : 'var(--text3)';
  const accentColor = isIndependent ? '#4ade80' : '#94a3b8';

  const rows = [
    { label: 'Virkesintäkter', value: scenario.timberRevenue5yr, icon: TrendingUp },
    { label: 'Koldioxidkrediter', value: scenario.carbonCredits5yr, icon: Leaf },
    { label: 'Entreprenörsbesparingar', value: scenario.contractorSavings5yr, icon: Wrench },
    { label: 'Försäkringsoptimering', value: scenario.insuranceOptimization5yr, icon: Shield },
  ];

  return (
    <div
      className={`rounded-xl border p-5 flex-1 ${isIndependent ? 'border-[var(--green)]/30' : 'border-[var(--border)]'}`}
      style={{ background: isIndependent ? '#4ade8008' : 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accentColor}15`, color: accentColor }}
        >
          {isIndependent ? <Scale size={16} /> : <Shield size={16} />}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-[var(--text)]">{scenario.label}</h4>
          <p className="text-[10px] text-[var(--text3)]">
            {isIndependent ? 'Marknadspriser, flera köpare, full flexibilitet' : 'Förutsägbart men lägre priser, låst köpare'}
          </p>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="space-y-2 mb-4">
        {rows.map((row) => {
          const Icon = row.icon;
          const hasValue = row.value > 0;
          return (
            <div key={row.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={12} className={hasValue ? 'text-[var(--text2)]' : 'text-[var(--text3)] opacity-30'} />
                <span className={`text-[11px] ${hasValue ? 'text-[var(--text2)]' : 'text-[var(--text3)] opacity-50 line-through'}`}>
                  {row.label}
                </span>
              </div>
              <span className={`text-[11px] font-mono ${hasValue ? 'text-[var(--text)]' : 'text-[var(--text3)] opacity-30'}`}>
                {hasValue ? formatSEK(row.value) : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Totals */}
      <div className="border-t border-[var(--border)] pt-3 space-y-2">
        <div className="flex justify-between">
          <span className="text-xs text-[var(--text3)]">Total 5 år</span>
          <span className="text-sm font-mono font-bold" style={{ color: accentColor }}>
            {formatSEK(scenario.total5yr)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[var(--text3)]">NPV (4% diskontering)</span>
          <span className="text-xs font-mono text-[var(--text2)]">
            {formatSEK(scenario.npv5yr)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[var(--text3)]">Genomsnitt/mån</span>
          <span className="text-xs font-mono text-[var(--text2)]">
            {formatSEK(scenario.monthlyAvg)}
          </span>
        </div>
      </div>

      {/* Qualitative traits */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-2">
          Egenskaper
        </p>
        {isIndependent ? (
          <ul className="space-y-1 text-[11px] text-[var(--text2)]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Marknadspriser — sälj till högstbjudande
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Flera köpare — ingen inlåsning
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Full flexibilitet — avverka när marknaden är rätt
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Koldioxidkrediter och extra intäktsströmmar
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--yellow)]" />
              Högre prisvolatilitet
            </li>
          </ul>
        ) : (
          <ul className="space-y-1 text-[11px] text-[var(--text2)]">
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Förutsägbar inkomst
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Garanterad avsättning
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
              Lägre priser — under marknad
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
              Inlåst köpare — ingen konkurrens
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
              Begränsad flexibilitet
            </li>
            <li className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
              Ingen koldioxidintäkt
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

export function IndependenceCalculator({ comparison, riskTolerance, onRiskChange }: Props) {
  const { withContract, independent, breakEvenMonths, npvDifference } = comparison;

  return (
    <div className="space-y-5">
      {/* Risk slider */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[var(--text)]">
            Din risktolerans
          </h4>
          <span className="text-[10px] font-mono text-[var(--text3)]">
            {riskTolerance < 0.33 ? 'Konservativ' : riskTolerance < 0.66 ? 'Balanserad' : 'Riskvillig'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={riskTolerance}
          onChange={(e) => onRiskChange(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #4ade80 ${riskTolerance * 100}%, var(--border) ${riskTolerance * 100}%)`,
          }}
        />
        <div className="flex justify-between mt-1 text-[9px] text-[var(--text3)] font-mono">
          <span>Låg prisvolatilitet OK</span>
          <span>Hög prisvolatilitet OK</span>
        </div>
      </div>

      {/* Side-by-side comparison */}
      <div className="flex flex-col lg:flex-row gap-4">
        <ScenarioCard scenario={withContract} variant="contract" />
        <ScenarioCard scenario={independent} variant="independent" />
      </div>

      {/* Break-even and NPV summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className="rounded-xl border border-[var(--border)] p-4 text-center"
          style={{ background: 'var(--bg2)' }}
        >
          <Clock size={18} className="text-[var(--green)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text3)] mb-1">Break-even</p>
          <p className="text-lg font-mono font-bold text-[var(--text)]">
            {breakEvenMonths < 100 ? `${breakEvenMonths} mån` : '—'}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-1">
            {breakEvenMonths < 100
              ? 'Oberoende strategi lönar sig efter denna tid'
              : 'Avtalets villkor är nära marknaden'}
          </p>
        </div>

        <div
          className="rounded-xl border border-[var(--green)]/30 p-4 text-center"
          style={{ background: '#4ade8008' }}
        >
          <TrendingUp size={18} className="text-[var(--green)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text3)] mb-1">NPV-fördel (5 år)</p>
          <p className="text-lg font-mono font-bold text-[var(--green)]">
            +{formatSEK(npvDifference)}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-1">
            Mer värde med oberoende strategi
          </p>
        </div>

        <div
          className="rounded-xl border border-[var(--border)] p-4 text-center"
          style={{ background: 'var(--bg2)' }}
        >
          <ArrowRight size={18} className="text-[var(--yellow)] mx-auto mb-2" />
          <p className="text-xs text-[var(--text3)] mb-1">Extra/mån</p>
          <p className="text-lg font-mono font-bold text-[var(--text)]">
            +{formatSEK(independent.monthlyAvg - withContract.monthlyAvg)}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-1">
            Genomsnittlig fördel per månad
          </p>
        </div>
      </div>
    </div>
  );
}
