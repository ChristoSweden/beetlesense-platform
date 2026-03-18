/**
 * GreenLoanFinder — Bank comparison for green forest loans with
 * monthly payment calculator, interest savings, and pre-qualification.
 */

import { useState, useMemo } from 'react';
import {
  ArrowRight,
  Check,
  Leaf,
  BadgeCheck,
  Calculator,
  TrendingDown,
  Star,
} from 'lucide-react';
import type { GreenLoanOffer, MonthlyPayment } from '@/hooks/useForestFinance';

// ─── Helpers ───

function formatSEK(value: number): string {
  return value.toLocaleString('sv-SE');
}

// ─── Slider ───

function LoanSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-[var(--text3)]">{label}</span>
        <span className="text-sm font-mono font-semibold text-[var(--text)]">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, #4ade80 ${pct}%, var(--border) ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-[10px] text-[var(--text3)] mt-1">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ─── Bank Card ───

function BankCard({
  offer,
  isBest,
  payment,
}: {
  offer: GreenLoanOffer;
  isBest: boolean;
  payment: MonthlyPayment;
}) {
  const [expanded, setExpanded] = useState(false);
  const savingsPerYear = Math.round(
    ((offer.standardRate - offer.interestRate) / 100) * payment.loanAmountSEK,
  );

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${
        isBest
          ? 'border-[var(--green)] bg-[var(--green)]/5'
          : 'border-[var(--border)]'
      }`}
      style={{ background: isBest ? undefined : 'var(--surface)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{offer.bankLogo}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">{offer.bankName}</span>
              {isBest && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[var(--green)] text-white">
                  <Star size={10} /> Bästa ränta
                </span>
              )}
            </div>
            <p className="text-[10px] text-[var(--text3)]">{offer.specialization}</p>
          </div>
        </div>
        {offer.euTaxonomyAligned && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400">
            <Leaf size={10} /> EU Taxonomi
          </span>
        )}
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-[var(--text3)]">Grön ränta</p>
          <p className="text-lg font-bold font-mono text-[var(--green)]">{offer.interestRate}%</p>
          <p className="text-[10px] text-[var(--text3)] line-through">{offer.standardRate}%</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text3)]">Max belåning</p>
          <p className="text-lg font-bold font-mono text-[var(--text)]">{offer.maxLTV}%</p>
          <p className="text-[10px] text-[var(--text3)]">LTV</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text3)]">Max lån</p>
          <p className="text-lg font-bold font-mono text-[var(--text)]">
            {(offer.maxLoanSEK / 1_000_000).toFixed(1)}M
          </p>
          <p className="text-[10px] text-[var(--text3)]">SEK</p>
        </div>
      </div>

      {/* Monthly cost + savings */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg)] mb-3">
        <div>
          <p className="text-[10px] text-[var(--text3)]">Månadskostnad</p>
          <p className="text-sm font-mono font-semibold text-[var(--text)]">
            {formatSEK(payment.monthlyPaymentSEK)} SEK
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--text3)]">Du sparar / år</p>
          <p className="text-sm font-mono font-semibold text-[var(--green)]">
            {formatSEK(savingsPerYear)} SEK
          </p>
        </div>
      </div>

      {/* Pre-qualification badge */}
      <div className="flex items-center gap-2 mb-3">
        {offer.preQualified ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--green)]">
            <BadgeCheck size={12} /> Förkvalificerad via BeetleSense
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text3)]">
            <Calculator size={12} /> Kräver komplettering
          </span>
        )}
      </div>

      {/* Expandable details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-[10px] text-[var(--green)] hover:underline mb-2"
      >
        {expanded ? 'Dölj detaljer' : 'Visa detaljer'}
      </button>

      {expanded && (
        <div className="space-y-2 mb-3 text-[10px]">
          <div className="flex justify-between">
            <span className="text-[var(--text3)]">Uppläggningsavgift</span>
            <span className="text-[var(--text2)]">{offer.setupFee}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text3)]">Årsavgift</span>
            <span className="text-[var(--text2)]">{offer.annualFee > 0 ? `${formatSEK(offer.annualFee)} SEK` : 'Ingen'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text3)]">Löptider</span>
            <span className="text-[var(--text2)]">{offer.termYears.join(', ')} år</span>
          </div>
          <div>
            <span className="text-[var(--text3)]">Krav:</span>
            <ul className="mt-1 space-y-0.5">
              {offer.requirements.map((r, i) => (
                <li key={i} className="flex items-center gap-1 text-[var(--text2)]">
                  <Check size={10} className="text-[var(--green)]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          {offer.greenBondProgram && (
            <div className="flex items-center gap-1 text-emerald-400">
              <Leaf size={10} /> Grönt obligationsprogram
            </div>
          )}
        </div>
      )}

      {/* Apply button */}
      <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-[var(--green)] text-[var(--green)] text-xs font-medium hover:bg-[var(--green)]/10 transition">
        Ansök hos {offer.bankName}
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ─── Component ───

interface Props {
  loanOffers: GreenLoanOffer[];
  selectedLoanAmount: number;
  setSelectedLoanAmount: (v: number) => void;
  selectedTerm: number;
  setSelectedTerm: (v: number) => void;
  greenPayment: MonthlyPayment;
  standardPayment: MonthlyPayment;
  interestSavings: number;
  calculateMonthlyPayment: (amount: number, term: number, rate: number) => MonthlyPayment;
  totalValue: number;
}

export function GreenLoanFinder({
  loanOffers,
  selectedLoanAmount,
  setSelectedLoanAmount,
  selectedTerm,
  setSelectedTerm,
  greenPayment,
  standardPayment,
  interestSavings,
  calculateMonthlyPayment,
  totalValue,
}: Props) {
  const sortedOffers = useMemo(
    () => [...loanOffers].sort((a, b) => a.interestRate - b.interestRate),
    [loanOffers],
  );

  return (
    <div className="space-y-6">
      {/* Savings hero */}
      <div className="rounded-xl border border-[var(--green)]/30 p-5" style={{ background: 'var(--green)', opacity: 0.06 }}>
      </div>
      <div className="rounded-xl border border-[var(--green)]/30 p-5 bg-[var(--green)]/5">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown size={18} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Besparing med grönt skogslån
          </h3>
        </div>
        <p className="text-3xl font-bold font-mono text-[var(--green)] mb-1">
          Du sparar {formatSEK(interestSavings)} SEK
        </p>
        <p className="text-xs text-[var(--text3)]">
          över {selectedTerm} år jämfört med standardlån ({standardPayment.interestRate}% vs {greenPayment.interestRate}%)
        </p>
      </div>

      {/* Payment calculator */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <Calculator size={16} className="text-[var(--green)]" />
          Beräkna månadskostnad
        </h3>

        <div className="space-y-5">
          <LoanSlider
            label="Lånebelopp"
            value={selectedLoanAmount}
            min={1_000_000}
            max={Math.round(totalValue * 0.75)}
            step={100_000}
            format={(v) => `${formatSEK(v)} SEK`}
            onChange={setSelectedLoanAmount}
          />
          <LoanSlider
            label="Löptid"
            value={selectedTerm}
            min={5}
            max={25}
            step={5}
            format={(v) => `${v} år`}
            onChange={setSelectedTerm}
          />
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-3 mt-5">
          <div className="rounded-lg border border-[var(--green)]/30 p-3 bg-[var(--green)]/5">
            <p className="text-[10px] text-[var(--text3)] mb-1">Grönt lån ({greenPayment.interestRate}%)</p>
            <p className="text-lg font-bold font-mono text-[var(--green)]">
              {formatSEK(greenPayment.monthlyPaymentSEK)} <span className="text-xs font-normal">SEK/mån</span>
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-1">
              Total ränta: {formatSEK(greenPayment.totalInterestSEK)} SEK
            </p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--surface)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-1">Standardlån ({standardPayment.interestRate}%)</p>
            <p className="text-lg font-bold font-mono text-[var(--text2)]">
              {formatSEK(standardPayment.monthlyPaymentSEK)} <span className="text-xs font-normal">SEK/mån</span>
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-1">
              Total ränta: {formatSEK(standardPayment.totalInterestSEK)} SEK
            </p>
          </div>
        </div>
      </div>

      {/* Bank offers */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
          Gröna skogslån — 6 svenska banker
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedOffers.map((offer, i) => (
            <BankCard
              key={offer.id}
              offer={offer}
              isBest={i === 0}
              payment={calculateMonthlyPayment(
                Math.min(selectedLoanAmount, offer.maxLoanSEK),
                selectedTerm,
                offer.interestRate,
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
