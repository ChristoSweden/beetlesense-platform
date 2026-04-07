import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TreePine,
  ChevronRight,
  ChevronLeft,
  Check,
  Banknote,
  Truck,
  Award,
  Clock,
  Star,
  MapPin,
  Send,
  CheckCircle2,
  Copy,
} from 'lucide-react';

/* ═══ Types ═══ */

interface DemoParcel {
  id: string;
  name: string;
  species: string;
  volumeM3: number;
  areaHa: number;
}

interface Buyer {
  id: string;
  name: string;
  distance: string;
  priceRange: string;
  rating: number;
  type: string;
}

type DeliveryTerms = 'roadside' | 'at_stump' | 'delivered';
type Certification = 'fsc' | 'pefc' | 'none';
type Timeline = 'immediate' | '3_months' | '12_months';

interface SaleTerms {
  minPrice: number;
  delivery: DeliveryTerms;
  certification: Certification;
  timeline: Timeline;
}

/* ═══ Demo Data ═══ */

const DEMO_PARCELS: DemoParcel[] = [
  { id: 'p1', name: 'Norra Skogen', species: '65% Spruce, 25% Pine, 10% Birch', volumeM3: 1850, areaHa: 42.5 },
  { id: 'p2', name: 'Eklunden', species: '80% Pine, 15% Spruce, 5% Oak', volumeM3: 920, areaHa: 18.3 },
  { id: 'p3', name: 'Storbacken', species: '55% Spruce, 30% Pine, 15% Birch', volumeM3: 2340, areaHa: 67.1 },
];

const DEMO_BUYERS: Buyer[] = [
  { id: 'b1', name: 'Södra Skogsägarna', distance: '28 km', priceRange: '520–580 SEK/m\u00B3fub', rating: 4.8, type: 'Mill' },
  { id: 'b2', name: 'SCA Timber', distance: '45 km', priceRange: '510–570 SEK/m\u00B3fub', rating: 4.6, type: 'Mill' },
  { id: 'b3', name: 'Holmen Skog AB', distance: '62 km', priceRange: '530–590 SEK/m\u00B3fub', rating: 4.7, type: 'Mill' },
  { id: 'b4', name: 'Vida Timber', distance: '34 km', priceRange: '500–560 SEK/m\u00B3fub', rating: 4.4, type: 'Local buyer' },
];

const MARKET_PRICE_REF = 545; // SEK/m³fub current average

const DELIVERY_LABELS: Record<DeliveryTerms, string> = {
  roadside: 'Roadside (vid bilväg)',
  at_stump: 'At stump (vid stubbe)',
  delivered: 'Delivered to mill (levererat)',
};

const CERTIFICATION_LABELS: Record<Certification, string> = {
  fsc: 'FSC certified',
  pefc: 'PEFC certified',
  none: 'No certification',
};

const TIMELINE_LABELS: Record<Timeline, string> = {
  immediate: 'Immediate',
  '3_months': 'Within 3 months',
  '12_months': 'Within 12 months',
};

function generateRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TS-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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

export function TimberSaleFlow() {
  const [step, setStep] = useState(0);
  const [selectedParcels, setSelectedParcels] = useState<string[]>([]);
  const [terms, setTerms] = useState<SaleTerms>({
    minPrice: MARKET_PRICE_REF,
    delivery: 'roadside',
    certification: 'fsc',
    timeline: '3_months',
  });
  const [selectedBuyers, setSelectedBuyers] = useState<string[]>([]);
  const [referenceCode] = useState(generateRefCode);
  const [copied, setCopied] = useState(false);

  const totalVolume = useMemo(
    () => DEMO_PARCELS.filter((p) => selectedParcels.includes(p.id)).reduce((sum, p) => sum + p.volumeM3, 0),
    [selectedParcels],
  );

  const estimatedRevenue = useMemo(() => {
    const low = totalVolume * (terms.minPrice * 0.95);
    const high = totalVolume * (terms.minPrice * 1.1);
    return { low, high };
  }, [totalVolume, terms.minPrice]);

  const canProceed = (): boolean => {
    if (step === 0) return selectedParcels.length > 0;
    if (step === 1) return terms.minPrice > 0;
    if (step === 2) return selectedBuyers.length > 0;
    return true;
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(referenceCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleParcel = (id: string) =>
    setSelectedParcels((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const toggleBuyer = (id: string) =>
    setSelectedBuyers((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));

  const selectAllBuyers = () =>
    setSelectedBuyers((prev) => (prev.length === DEMO_BUYERS.length ? [] : DEMO_BUYERS.map((b) => b.id)));

  /* ─── Step 0: Select Parcels ─── */
  const renderSelectParcels = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Select Parcels</h2>
      <p className="text-xs text-[var(--text3)] mb-4">Choose which parcels to include in this timber sale.</p>

      <div className="space-y-2">
        {DEMO_PARCELS.map((parcel) => {
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
              <p className="text-[11px] text-[var(--text3)] ml-7">{parcel.species}</p>
              <p className="text-[11px] text-[var(--text2)] ml-7 mt-0.5 font-mono">
                {parcel.volumeM3.toLocaleString('sv-SE')} m\u00B3fub
              </p>
            </button>
          );
        })}
      </div>

      {selectedParcels.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--green)]">
            <TreePine size={16} />
            Total: {totalVolume.toLocaleString('sv-SE')} m\u00B3fub from {selectedParcels.length} parcel{selectedParcels.length > 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );

  /* ─── Step 1: Set Terms ─── */
  const renderSetTerms = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Set Sale Terms</h2>
      <p className="text-xs text-[var(--text3)] mb-4">
        Define your minimum price and delivery conditions.
      </p>

      <div className="space-y-5">
        {/* Min price */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Banknote size={14} className="inline mr-1.5 text-[var(--green)]" />
            Minimum price (SEK/m\u00B3fub)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={terms.minPrice}
              onChange={(e) => setTerms({ ...terms, minPrice: Number(e.target.value) })}
              className="w-36 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm font-mono text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
            />
            <span className="text-[10px] text-[var(--text3)]">
              Market ref: {MARKET_PRICE_REF} SEK/m\u00B3fub (Q2 2026)
            </span>
          </div>
        </div>

        {/* Delivery terms */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Truck size={14} className="inline mr-1.5 text-[var(--green)]" />
            Delivery terms
          </label>
          <div className="space-y-1.5">
            {(Object.keys(DELIVERY_LABELS) as DeliveryTerms[]).map((key) => (
              <button
                key={key}
                onClick={() => setTerms({ ...terms, delivery: key })}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                  terms.delivery === key
                    ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--text)] font-medium'
                    : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--green)]/40'
                }`}
              >
                {DELIVERY_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {/* Certification */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Award size={14} className="inline mr-1.5 text-[var(--green)]" />
            Certification
          </label>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(CERTIFICATION_LABELS) as Certification[]).map((key) => (
              <button
                key={key}
                onClick={() => setTerms({ ...terms, certification: key })}
                className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                  terms.certification === key
                    ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--text)] font-medium'
                    : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--green)]/40'
                }`}
              >
                {CERTIFICATION_LABELS[key]}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div>
          <label className="text-xs font-semibold text-[var(--text)] block mb-1.5">
            <Clock size={14} className="inline mr-1.5 text-[var(--green)]" />
            Timeline
          </label>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(TIMELINE_LABELS) as Timeline[]).map((key) => (
              <button
                key={key}
                onClick={() => setTerms({ ...terms, timeline: key })}
                className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                  terms.timeline === key
                    ? 'border-[var(--green)] bg-[var(--green)]/5 text-[var(--text)] font-medium'
                    : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--green)]/40'
                }`}
              >
                {TIMELINE_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  /* ─── Step 2: Choose Buyers ─── */
  const renderChooseBuyers = () => (
    <div>
      <h2 className="text-lg font-bold text-[var(--text)] mb-1">Choose Buyers</h2>
      <p className="text-xs text-[var(--text3)] mb-3">
        Select which mills and buyers to send your timber offer to.
      </p>

      <button
        onClick={selectAllBuyers}
        className="mb-3 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--green)] border border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors"
      >
        {selectedBuyers.length === DEMO_BUYERS.length ? 'Deselect all' : 'Send to all'}
      </button>

      <div className="space-y-2">
        {DEMO_BUYERS.map((buyer) => {
          const selected = selectedBuyers.includes(buyer.id);
          return (
            <button
              key={buyer.id}
              onClick={() => toggleBuyer(buyer.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected
                  ? 'border-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] hover:border-[var(--green)]/40'
              }`}
              style={{ background: selected ? undefined : 'var(--bg2)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selected ? 'bg-[var(--green)] border-[var(--green)]' : 'border-[var(--border2)]'
                    }`}
                  >
                    {selected && <Check size={12} className="text-white" />}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text)]">{buyer.name}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg3)] text-[var(--text3)]">
                  {buyer.type}
                </span>
              </div>
              <div className="flex items-center gap-4 ml-7 text-[11px] text-[var(--text3)]">
                <span className="flex items-center gap-1">
                  <MapPin size={10} /> {buyer.distance}
                </span>
                <span className="font-mono">{buyer.priceRange}</span>
                <span className="flex items-center gap-0.5">
                  <Star size={10} className="text-yellow-500 fill-yellow-500" /> {buyer.rating}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  /* ─── Step 3: Review ─── */
  const renderReview = () => {
    const selectedParcelNames = DEMO_PARCELS.filter((p) => selectedParcels.includes(p.id)).map((p) => p.name);
    const selectedBuyerNames = DEMO_BUYERS.filter((b) => selectedBuyers.includes(b.id)).map((b) => b.name);

    return (
      <div>
        <h2 className="text-lg font-bold text-[var(--text)] mb-1">Review & Send</h2>
        <p className="text-xs text-[var(--text3)] mb-4">Confirm the details before sending your timber sale request.</p>

        <div className="space-y-3">
          <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <h3 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">Parcels</h3>
            <p className="text-sm text-[var(--text)]">{selectedParcelNames.join(', ')}</p>
            <p className="text-xs text-[var(--text2)] mt-1 font-mono">{totalVolume.toLocaleString('sv-SE')} m&#179;fub</p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <h3 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">Terms</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[var(--text3)]">Min price:</span>
                <span className="ml-1 text-[var(--text)] font-mono">{terms.minPrice} SEK/m&#179;fub</span>
              </div>
              <div>
                <span className="text-[var(--text3)]">Delivery:</span>
                <span className="ml-1 text-[var(--text)]">{DELIVERY_LABELS[terms.delivery].split(' (')[0]}</span>
              </div>
              <div>
                <span className="text-[var(--text3)]">Certification:</span>
                <span className="ml-1 text-[var(--text)]">{CERTIFICATION_LABELS[terms.certification]}</span>
              </div>
              <div>
                <span className="text-[var(--text3)]">Timeline:</span>
                <span className="ml-1 text-[var(--text)]">{TIMELINE_LABELS[terms.timeline]}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <h3 className="text-xs font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">Buyers ({selectedBuyerNames.length})</h3>
            <p className="text-sm text-[var(--text)]">{selectedBuyerNames.join(', ')}</p>
          </div>

          <div className="p-4 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5">
            <h3 className="text-xs font-semibold text-[var(--green)] mb-1">Estimated Revenue</h3>
            <p className="text-xl font-bold font-mono text-[var(--text)]">
              {Math.round(estimatedRevenue.low).toLocaleString('sv-SE')} – {Math.round(estimatedRevenue.high).toLocaleString('sv-SE')} SEK
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">Based on volume and minimum price</p>
          </div>
        </div>
      </div>
    );
  };

  /* ─── Step 4: Confirmation ─── */
  const renderConfirmation = () => (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-[var(--green)]/15 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-[var(--green)]" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text)] mb-2">Sale Request Sent!</h2>
      <p className="text-sm text-[var(--text2)] mb-4">
        Your timber sale request has been sent to {selectedBuyers.length} buyer{selectedBuyers.length > 1 ? 's' : ''}.
      </p>

      <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--bg3)] mb-4">
        <span className="text-xs text-[var(--text3)]">Reference:</span>
        <span className="text-sm font-mono font-bold text-[var(--text)]">{referenceCode}</span>
        <button onClick={handleCopyRef} className="text-[var(--green)] hover:text-[var(--green2)] transition-colors">
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>

      <div className="p-4 rounded-xl border border-[var(--border)] text-left mb-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-[var(--text3)]" />
          <span className="text-xs font-semibold text-[var(--text)]">Status: Awaiting responses</span>
        </div>
        <p className="text-[11px] text-[var(--text3)]">
          Buyers typically respond within 2-5 business days. You will receive a notification when responses arrive.
        </p>
      </div>

      {/* Demo disclaimer */}
      <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 text-left mb-4">
        <p className="text-sm font-bold text-amber-800 mb-1">Demo Mode — No requests were sent</p>
        <p className="text-xs text-amber-700">
          This is a preview of the timber sale process. No data was sent to any mill or buyer.
          In production, your request would be delivered to the selected buyers.
        </p>
      </div>

      <Link
        to="/owner/timber-market"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
      >
        Track in My Sales
        <ChevronRight size={16} />
      </Link>

      <div className="mt-3">
        <Link
          to="/owner/documents/signing"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--green)] hover:underline transition-colors"
        >
          Create signing document for this sale
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );

  const steps = [renderSelectParcels, renderSetTerms, renderChooseBuyers, renderReview, renderConfirmation];

  return (
    <div>
      <StepIndicator current={step} total={5} />
      {steps[step]()}

      {/* Navigation */}
      {step < 4 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={14} /> Back
          </button>
          <button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
            disabled={!canProceed()}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 disabled:opacity-40 transition-all"
          >
            {step === 3 ? (
              <>
                <Send size={14} /> Send Request
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
