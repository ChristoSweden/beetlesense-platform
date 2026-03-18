import { useState } from 'react';
import {
  TrendingUp,
  Send,
  X,
  Plus,
  ChevronDown,
  BarChart3,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  type PriceReport,
  type AggregatedPrice,
  type NewPricePayload,
} from '@/hooks/useCommunity';

// ─── Helpers ───

function confidenceLabel(count: number): { text: string; color: string } {
  if (count >= 10) return { text: 'Hög', color: '#4ade80' };
  if (count >= 5) return { text: 'Medium', color: '#fbbf24' };
  return { text: 'Låg', color: '#f87171' };
}

const TIMBER_TYPES = ['Grantimmer', 'Talltimmer', 'Granmassa', 'Tallmassa', 'Björktimmer', 'Björkmassa'];
const BUYERS = ['Södra', 'Vida', 'Stora Enso', 'Holmen', 'SCA', 'Sveaskog'];

// ─── Props ───

interface PriceSharingProps {
  priceReports: PriceReport[];
  aggregatedPrices: AggregatedPrice[];
  isLoading: boolean;
  onAddPrice: (payload: NewPricePayload) => void;
}

export function PriceSharing({ priceReports, aggregatedPrices, isLoading, onAddPrice }: PriceSharingProps) {
  const [timberFilter, setTimberFilter] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showReports, setShowReports] = useState(false);

  // Form state
  const [formTimber, setFormTimber] = useState('Grantimmer');
  const [formPrice, setFormPrice] = useState('');
  const [formBuyer, setFormBuyer] = useState('Södra');
  const [formRegion, setFormRegion] = useState('Småland');

  const filteredAgg = timberFilter
    ? aggregatedPrices.filter((a) => a.timber_type === timberFilter)
    : aggregatedPrices;

  const filteredReports = timberFilter
    ? priceReports.filter((r) => r.timber_type === timberFilter)
    : priceReports;

  const handleSubmit = () => {
    const price = parseFloat(formPrice);
    if (!price || price <= 0) return;
    onAddPrice({
      timber_type: formTimber,
      price_sek: price,
      buyer: formBuyer,
      region: formRegion,
    });
    setFormPrice('');
    setShowForm(false);
  };

  // Group aggregated by timber type for the chart
  const timberGroups = filteredAgg.reduce<Record<string, AggregatedPrice[]>>((acc, a) => {
    if (!acc[a.timber_type]) acc[a.timber_type] = [];
    acc[a.timber_type].push(a);
    return acc;
  }, {});

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Timber type filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setTimberFilter(null)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
              timberFilter === null
                ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
            }`}
          >
            Alla sortiment
          </button>
          {TIMBER_TYPES.map((tt) => (
            <button
              key={tt}
              onClick={() => setTimberFilter(timberFilter === tt ? null : tt)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                timberFilter === tt
                  ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                  : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
              }`}
            >
              {tt}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-all ml-auto"
        >
          <Plus size={14} />
          Dela ditt pris
        </button>
      </div>

      {/* Share price form */}
      {showForm && (
        <div
          className="rounded-xl border border-[var(--green)]/20 p-4 mb-4"
          style={{ background: 'var(--bg2)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-[var(--text)]">Dela ditt pris (anonymt)</h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Timber type */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text3)] mb-1 block">Sortiment</label>
              <select
                value={formTimber}
                onChange={(e) => setFormTimber(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/40"
              >
                {TIMBER_TYPES.map((tt) => (
                  <option key={tt} value={tt}>{tt}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text3)] mb-1 block">Pris (SEK/m3fub)</label>
              <input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="t.ex. 620"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40"
              />
            </div>

            {/* Buyer */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text3)] mb-1 block">Köpare</label>
              <select
                value={formBuyer}
                onChange={(e) => setFormBuyer(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/40"
              >
                {BUYERS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Region */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text3)] mb-1 block">Region</label>
              <input
                type="text"
                value={formRegion}
                onChange={(e) => setFormRegion(e.target.value)}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/40"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={!formPrice || parseFloat(formPrice) <= 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[#030d05] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send size={13} />
              Dela anonymt
            </button>
            <p className="text-[10px] text-[var(--text3)]">
              Ditt pris delas anonymt och aggregeras med andra rapporter.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4 animate-pulse"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="h-4 w-32 bg-[var(--bg3)] rounded mb-3" />
              <div className="h-20 w-full bg-[var(--bg3)] rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Aggregated Price Cards (by timber type) */}
      {!isLoading && Object.entries(timberGroups).length > 0 && (
        <div className="space-y-4">
          {Object.entries(timberGroups).map(([timberType, entries]) => (
            <div
              key={timberType}
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={14} className="text-[var(--green)]" />
                <h3 className="text-xs font-semibold text-[var(--text)]">{timberType}</h3>
                <span className="text-[10px] text-[var(--text3)]">Småland</span>
              </div>

              {/* Bar chart visualization */}
              <div className="space-y-2.5">
                {entries.map((entry) => {
                  const conf = confidenceLabel(entry.report_count);
                  // Compute bar width relative to max price in this group
                  const maxPrice = Math.max(...entries.map((e) => e.max_price));
                  const barWidth = maxPrice > 0 ? (entry.avg_price / maxPrice) * 100 : 0;
                  const officialBarWidth = maxPrice > 0 ? (entry.official_price / maxPrice) * 100 : 0;

                  return (
                    <div key={`${entry.buyer}-${entry.timber_type}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-[var(--text2)]">{entry.buyer}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-[var(--text)]">
                            {entry.min_price}-{entry.max_price} SEK/m3fub
                          </span>
                          <span className="text-[9px] font-mono" style={{ color: conf.color }}>
                            snitt {entry.avg_price}
                          </span>
                        </div>
                      </div>

                      {/* Community bar */}
                      <div className="relative h-4 rounded-full overflow-hidden mb-0.5" style={{ background: 'var(--bg3)' }}>
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-[var(--green)]/60"
                          style={{ width: `${barWidth}%` }}
                        />
                        {/* Official price marker */}
                        <div
                          className="absolute inset-y-0 w-0.5 bg-[var(--yellow)]"
                          style={{ left: `${officialBarWidth}%` }}
                          title={`Officiellt pris: ${entry.official_price} SEK`}
                        />
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-[9px] text-[var(--text3)]">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck size={9} style={{ color: conf.color }} />
                          <span>Konfidens: {conf.text} ({entry.report_count} rapporter)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-0.5 bg-[var(--yellow)] rounded" />
                          <span>Officiellt: {entry.official_price}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toggle individual reports */}
      {!isLoading && filteredReports.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowReports(!showReports)}
            className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--green)] hover:text-[var(--green)]/80 transition-colors mb-3"
          >
            {showReports ? 'Dölj individuella rapporter' : `Visa ${filteredReports.length} individuella rapporter`}
            {showReports ? <ChevronDown size={12} /> : <ChevronDown size={12} />}
          </button>

          {showReports && (
            <div
              className="rounded-xl border border-[var(--border)] overflow-hidden"
              style={{ background: 'var(--bg2)' }}
            >
              {/* Table header */}
              <div className="grid grid-cols-5 gap-2 px-4 py-2 text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider border-b border-[var(--border)]">
                <span>Sortiment</span>
                <span>Pris</span>
                <span>Köpare</span>
                <span>Region</span>
                <span>Datum</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[var(--border)]">
                {filteredReports.slice(0, 20).map((report) => (
                  <div key={report.id} className="grid grid-cols-5 gap-2 px-4 py-2.5 text-xs">
                    <span className="text-[var(--text2)]">{report.timber_type}</span>
                    <span className="font-mono text-[var(--text)]">{report.price_sek} {report.unit}</span>
                    <span className="text-[var(--text2)]">{report.buyer}</span>
                    <span className="text-[var(--text3)]">{report.region}</span>
                    <div className="flex items-center gap-1 text-[var(--text3)]">
                      <Clock size={9} />
                      <span>{new Date(report.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredAgg.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp size={32} className="mx-auto text-[var(--text3)] mb-3 opacity-30" />
          <p className="text-sm text-[var(--text3)]">Inga prisrapporter tillgängliga</p>
          <p className="text-xs text-[var(--text3)] mt-1">Bli den första att dela ett pris!</p>
        </div>
      )}

      {!isLoading && filteredAgg.length > 0 && (
        <p className="mt-4 text-center text-[10px] text-[var(--text3)]">
          Baserat på {priceReports.length} anonyma prisrapporter i Smålandsregionen
        </p>
      )}
    </div>
  );
}
