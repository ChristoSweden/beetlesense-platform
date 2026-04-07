import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Leaf,
  Shield,
  ShoppingCart,
  Clock,
  TrendingUp,
  Send,
  CheckCircle2,
  Copy,
  Info,
} from 'lucide-react';

/* ═══ Types ═══ */

type Methodology = 'verra_vcs' | 'gold_standard' | 'eu_ets';
type Marketplace = 'voluntary' | 'compliance';

interface CarbonParcel {
  id: string;
  name: string;
  areaHa: number;
  carbonStockTonnes: number;
  annualSequestration: number;
}

/* ═══ Demo Data ═══ */

const DEMO_CARBON_PARCELS: CarbonParcel[] = [
  { id: 'p1', name: 'Norra Skogen', areaHa: 42.5, carbonStockTonnes: 4250, annualSequestration: 127.5 },
  { id: 'p2', name: 'Eklunden', areaHa: 18.3, carbonStockTonnes: 1647, annualSequestration: 54.9 },
  { id: 'p3', name: 'Storbacken', areaHa: 67.1, carbonStockTonnes: 6710, annualSequestration: 201.3 },
];

const MARKET_PRICE_EUR = 32; // EUR per tonne CO2e
const SEK_PER_EUR = 11.5;
const MARKET_PRICE_SEK = MARKET_PRICE_EUR * SEK_PER_EUR;

const METHODOLOGY_OPTIONS: { key: Methodology; label: string; description: string; verificationCostEur: number }[] = [
  { key: 'verra_vcs', label: 'Verra VCS', description: 'Verified Carbon Standard - most widely used voluntary standard', verificationCostEur: 15000 },
  { key: 'gold_standard', label: 'Gold Standard', description: 'Higher social/environmental co-benefit requirements', verificationCostEur: 18000 },
  { key: 'eu_ets', label: 'EU ETS', description: 'EU Emissions Trading System - compliance market', verificationCostEur: 25000 },
];

const VERIFICATION_PERIODS = [
  { value: 5, label: '5 years' },
  { value: 10, label: '10 years' },
  { value: 20, label: '20 years' },
  { value: 30, label: '30 years' },
];

function generateRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'CC-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(value);
}

/* ═══ Step Indicator ═══ */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
              i < current
                ? 'bg-[var(--green)] text-white'
                : i === current
                  ? 'bg-[var(--green)]/15 text-[var(--green)] border-2 border-[var(--green)]'
                  : 'bg-[var(--bg3)] text-[var(--text3)]'
            }`}
          >
            {i < current ? <Check size={14} /> : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`w-6 h-0.5 ${i < current ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══ Main Component ═══ */

export function CarbonCreditFlow() {
  const [step, setStep] = useState(0);
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [methodology, setMethodology] = useState<Methodology>('verra_vcs');
  const [verificationPeriod, setVerificationPeriod] = useState(10);
  const [priceOverride, setPriceOverride] = useState<number | null>(null);
  const [marketplace, setMarketplace] = useState<Marketplace>('voluntary');
  const [duration, setDuration] = useState(5);
  const [referenceCode] = useState(generateRefCode);
  const [copied, setCopied] = useState(false);

  const selectedParcelData = useMemo(
    () => DEMO_CARBON_PARCELS.filter((p) => selectedParcels.includes(p.id)),
    [selectedParcels],
  );

  const totalCredits = useMemo(
    () => selectedParcelData.reduce((sum, p) => sum + p.annualSequestration * verificationPeriod, 0),
    [selectedParcelData, verificationPeriod],
  );

  const totalAnnualSeq = useMemo(
    () => selectedParcelData.reduce((sum, p) => sum + p.annualSequestration, 0),
    [selectedParcelData],
  );

  const totalStock = useMemo(
    () => selectedParcelData.reduce((sum, p) => sum + p.carbonStockTonnes, 0),
    [selectedParcelData],
  );

  const effectivePrice = priceOverride ?? MARKET_PRICE_SEK;
  const estimatedRevenue = totalCredits * effectivePrice;
  const verificationCost = METHODOLOGY_OPTIONS.find((m) => m.key === methodology)?.verificationCostEur ?? 15000;
  const verificationCostSEK = verificationCost * SEK_PER_EUR;

  const canProceed = (): boolean => {
    if (step === 0) return selectedParcels.length > 0;
    return true;
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleParcel = (id: string) =>
    setSelectedParcels((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  /* ─── Step 0: Estimate ─── */
  const renderEstimate = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Carbon Credit Estimate</h2>
      <p className="text-xs text-[var(--text3)] mb-4">
        See how much carbon your forest stores and what credits you could sell.
      </p>

      <div className="space-y-2 mb-4">
        {DEMO_CARBON_PARCELS.map((parcel) => {
          const selected = selectedParcels.includes(parcel.id);
          return (
            <button
              key={parcel.id}
              onClick={() => toggleParcel(parcel.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--green)]/40'
              }`}
              style={{ background: selected ? undefined : 'var(--bg2)' }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selected ? 'bg-[var(--green)] border-[var(--green)]' : 'border-[var(--border2)]'
                    }`}
                  >
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text)]">{parcel.name}</span>
                </div>
                <span className="text-xs font-mono text-[var(--text2)]">{parcel.areaHa} ha</span>
              </div>
              <div className="ml-7 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-[var(--text3)]">Carbon stock:</span>
                  <span className="ml-1 text-[var(--text)] font-mono">{parcel.carbonStockTonnes.toLocaleString('sv-SE')} t CO\u2082e</span>
                </div>
                <div>
                  <span className="text-[var(--text3)]">Annual sequestration:</span>
                  <span className="ml-1 text-[var(--green)] font-mono">+{parcel.annualSequestration} t/yr</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedParcels.length > 0 && (
        <div className="p-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold font-mono text-[var(--text)]">{totalStock.toLocaleString('sv-SE')}</p>
              <p className="text-[10px] text-[var(--text3)]">t CO\u2082e stored</p>
            </div>
            <div>
              <p className="text-lg font-bold font-mono text-[var(--green)]">+{totalAnnualSeq.toFixed(1)}</p>
              <p className="text-[10px] text-[var(--text3)]">t CO\u2082e/year</p>
            </div>
            <div>
              <p className="text-lg font-bold font-mono text-[var(--text)]">{formatSEK(MARKET_PRICE_SEK)}</p>
              <p className="text-[10px] text-[var(--text3)]">per credit (market)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  /* ─── Step 1: Verification ─── */
  const renderVerification = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Verification</h2>
      <p className="text-xs text-[var(--text3)] mb-4">
        Choose a certification methodology and verification period.
      </p>

      <div className="space-y-5">
        {/* Methodology */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Shield size={14} className="inline mr-1.5 text-[var(--green)]" />
            Methodology
          </label>
          <div className="space-y-2">
            {METHODOLOGY_OPTIONS.map((opt) => {
              const active = methodology === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setMethodology(opt.key)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    active
                      ? 'border-[var(--green)] bg-[var(--green)]/5'
                      : 'border-[var(--border)] hover:border-[var(--green)]/40'
                  }`}
                  style={{ background: active ? undefined : 'var(--bg2)' }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-[var(--text)]">{opt.label}</span>
                    <span className="text-[10px] font-mono text-[var(--text3)]">
                      ~{formatSEK(opt.verificationCostEur * SEK_PER_EUR)} verification
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text3)]">{opt.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Verification period */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Clock size={14} className="inline mr-1.5 text-[var(--green)]" />
            Verification period
          </label>
          <div className="flex gap-2 flex-wrap">
            {VERIFICATION_PERIODS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setVerificationPeriod(opt.value)}
                className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${
                  verificationPeriod === opt.value
                    ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--text)]'
                    : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--green)]/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cost summary */}
        <div className="p-3 rounded-lg bg-[var(--bg3)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text2)]">
            <Info size={12} className="text-[var(--text3)]" />
            Estimated verification cost: <strong className="font-mono">{formatSEK(verificationCostSEK)}</strong>
          </div>
          <p className="text-[10px] text-[var(--text3)] mt-1">
            Total credits over {verificationPeriod} years: <strong className="font-mono">{totalCredits.toLocaleString('sv-SE')}</strong> t CO\u2082e
          </p>
        </div>
      </div>
    </div>
  );

  /* ─── Step 2: Listing ─── */
  const renderListing = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Create Listing</h2>
      <p className="text-xs text-[var(--text3)] mb-4">Set your price and choose a marketplace.</p>

      <div className="space-y-5">
        {/* Price */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <TrendingUp size={14} className="inline mr-1.5 text-[var(--green)]" />
            Price per credit (SEK/t CO\u2082e)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={priceOverride ?? ''}
              onChange={(e) => setPriceOverride(e.target.value ? Number(e.target.value) : null)}
              placeholder={String(Math.round(MARKET_PRICE_SEK))}
              className="w-36 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-mono text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
            />
            <button
              onClick={() => setPriceOverride(null)}
              className="text-[10px] text-[var(--green)] hover:underline"
            >
              Use market price ({formatSEK(MARKET_PRICE_SEK)})
            </button>
          </div>
        </div>

        {/* Marketplace */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <ShoppingCart size={14} className="inline mr-1.5 text-[var(--green)]" />
            Marketplace
          </label>
          <div className="space-y-2">
            <button
              onClick={() => setMarketplace('voluntary')}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                marketplace === 'voluntary'
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--green)]/40'
              }`}
              style={{ background: marketplace === 'voluntary' ? undefined : 'var(--bg2)' }}
            >
              <span className="text-sm font-semibold text-[var(--text)]">Voluntary Market</span>
              <p className="text-[11px] text-[var(--text3)] mt-0.5">Companies buying offsets for CSR/sustainability goals</p>
            </button>
            <button
              onClick={() => setMarketplace('compliance')}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                marketplace === 'compliance'
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--green)]/40'
              }`}
              style={{ background: marketplace === 'compliance' ? undefined : 'var(--bg2)' }}
            >
              <span className="text-sm font-semibold text-[var(--text)]">Compliance Market</span>
              <p className="text-[11px] text-[var(--text3)] mt-0.5">Regulated entities with mandatory emission reduction targets</p>
            </button>
          </div>
        </div>

        {/* Duration */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Clock size={14} className="inline mr-1.5 text-[var(--green)]" />
            Listing duration
          </label>
          <div className="flex gap-2">
            {[1, 3, 5, 10].map((y) => (
              <button
                key={y}
                onClick={() => setDuration(y)}
                className={`px-4 py-2 rounded-lg border text-xs font-medium transition-all ${
                  duration === y
                    ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--text)]'
                    : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--green)]/40'
                }`}
              >
                {y} year{y > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Revenue estimate */}
        <div className="p-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5">
          <h3 className="text-xs font-semibold text-[var(--green)] mb-2">Estimated Revenue</h3>
          <p className="text-xl font-bold font-mono text-[var(--text)]">
            {formatSEK(estimatedRevenue)}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            {totalCredits.toLocaleString('sv-SE')} credits x {formatSEK(effectivePrice)}/credit (minus verification: {formatSEK(verificationCostSEK)})
          </p>
          <p className="text-xs font-mono text-[var(--text2)] mt-1">
            Net: {formatSEK(estimatedRevenue - verificationCostSEK)}
          </p>
        </div>
      </div>
    </div>
  );

  /* ─── Step 3: Submit ─── */
  const renderSubmit = () => {
    const methodologyLabel = METHODOLOGY_OPTIONS.find((m) => m.key === methodology)?.label ?? '';

    return (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-[var(--green)]/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-[var(--green)]" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">Submitted for Verification!</h2>

        <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 text-left mb-4">
          <p className="text-sm font-bold text-amber-800 mb-1">Demo Mode — No listing was submitted</p>
          <p className="text-xs text-amber-700">
            This is a preview of the carbon credit process. No submission was made to any verification body or marketplace.
          </p>
        </div>

        <p className="text-sm text-[var(--text2)] mb-4">
          Your carbon credits have been submitted under <strong>{methodologyLabel}</strong>.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg3)] mb-4">
          <span className="text-xs text-[var(--text3)]">Reference:</span>
          <span className="text-sm font-mono font-bold text-[var(--text)]">{referenceCode}</span>
          <button onClick={handleCopyRef} className="text-[var(--green)] hover:text-[var(--green2)] transition-colors">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <div className="p-4 rounded-xl border border-[var(--border)] text-left mb-4" style={{ background: 'var(--bg2)' }}>
          <h3 className="text-xs font-semibold text-[var(--text)] mb-3">Timeline</h3>
          <div className="space-y-3">
            {[
              { label: 'Verification submitted', status: 'done', time: 'Today' },
              { label: 'Verification review', status: 'active', time: '4-8 weeks' },
              { label: 'Credits issued', status: 'pending', time: 'After review' },
              { label: 'Listed on marketplace', status: 'pending', time: 'After issuance' },
              { label: 'First sale', status: 'pending', time: 'When matched' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
                    item.status === 'done'
                      ? 'bg-[var(--green)] text-white'
                      : item.status === 'active'
                        ? 'bg-[var(--green)]/15 text-[var(--green)] border-2 border-[var(--green)]'
                        : 'bg-[var(--bg3)] text-[var(--text3)]'
                  }`}
                >
                  {item.status === 'done' ? <Check size={10} /> : i + 1}
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className={`text-xs ${item.status === 'pending' ? 'text-[var(--text3)]' : 'text-[var(--text)]'}`}>
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text3)]">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/owner/carbon"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
        >
          Track Carbon Credits
          <ChevronRight size={16} />
        </Link>
      </div>
    );
  };

  const steps = [renderEstimate, renderVerification, renderListing, renderSubmit];

  return (
    <div>
      <StepIndicator current={step} total={4} />
      {steps[step]()}

      {/* Navigation */}
      {step < 3 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <button
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {step === 2 ? (
              <>
                <Send size={14} /> Submit for Verification
              </>
            ) : (
              <>
                Next <ChevronRight size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
