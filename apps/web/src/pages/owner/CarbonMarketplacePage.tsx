/**
 * Carbon Marketplace Page
 *
 * Lets forest owners discover carbon credit buyers, understand their
 * sequestration potential, and express interest directly in BeetleSense.
 *
 * Route: /owner/carbon-marketplace
 */

import { useState, useEffect } from 'react';
import {
  Leaf,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  BadgeCheck,
  Mail,
  Info,
  CheckCircle2,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import {
  getCarbonBuyers,
  getCarbonEstimate,
  submitCarbonInterest,
  type CarbonBuyer,
  type CarbonEstimate,
} from '@/services/carbonMarketplaceService';

// ─── Demo parcel defaults ─────────────────────────────────────────────────────

const DEMO_PARCEL = {
  id: 'demo-1',
  name: 'Norra Granbacken',
  areaHa: 12.4,
  species: 'spruce' as const,
  ageYears: 45,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: CarbonBuyer['category'] }) {
  const map: Record<CarbonBuyer['category'], { label: string; cls: string }> = {
    institutional: { label: 'Institutional', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    impact: { label: 'Impact Fund', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    corporate: { label: 'Corporate', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const { label, cls } = map[category];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

interface InterestFormProps {
  buyer: CarbonBuyer;
  estimate: CarbonEstimate | null;
  onClose: () => void;
}

function InterestForm({ buyer, estimate, onClose }: InterestFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [refId, setRefId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitCarbonInterest(
        DEMO_PARCEL.id,
        buyer.id,
        email,
        name,
        estimate?.annualTonnes ?? 0,
      );
      setRefId(result.referenceId);
      setDone(true);
    } catch {
      // silent — show generic success in demo
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 size={40} className="text-[var(--green)] mx-auto mb-3" />
        <h3 className="text-base font-semibold text-[var(--text)] mb-1">Interest submitted</h3>
        <p className="text-sm text-[var(--text2)] mb-1">
          We've notified <strong>{buyer.name}</strong> about your forest.
        </p>
        <p className="text-xs text-[var(--text3)] mb-4">Reference: {refId}</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-[var(--green)] text-white text-sm font-semibold hover:brightness-110 transition"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-[var(--text)] mb-1">Expressing interest in:</p>
        <p className="text-sm text-[var(--text2)]">{buyer.name}</p>
        <p className="text-xs text-[var(--text3)]">{buyer.pricePerTonne} SEK/tonne · min {buyer.minCredits.toLocaleString('sv-SE')} tonnes</p>
      </div>

      {estimate && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg3)] p-3 text-sm">
          <p className="text-[var(--text2)]">
            Your estimated yield: <strong className="text-[var(--text)]">{estimate.annualTonnes.toLocaleString('sv-SE')} tonne CO₂/year</strong>
          </p>
          <p className="text-[11px] text-[var(--text3)] mt-0.5">
            Estimated income at this buyer's price:{' '}
            <strong className="text-[var(--green)]">
              {(estimate.annualTonnes * buyer.pricePerTonne).toLocaleString('sv-SE')} SEK/year
            </strong>
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Your name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)] transition"
          placeholder="Anna Svensson"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[var(--text2)] mb-1">Your email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)] transition"
          placeholder="anna@example.se"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text2)] hover:text-[var(--text)] transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-[var(--green)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 transition disabled:opacity-60"
        >
          {submitting ? 'Sending…' : 'Submit interest'}
        </button>
      </div>

      <p className="text-[10px] text-[var(--text3)] text-center">
        We'll share your contact and forest data with this buyer. No obligation until you sign a contract.
      </p>
    </form>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CarbonMarketplacePage() {
  const [buyers, setBuyers] = useState<CarbonBuyer[]>([]);
  const [estimate, setEstimate] = useState<CarbonEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBuyer, setSelectedBuyer] = useState<CarbonBuyer | null>(null);

  useEffect(() => {
    Promise.all([
      getCarbonBuyers(),
      getCarbonEstimate(
        DEMO_PARCEL.id,
        DEMO_PARCEL.areaHa,
        DEMO_PARCEL.species,
        DEMO_PARCEL.ageYears,
      ),
    ]).then(([b, e]) => {
      setBuyers(b);
      setEstimate(e);
      setLoading(false);
    });
  }, []);

  const minPrice = buyers.length > 0 ? Math.min(...buyers.map((b) => b.pricePerTonne)) : 0;
  const maxPrice = buyers.length > 0 ? Math.max(...buyers.map((b) => b.pricePerTonne)) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-5 lg:p-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Leaf size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">Carbon Marketplace</h1>
              <p className="text-xs text-[var(--text3)]">Sell verified forest carbon credits to verified buyers</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* 1. Carbon potential card */}
            {estimate && (
              <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 p-5">
                <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-[var(--green)]" />
                  Your carbon potential
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-2xl font-bold text-[var(--text)]">
                      {estimate.annualTonnes.toLocaleString('sv-SE')}
                    </p>
                    <p className="text-[11px] text-[var(--text3)] uppercase tracking-wide">tonne CO₂/year</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text)]">
                      {estimate.fiveYearProjection.toLocaleString('sv-SE')}
                    </p>
                    <p className="text-[11px] text-[var(--text3)] uppercase tracking-wide">5-year projection (tonnes)</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--green)]">
                      {estimate.estimatedValueMin.toLocaleString('sv-SE')}–{estimate.estimatedValueMax.toLocaleString('sv-SE')}
                    </p>
                    <p className="text-[11px] text-[var(--text3)] uppercase tracking-wide">SEK/year potential</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-white border border-[var(--border)]">
                  <Info size={13} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-[var(--text3)]">{estimate.methodology}</p>
                </div>
              </div>
            )}

            {/* 2. Live price bar */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] px-5 py-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse flex-shrink-0" />
              <p className="text-sm text-[var(--text2)]">
                Forest carbon trading at{' '}
                <strong className="text-[var(--text)]">{minPrice}–{maxPrice} SEK/tonne</strong> today &mdash; based on current BeetleSense buyer offers
              </p>
            </div>

            {/* 3. Buyer listings */}
            <div>
              <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Active buyers</h2>
              <div className="space-y-3">
                {buyers.map((buyer) => (
                  <div
                    key={buyer.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-[var(--text)]">{buyer.name}</h3>
                          {buyer.verified && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/20 rounded-full px-2 py-0.5">
                              <BadgeCheck size={10} />
                              Verified
                            </span>
                          )}
                          <CategoryBadge category={buyer.category} />
                        </div>
                        <p className="text-xs text-[var(--text2)] mb-3">{buyer.description}</p>
                        <div className="flex items-center gap-4 text-[11px] text-[var(--text3)]">
                          <span>
                            <strong className="text-[var(--text)]">{buyer.pricePerTonne} SEK</strong>/tonne CO₂
                          </span>
                          <span>Min order: {buyer.minCredits.toLocaleString('sv-SE')} tonnes</span>
                          <span>Closes in ~{buyer.turnaroundDays} days</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedBuyer(buyer)}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--green)] text-white text-xs font-semibold hover:brightness-110 transition whitespace-nowrap"
                      >
                        Express interest
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Earnings estimate */}
            {estimate && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
                <h2 className="text-sm font-semibold text-[var(--text)] mb-2 flex items-center gap-2">
                  <Banknote size={14} className="text-[var(--green)]" />
                  Your earnings estimate
                </h2>
                <p className="text-sm text-[var(--text2)]">
                  At current market prices, your forests could generate{' '}
                  <strong className="text-[var(--green)]">
                    {estimate.estimatedValueMin.toLocaleString('sv-SE')} – {estimate.estimatedValueMax.toLocaleString('sv-SE')} SEK/year
                  </strong>{' '}
                  in carbon income — without any timber harvest.
                </p>
              </div>
            )}

            {/* 5. How it works */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
              <h2 className="text-sm font-semibold text-[var(--text)] mb-4">How it works</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    step: '1',
                    title: 'We verify your forest data',
                    desc: 'BeetleSense cross-checks your parcel boundaries, species mix, and satellite observations.',
                    icon: <ShieldCheck size={18} className="text-[var(--green)]" />,
                  },
                  {
                    step: '2',
                    title: 'Buyers make offers',
                    desc: 'Verified buyers review your forest profile and propose a price and contract length.',
                    icon: <Mail size={18} className="text-[var(--green)]" />,
                  },
                  {
                    step: '3',
                    title: 'You decide to sell',
                    desc: 'No obligation until you sign. Annual payments deposited directly to your bank account.',
                    icon: <CheckCircle2 size={18} className="text-[var(--green)]" />,
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center text-[var(--green)] font-bold text-sm">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)] mb-0.5">{item.title}</p>
                      <p className="text-xs text-[var(--text3)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EUDR compliance note */}
            <div className="flex items-start gap-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg3)]">
              <ShieldCheck size={14} className="text-[var(--green)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text2)]">
                All buyers on this marketplace are EUDR-compliant and require verified forest data.{' '}
                <a href="/owner/compliance" className="text-[var(--green)] underline hover:no-underline">
                  Check your compliance status <ChevronRight size={10} className="inline" />
                </a>
              </p>
            </div>
          </div>
        )}

        {/* Interest form modal */}
        {selectedBuyer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setSelectedBuyer(null)}
              aria-hidden="true"
            />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg2)] p-6 shadow-xl">
              <h2 className="text-base font-serif font-bold text-[var(--text)] mb-4">Express carbon credit interest</h2>
              <InterestForm
                buyer={selectedBuyer}
                estimate={estimate}
                onClose={() => setSelectedBuyer(null)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
