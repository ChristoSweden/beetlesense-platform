/**
 * TransferStrategy — Side-by-side strategy comparison for succession planning.
 *
 * Compares gava (gift), arv (inheritance), kop (below-market sale),
 * and delad overlatelse (partial transfer) with tax costs, complexity,
 * timeline, risk, flexibility, and legal references.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Gift,
  ShoppingCart,
  Landmark,
  Users,
  Star,
  ChevronDown,
  ChevronUp,
  Shield,
  Clock,
  Scale,
  Zap,
  BookOpen,
} from 'lucide-react';
import {
  TRANSFER_METHODS,
  formatSEK,
  type TransferMethod,
} from '@/services/successionService';
import type { TaxSimulation } from '@/hooks/useSuccessionPlan';

const METHOD_ICONS: Record<TransferMethod, React.ReactNode> = {
  gava: <Gift size={20} />,
  kop: <ShoppingCart size={20} />,
  arv: <Landmark size={20} />,
  delat_agande: <Users size={20} />,
};

const RISK_LABELS = {
  gava: { en: 'Low', sv: 'Lag', level: 1 },
  kop: { en: 'Medium', sv: 'Medel', level: 2 },
  arv: { en: 'High', sv: 'Hog', level: 3 },
  delat_agande: { en: 'Medium-High', sv: 'Medel-Hog', level: 3 },
};

const FLEXIBILITY_LABELS = {
  gava: { en: 'High', sv: 'Hog', level: 3 },
  kop: { en: 'Medium', sv: 'Medel', level: 2 },
  arv: { en: 'Low', sv: 'Lag', level: 1 },
  delat_agande: { en: 'Medium', sv: 'Medel', level: 2 },
};

const LEGAL_REFS: Record<TransferMethod, string[]> = {
  gava: [
    'Inkomstskattelagen (IL) 44 kap 21 ss — Kontinuitetsprincipen',
    'Jordabalken (JB) 4 kap 29 ss — Gavobrev',
    'Aktenskapsbalken 7:5 — Makas samtycke',
  ],
  kop: [
    'Stampelskattelagen (1984:404) — 1.5% stampelskatt',
    'IL 44-45 kap — Kapitalvinst pa fastighet (22/30-regeln)',
    'IL 21 kap — Skogsavdrag (50% av anskaffningsvarde)',
  ],
  arv: [
    'Arvdalagen (1958:637) — Arvsordningen',
    'IL 44 kap 21 ss — Kontinuitetsprincipen vid arv',
    'Boutredningslag (1933:29) — Bouppteckning',
  ],
  delat_agande: [
    'Samagerande (1904:48 s.1) — Samagerande',
    'Fastighetsbildningslagen — Fastighetsreglering',
    'IL 13 kap — Naringsverksamhet vid samfordelning',
  ],
};

interface TransferStrategyProps {
  taxSimulations: TaxSimulation[];
  selectedMethod: TransferMethod;
  onSelectMethod: (m: TransferMethod) => void;
  estateValue: number;
  heirCount: number;
}

export function TransferStrategy({
  taxSimulations,
  selectedMethod,
  onSelectMethod,
  estateValue,
  heirCount,
}: TransferStrategyProps) {
  const { i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [expandedCards, setExpandedCards] = useState<Set<TransferMethod>>(new Set());

  const methods: TransferMethod[] = ['gava', 'kop', 'arv', 'delat_agande'];

  // Determine best method
  const sorted = [...taxSimulations].sort((a, b) => a.result.totalTaxCost - b.result.totalTaxCost);
  const bestMethod = sorted[0]?.method ?? 'gava';

  const toggleExpand = (m: TransferMethod) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Info bar */}
      <div className="rounded-lg border border-[var(--border)] p-3 flex items-center gap-3" style={{ background: 'var(--bg2)' }}>
        <Scale size={16} className="text-[var(--text3)] flex-shrink-0" />
        <p className="text-xs text-[var(--text3)]">
          {isSv
            ? `Baserat pa ett fastvarde av ${formatSEK(estateValue)} och ${heirCount} arvingar. Klicka pa ett kort for att valja strategi.`
            : `Based on an estate value of ${formatSEK(estateValue)} and ${heirCount} heirs. Click a card to select strategy.`}
        </p>
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {methods.map((method) => {
          const info = TRANSFER_METHODS[method];
          const sim = taxSimulations.find((s) => s.method === method);
          const isBest = method === bestMethod;
          const isSelected = method === selectedMethod;
          const isExpanded = expandedCards.has(method);
          const risk = RISK_LABELS[method];
          const _flexibility = FLEXIBILITY_LABELS[method];

          return (
            <div
              key={method}
              className={`rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : isBest
                    ? 'border-[var(--green)]/30'
                    : 'border-[var(--border)]'
              }`}
              style={{ background: isSelected ? undefined : 'var(--bg2)' }}
              onClick={() => onSelectMethod(method)}
            >
              {/* Header */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? 'bg-[var(--green)]/20 text-[var(--green)]'
                          : 'bg-[var(--bg3)] text-[var(--text3)]'
                      }`}
                    >
                      {METHOD_ICONS[method]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--text)]">
                          {isSv ? info.nameSv : info.nameEn}
                        </h3>
                        {isBest && (
                          <span className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)] font-semibold">
                            <Star size={9} />
                            {isSv ? 'Bast for din situation' : 'Best for your situation'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text3)] mt-0.5">
                        {isSv ? info.descriptionSv.slice(0, 80) : info.descriptionEn.slice(0, 80)}...
                      </p>
                    </div>
                  </div>
                </div>

                {/* Key metrics grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Tax cost */}
                  <div className="rounded-lg p-2" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] mb-0.5">
                      {isSv ? 'Skattekostnad' : 'Tax cost'}
                    </p>
                    <p className={`text-sm font-mono font-bold ${
                      (sim?.result.totalTaxCost ?? 0) === 0 ? 'text-[var(--green)]' : 'text-[var(--text)]'
                    }`}>
                      {formatSEK(sim?.result.totalTaxCost ?? 0)}
                    </p>
                  </div>

                  {/* Timeline */}
                  <div className="rounded-lg p-2" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] mb-0.5 flex items-center gap-1">
                      <Clock size={8} />
                      {isSv ? 'Tidslinje' : 'Timeline'}
                    </p>
                    <p className="text-sm font-mono font-semibold text-[var(--text)]">
                      {info.timelineMonths[0]}-{info.timelineMonths[1]} {isSv ? 'man' : 'mo'}
                    </p>
                  </div>

                  {/* Risk */}
                  <div className="rounded-lg p-2" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] mb-0.5 flex items-center gap-1">
                      <Shield size={8} />
                      {isSv ? 'Risk' : 'Risk'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${
                              i <= risk.level
                                ? risk.level <= 1
                                  ? 'bg-[var(--green)]'
                                  : risk.level <= 2
                                    ? 'bg-[#f59e0b]'
                                    : 'bg-[#ef4444]'
                                : 'bg-[var(--bg3)]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-[var(--text2)]">
                        {isSv ? risk.sv : risk.en}
                      </span>
                    </div>
                  </div>

                  {/* Complexity */}
                  <div className="rounded-lg p-2" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] mb-0.5 flex items-center gap-1">
                      <Zap size={8} />
                      {isSv ? 'Komplexitet' : 'Complexity'}
                    </p>
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

                {/* Expand button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(method);
                  }}
                  className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:text-[var(--green)] mt-1"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {isSv ? 'Visa detaljer' : 'Show details'}
                </button>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] p-4 space-y-4">
                  {/* Full description */}
                  <div>
                    <p className="text-xs text-[var(--text2)]">
                      {isSv ? info.descriptionSv : info.descriptionEn}
                    </p>
                  </div>

                  {/* Tax breakdown */}
                  {sim && (
                    <div className="rounded-lg p-3" style={{ background: 'var(--bg)' }}>
                      <p className="text-[10px] font-semibold text-[var(--text)] mb-2">
                        {isSv ? 'Skattebrytning' : 'Tax breakdown'}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[var(--text3)]">
                            {isSv ? 'Stampelskatt' : 'Stamp duty'}
                          </span>
                          <span className="font-mono text-[var(--text)]">
                            {formatSEK(sim.result.stampDuty)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[var(--text3)]">
                            {isSv ? 'Kapitalvinstskatt' : 'Capital gains tax'}
                          </span>
                          <span className="font-mono text-[var(--text)]">
                            {formatSEK(sim.result.capitalGainsTax)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-[var(--border)]">
                          <span className="font-semibold text-[var(--text)]">
                            {isSv ? 'Totalt' : 'Total'}
                          </span>
                          <span className="font-mono font-bold text-[var(--text)]">
                            {formatSEK(sim.result.totalTaxCost)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Skogskonto & Skogsavdrag */}
                  {sim && (
                    <div className="space-y-2 text-xs">
                      <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                        <p className="text-[10px] font-semibold text-[var(--text)] mb-1">Skogskonto</p>
                        <p className="text-[var(--text2)]">{sim.result.skogskontoHandling}</p>
                      </div>
                      <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                        <p className="text-[10px] font-semibold text-[var(--text)] mb-1">Skogsavdrag</p>
                        <p className="text-[var(--text2)]">{sim.result.skogsavdragNote}</p>
                      </div>
                    </div>
                  )}

                  {/* Legal requirements */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text)] mb-2">
                      {isSv ? 'Krav' : 'Requirements'}
                    </p>
                    <ul className="space-y-1">
                      {(isSv ? info.legalRequirementsSv : info.legalRequirementsEn).map(
                        (req, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-[var(--text2)]">
                            <span className="text-[var(--green)] mt-0.5 flex-shrink-0">&#8226;</span>
                            {req}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>

                  {/* Legal references */}
                  <div>
                    <div className="flex items-center gap-1 mb-2">
                      <BookOpen size={10} className="text-[var(--text3)]" />
                      <p className="text-[10px] font-semibold text-[var(--text3)]">
                        {isSv ? 'Juridiska hanvisningar' : 'Legal references'}
                      </p>
                    </div>
                    <ul className="space-y-0.5">
                      {LEGAL_REFS[method].map((ref, i) => (
                        <li key={i} className="text-[10px] text-[var(--text3)] font-mono">
                          {ref}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Recommendation */}
                  <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
                    <p className="text-[10px] font-semibold text-[var(--green)] mb-1">
                      {isSv ? 'Rekommenderas nar' : 'Recommended when'}
                    </p>
                    <p className="text-xs text-[var(--text2)]">
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
