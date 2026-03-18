import { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  Leaf,
  CheckSquare,
  Square,
} from 'lucide-react';
import type { CertificationId } from '@/hooks/useCertification';
import { useCertification } from '@/hooks/useCertification';

interface PremiumCalculatorProps {
  lang: string;
}

const CERT_OPTIONS: { id: CertificationId; name: string; color: string }[] = [
  { id: 'fsc', name: 'FSC', color: '#4ade80' },
  { id: 'pefc', name: 'PEFC', color: '#60a5fa' },
  { id: 'eu_taxonomy', name: 'EU Taxonomi', color: '#a78bfa' },
  { id: 'naturskydd', name: 'Bra Miljoval Skog', color: '#34d399' },
];

const ASSORTMENTS = [
  { id: 'sawlog_spruce', name_sv: 'Gransakgtimmer', name_en: 'Spruce Sawlog', basePriceSEK: 620 },
  { id: 'sawlog_pine', name_sv: 'Tallsagtimmer', name_en: 'Pine Sawlog', basePriceSEK: 580 },
  { id: 'pulpwood', name_sv: 'Massaved', name_en: 'Pulpwood', basePriceSEK: 320 },
  { id: 'bioenergy', name_sv: 'Energived', name_en: 'Bioenergy', basePriceSEK: 220 },
];

export function PremiumCalculator({ lang }: PremiumCalculatorProps) {
  const { certifications, calculatePremium } = useCertification();
  const [selectedCerts, setSelectedCerts] = useState<CertificationId[]>(['fsc']);
  const [harvestVolume, setHarvestVolume] = useState(500);
  const [selectedAssortment, setSelectedAssortment] = useState('sawlog_spruce');
  const [showCarbon, setShowCarbon] = useState(true);

  const assortment = ASSORTMENTS.find((a) => a.id === selectedAssortment) ?? ASSORTMENTS[0];
  const basePrice = assortment.basePriceSEK;

  const toggleCert = (id: CertificationId) => {
    setSelectedCerts((prev) =>
      prev.includes(id)
        ? prev.filter((c) => c !== id)
        : [...prev, id],
    );
  };

  const calculations = useMemo(
    () => calculatePremium(selectedCerts, harvestVolume, basePrice),
    [selectedCerts, harvestVolume, basePrice, calculatePremium],
  );

  const totalAnnualPremium = calculations.reduce((sum, c) => sum + c.annualPremiumSEK, 0);
  const totalCost = calculations.reduce((sum, c) => sum + c.totalCostSEK, 0);
  const bestRoi = calculations.length > 0 ? Math.min(...calculations.map((c) => c.roiMonths).filter(m => m > 0)) : 0;

  // Carbon credit bonus (rough estimate)
  const carbonEligibleCerts = selectedCerts.filter((id) => {
    const cert = certifications.find((c) => c.id === id);
    return cert?.carbonCreditEligible;
  });
  const carbonBonusSEK = showCarbon && carbonEligibleCerts.length > 0
    ? Math.round(harvestVolume * 0.8 * 45) // ~0.8 tCO2/m3, ~45 SEK/tCO2
    : 0;

  // Dual certification bonus
  const hasDual = selectedCerts.includes('fsc') && selectedCerts.includes('pefc');
  const dualBonusSEK = hasDual ? Math.round(harvestVolume * basePrice * 0.02) : 0;

  const grandTotalPremium = totalAnnualPremium + carbonBonusSEK + dualBonusSEK;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-5"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Calculator size={18} className="text-[var(--green)]" />
        <h3 className="text-sm font-serif font-bold text-[var(--text)]">
          {lang === 'sv' ? 'Premieberaknare — vad ar certifiering vard?' : 'Premium Calculator — what is certification worth?'}
        </h3>
      </div>

      {/* Step 1: Select certifications */}
      <div className="mb-5">
        <label className="text-[11px] font-semibold text-[var(--text2)] mb-2 block">
          1. {lang === 'sv' ? 'Valj certifiering(ar)' : 'Select certification(s)'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {CERT_OPTIONS.map((opt) => {
            const isSelected = selectedCerts.includes(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggleCert(opt.id)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--green)] bg-[var(--green)]/5'
                    : 'border-[var(--border)] hover:border-[var(--border2)]'
                }`}
              >
                {isSelected ? (
                  <CheckSquare size={14} style={{ color: opt.color }} />
                ) : (
                  <Square size={14} className="text-[var(--text3)]" />
                )}
                <span className={`text-[11px] font-medium ${isSelected ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                  {opt.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Harvest volume */}
      <div className="mb-5">
        <label className="text-[11px] font-semibold text-[var(--text2)] mb-2 block">
          2. {lang === 'sv' ? 'Arlig avverkningsvolym (m3fub)' : 'Annual harvest volume (m3fub)'}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={50}
            max={3000}
            step={50}
            value={harvestVolume}
            onChange={(e) => setHarvestVolume(Number(e.target.value))}
            className="flex-1 accent-[var(--green)]"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={harvestVolume}
              onChange={(e) => setHarvestVolume(Math.max(0, Number(e.target.value)))}
              className="w-20 text-sm font-mono bg-[var(--bg)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--text)] text-right focus:outline-none focus:border-[var(--green)]"
            />
            <span className="text-[10px] text-[var(--text3)]">m3</span>
          </div>
        </div>
      </div>

      {/* Step 3: Primary assortment */}
      <div className="mb-5">
        <label className="text-[11px] font-semibold text-[var(--text2)] mb-2 block">
          3. {lang === 'sv' ? 'Primart sortiment' : 'Primary assortment'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {ASSORTMENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAssortment(a.id)}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                selectedAssortment === a.id
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border2)]'
              }`}
            >
              <span className={`text-[11px] font-medium ${selectedAssortment === a.id ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                {lang === 'sv' ? a.name_sv : a.name_en}
              </span>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {a.basePriceSEK} SEK/m3
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Carbon credits toggle */}
      <div className="mb-5">
        <button
          onClick={() => setShowCarbon(!showCarbon)}
          className="flex items-center gap-2 text-[11px]"
        >
          {showCarbon ? (
            <CheckSquare size={14} className="text-emerald-400" />
          ) : (
            <Square size={14} className="text-[var(--text3)]" />
          )}
          <span className={showCarbon ? 'text-[var(--text)]' : 'text-[var(--text3)]'}>
            {lang === 'sv' ? 'Inkludera kolkrediter' : 'Include carbon credits'}
          </span>
        </button>
      </div>

      {/* Results */}
      {selectedCerts.length > 0 && (
        <div className="border-t border-[var(--border)] pt-5 space-y-3">
          <h4 className="text-[11px] font-semibold text-[var(--text2)] mb-3">
            {lang === 'sv' ? 'Resultat' : 'Results'}
          </h4>

          {/* Per certification */}
          {calculations.map((calc) => {
            const opt = CERT_OPTIONS.find((o) => o.id === calc.certificationId);
            return (
              <div
                key={calc.certificationId}
                className="rounded-lg border border-[var(--border)] p-3"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-[var(--text)]">
                    {calc.certificationName}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: opt?.color }}>
                    +{calc.premiumPerM3} SEK/m3
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-[9px] text-[var(--text3)]">{lang === 'sv' ? 'Arlig premie' : 'Annual premium'}</p>
                    <p className="text-xs font-mono font-semibold text-[var(--green)]">
                      +{calc.annualPremiumSEK.toLocaleString('sv-SE')} <span className="text-[9px] font-normal">SEK</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--text3)]">{lang === 'sv' ? 'Certifieringskostnad' : 'Cert. cost'}</p>
                    <p className="text-xs font-mono text-[var(--text)]">
                      {calc.totalCostSEK.toLocaleString('sv-SE')} <span className="text-[9px]">SEK</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[var(--text3)]">ROI</p>
                    <p className="text-xs font-mono text-amber-400">
                      {calc.roiMonths} {lang === 'sv' ? 'manader' : 'months'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dual certification bonus */}
          {hasDual && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <TrendingUp size={14} className="text-blue-400" />
              <div className="flex-1">
                <p className="text-[10px] font-medium text-blue-400">
                  {lang === 'sv' ? 'Dubbelcertifieringsbonus (FSC + PEFC)' : 'Dual certification bonus (FSC + PEFC)'}
                </p>
                <p className="text-[10px] text-blue-400/70">
                  +{dualBonusSEK.toLocaleString('sv-SE')} SEK/ar
                </p>
              </div>
            </div>
          )}

          {/* Carbon credit bonus */}
          {carbonBonusSEK > 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <Leaf size={14} className="text-emerald-400" />
              <div className="flex-1">
                <p className="text-[10px] font-medium text-emerald-400">
                  {lang === 'sv' ? 'Kolkrediter (uppskattat)' : 'Carbon credits (estimated)'}
                </p>
                <p className="text-[10px] text-emerald-400/70">
                  +{carbonBonusSEK.toLocaleString('sv-SE')} SEK/ar
                </p>
              </div>
            </div>
          )}

          {/* Grand total */}
          <div className="rounded-lg border-2 border-[var(--green)]/30 p-4" style={{ background: 'rgba(74, 222, 128, 0.05)' }}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-[var(--text3)] mb-1">
                  {lang === 'sv' ? 'Total arlig premie' : 'Total annual premium'}
                </p>
                <p className="text-lg font-mono font-bold text-[var(--green)]">
                  +{grandTotalPremium.toLocaleString('sv-SE')}
                </p>
                <p className="text-[9px] text-[var(--text3)]">SEK/{lang === 'sv' ? 'ar' : 'year'}</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text3)] mb-1">
                  {lang === 'sv' ? 'Total kostnad' : 'Total cost'}
                </p>
                <p className="text-lg font-mono font-bold text-[var(--text)]">
                  {totalCost.toLocaleString('sv-SE')}
                </p>
                <p className="text-[9px] text-[var(--text3)]">SEK</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text3)] mb-1">
                  {lang === 'sv' ? 'Snabbaste ROI' : 'Fastest ROI'}
                </p>
                <p className="text-lg font-mono font-bold text-amber-400">
                  {bestRoi > 0 ? bestRoi : '—'}
                </p>
                <p className="text-[9px] text-[var(--text3)]">{lang === 'sv' ? 'manader' : 'months'}</p>
              </div>
            </div>

            {bestRoi > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--green)]/20">
                <p className="text-[11px] text-[var(--green)]">
                  {lang === 'sv'
                    ? `${calculations.find(c => c.roiMonths === bestRoi)?.certificationName ?? ''}-certifiering betalar sig efter ${bestRoi} manader`
                    : `${calculations.find(c => c.roiMonths === bestRoi)?.certificationName ?? ''} certification pays for itself after ${bestRoi} months`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCerts.length === 0 && (
        <div className="border-t border-[var(--border)] pt-5 text-center">
          <p className="text-xs text-[var(--text3)]">
            {lang === 'sv' ? 'Valj minst en certifiering for att berakna premie' : 'Select at least one certification to calculate premium'}
          </p>
        </div>
      )}
    </div>
  );
}
