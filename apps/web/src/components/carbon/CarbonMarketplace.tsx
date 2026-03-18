/**
 * CarbonMarketplace — Carbon credit trading interface.
 *
 * Features:
 * - Carbon inventory summary (tonnes stored, annual sequestration)
 * - Available carbon programs (voluntary, EU ETS, klimatklivsmedel)
 * - Buyer list with current prices (500-1200 SEK/tonne)
 * - "List credits for sale" flow
 * - Transaction history
 * - Certification status (Gold Standard, Verra VCS, Plan Vivo)
 * - Revenue projection (annual income from carbon credits)
 */

import { useState } from 'react';
import {
  Leaf,
  TrendingUp,
  Building2,
  ShoppingCart,
  Clock,
  ShieldCheck,
  ArrowUpRight,
  Star,
  Tag,
  Banknote,
  CheckCircle2,
  AlertCircle,
  CircleDot,
  Package,
  ChevronRight,
  X,
} from 'lucide-react';
import { useCarbonMarket, type ListingDraft, type ProgramId } from '@/hooks/useCarbonMarket';
import { formatSEK, formatCO2 } from '@/services/carbonService';

// ─── Sub-components ───

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-[var(--green)]/30 bg-[var(--green)]/5' : 'border-[var(--border)]'}`}
      style={accent ? undefined : { background: 'var(--bg2)' }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className={accent ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>{icon}</span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">{label}</span>
      </div>
      <p className={`text-xl font-bold font-mono ${accent ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-[var(--text3)] mt-0.5">{sub}</p>}
    </div>
  );
}

function BuyerTypeIcon({ type }: { type: string }) {
  const cls = "w-3.5 h-3.5";
  switch (type) {
    case 'corporate': return <Building2 className={cls} />;
    case 'municipality': return <ShieldCheck className={cls} />;
    case 'broker': return <Tag className={cls} />;
    case 'fund': return <Banknote className={cls} />;
    default: return <CircleDot className={cls} />;
  }
}

function CertStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'certified':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
          <CheckCircle2 size={10} /> Certified
        </span>
      );
    case 'in_progress':
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock size={10} /> In Progress
        </span>
      );
    default:
      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]">
          <AlertCircle size={10} /> Not Started
        </span>
      );
  }
}

function TransactionTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    sale: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
    verification: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    listing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    retirement: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${styles[type] || ''}`}>
      {type}
    </span>
  );
}

// ─── Listing Modal ───

function ListingModal({
  maxTonnes,
  onConfirm,
  onClose,
}: {
  maxTonnes: number;
  onConfirm: (draft: ListingDraft) => void;
  onClose: () => void;
}) {
  const [tonnes, setTonnes] = useState(Math.min(50, maxTonnes));
  const [price, setPrice] = useState(850);
  const [program, setProgram] = useState<ProgramId>('voluntary');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] p-6" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <ShoppingCart size={16} className="text-[var(--green)]" />
            List Credits for Sale
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)]">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">Tonnes CO₂</label>
            <input
              type="range"
              min={1}
              max={maxTonnes}
              value={tonnes}
              onChange={e => setTonnes(Number(e.target.value))}
              className="w-full accent-[var(--green)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--text3)] mt-1">
              <span>1</span>
              <span className="font-mono font-semibold text-[var(--text)]">{tonnes} tonnes</span>
              <span>{maxTonnes}</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">Price per tonne (SEK)</label>
            <input
              type="range"
              min={500}
              max={1200}
              step={10}
              value={price}
              onChange={e => setPrice(Number(e.target.value))}
              className="w-full accent-[var(--green)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--text3)] mt-1">
              <span>500</span>
              <span className="font-mono font-semibold text-[var(--green)]">{formatSEK(price)}</span>
              <span>1 200</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">Program</label>
            <select
              value={program}
              onChange={e => setProgram(e.target.value as ProgramId)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg2)] focus:border-[var(--green)] focus:outline-none"
            >
              <option value="voluntary">Voluntary Carbon Market</option>
              <option value="klimatklivsmedel">Klimatklivsmedel</option>
            </select>
          </div>

          <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text2)]">Estimated total</span>
              <span className="text-lg font-bold font-mono text-[var(--green)]">
                {formatSEK(tonnes * price)}
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              onConfirm({ tonnes, pricePerTonne: price, program, minBuyerRating: 3 });
              onClose();
            }}
            className="w-full py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <ShoppingCart size={14} />
            List {tonnes} tonnes at {formatSEK(price)}/t
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Revenue Projection Chart ───

function RevenueProjectionChart({ data }: {
  data: { year: number; voluntaryRevenue: number; klimatklivRevenue: number; cumulativeRevenue: number }[];
}) {
  const w = 600;
  const h = 220;
  const pad = { top: 20, right: 20, bottom: 35, left: 70 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const maxCum = Math.max(...data.map(d => d.cumulativeRevenue), 1);
  const _maxAnn = Math.max(...data.map(d => d.voluntaryRevenue + d.klimatklivRevenue), 1);

  function toX(yr: number) { return pad.left + ((yr - 1) / (data.length - 1)) * plotW; }
  function toY(val: number) { return pad.top + plotH - (val / maxCum) * plotH; }

  const cumPath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'} ${toX(d.year)} ${toY(d.cumulativeRevenue)}`
  ).join(' ');

  const cumArea = cumPath + ` L ${toX(data.length)} ${pad.top + plotH} L ${toX(1)} ${pad.top + plotH} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-label="Revenue projection chart">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => (
        <g key={frac}>
          <line x1={pad.left} y1={pad.top + plotH * (1 - frac)} x2={pad.left + plotW} y2={pad.top + plotH * (1 - frac)}
            stroke="var(--border)" strokeWidth="0.5" />
          <text x={pad.left - 8} y={pad.top + plotH * (1 - frac) + 4} textAnchor="end"
            className="text-[8px] fill-[var(--text3)] font-mono">
            {formatSEK(maxCum * frac)}
          </text>
        </g>
      ))}

      {/* Year labels */}
      {data.map(d => (
        <text key={d.year} x={toX(d.year)} y={h - 8} textAnchor="middle"
          className="text-[8px] fill-[var(--text3)] font-mono">
          Y{d.year}
        </text>
      ))}

      {/* Area */}
      <path d={cumArea} fill="var(--green)" opacity="0.08" />
      <path d={cumPath} fill="none" stroke="var(--green)" strokeWidth="2" />

      {/* Stacked bars */}
      {data.map(d => {
        const barW = plotW / data.length * 0.5;
        const volH = (d.voluntaryRevenue / maxCum) * plotH;
        const klimH = (d.klimatklivRevenue / maxCum) * plotH;
        const x = toX(d.year) - barW / 2;
        return (
          <g key={d.year}>
            <rect x={x} y={pad.top + plotH - volH - klimH} width={barW} height={volH}
              fill="var(--green)" opacity="0.4" rx="1" />
            <rect x={x} y={pad.top + plotH - klimH} width={barW} height={klimH}
              fill="#60a5fa" opacity="0.4" rx="1" />
          </g>
        );
      })}

      {/* Dots */}
      {data.map(d => (
        <circle key={d.year} cx={toX(d.year)} cy={toY(d.cumulativeRevenue)} r="3" fill="var(--green)" />
      ))}

      {/* Legend */}
      <g transform={`translate(${pad.left + 10}, ${pad.top + 6})`}>
        <rect x="0" y="0" width="8" height="6" fill="var(--green)" opacity="0.5" rx="1" />
        <text x="12" y="6" className="text-[7px] fill-[var(--text2)]">Voluntary</text>
        <rect x="60" y="0" width="8" height="6" fill="#60a5fa" opacity="0.5" rx="1" />
        <text x="72" y="6" className="text-[7px] fill-[var(--text2)]">Klimatklivsmedel</text>
        <line x1="145" y1="3" x2="157" y2="3" stroke="var(--green)" strokeWidth="1.5" />
        <text x="161" y="6" className="text-[7px] fill-[var(--text2)]">Cumulative</text>
      </g>
    </svg>
  );
}

// ─── Main Component ───

type TabId = 'inventory' | 'programs' | 'buyers' | 'transactions' | 'certification' | 'projection';

export function CarbonMarketplace() {
  const {
    inventory,
    programs,
    buyers,
    transactions,
    certifications,
    revenueProjection,
    totalRevenue,
    avgSalePrice,
    listingDraft: _listingDraft,
    startListing,
    cancelListing: _cancelListing,
    sortBuyersBy,
    setSortBuyersBy,
  } = useCarbonMarket();

  const [activeTab, setActiveTab] = useState<TabId>('inventory');
  const [showListingModal, setShowListingModal] = useState(false);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'inventory', label: 'Inventory', icon: <Package size={14} /> },
    { id: 'programs', label: 'Programs', icon: <ShieldCheck size={14} /> },
    { id: 'buyers', label: 'Buyers', icon: <Building2 size={14} /> },
    { id: 'transactions', label: 'History', icon: <Clock size={14} /> },
    { id: 'certification', label: 'Certification', icon: <Star size={14} /> },
    { id: 'projection', label: 'Revenue', icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Leaf size={14} />}
          label="CO₂ Stored"
          value={`${formatCO2(inventory.totalStored)} t`}
          sub="Total across all parcels"
          accent
        />
        <StatCard
          icon={<TrendingUp size={14} />}
          label="Annual Sequestration"
          value={`+${formatCO2(inventory.annualSequestration)} t/yr`}
          sub="Current capture rate"
        />
        <StatCard
          icon={<ShoppingCart size={14} />}
          label="Verified Credits"
          value={`${formatCO2(inventory.verifiedCredits)} t`}
          sub={`${inventory.listedCredits} listed, ${inventory.soldCredits} sold`}
        />
        <StatCard
          icon={<Banknote size={14} />}
          label="Total Revenue"
          value={formatSEK(totalRevenue)}
          sub={`Avg ${formatSEK(avgSalePrice)}/tonne`}
          accent
        />
      </div>

      {/* CTA */}
      <button
        onClick={() => setShowListingModal(true)}
        className="w-full py-3 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] text-sm font-semibold hover:bg-[var(--green)]/15 transition-colors flex items-center justify-center gap-2"
      >
        <ShoppingCart size={16} />
        List Credits for Sale
        <ArrowUpRight size={14} />
      </button>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b border-[var(--border)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap -mb-px ${
              activeTab === tab.id
                ? 'border-[var(--green)] text-[var(--green)]'
                : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[40vh]">
        {/* ── Inventory ── */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Carbon Inventory by Parcel</h3>
            <div className="space-y-3">
              {inventory.parcelBreakdown.map(p => {
                const pct = inventory.totalStored > 0 ? (p.stored / inventory.totalStored) * 100 : 0;
                return (
                  <div key={p.parcelId} className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Leaf size={14} className="text-[var(--green)]" />
                        <span className="text-sm font-medium text-[var(--text)]">{p.parcelName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--text3)]">{p.areaHa} ha</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div>
                        <p className="text-lg font-bold font-mono text-[var(--text)]">{formatCO2(p.stored)}</p>
                        <p className="text-[10px] text-[var(--text3)]">t CO₂ stored</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold font-mono text-[var(--green)]">+{formatCO2(p.annualRate)}</p>
                        <p className="text-[10px] text-[var(--text3)]">t/year</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold font-mono text-blue-400">{formatCO2(p.verifiedCredits)}</p>
                        <p className="text-[10px] text-[var(--text3)]">verified</p>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                      <div className="h-full rounded-full bg-[var(--green)] transition-all duration-700"
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-[var(--text3)] mt-1">{pct.toFixed(1)}% of total</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Programs ── */}
        {activeTab === 'programs' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Available Carbon Programs</h3>
            <div className="space-y-3">
              {programs.map(prog => (
                <div key={prog.id} className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--text)]">{prog.name}</h4>
                      <p className="text-[10px] text-[var(--text3)] mt-0.5">{prog.nameSv}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
                      prog.status === 'active' ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20' :
                      prog.status === 'eligible' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {prog.status === 'coming_soon' ? 'Coming Soon' : prog.status.charAt(0).toUpperCase() + prog.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text2)] mb-3">{prog.description}</p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="rounded-lg bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text3)] mb-0.5">Price Range</p>
                      <p className="text-sm font-bold font-mono text-[var(--green)]">
                        {formatSEK(prog.priceRange.min)}-{formatSEK(prog.priceRange.max)}
                      </p>
                      <p className="text-[9px] text-[var(--text3)]">per tonne CO₂</p>
                    </div>
                    <div className="rounded-lg bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text3)] mb-0.5">Certification</p>
                      <p className="text-sm font-bold font-mono text-[var(--text)]">{formatSEK(prog.certificationCostSEK)}</p>
                      <p className="text-[9px] text-[var(--text3)]">one-time cost</p>
                    </div>
                    <div className="rounded-lg bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text3)] mb-0.5">Timeline</p>
                      <p className="text-sm font-bold font-mono text-[var(--text)]">{prog.timelineMonths} mo</p>
                      <p className="text-[9px] text-[var(--text3)]">to certify</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-[var(--text2)] mb-1.5">Requirements</p>
                    <ul className="space-y-1">
                      {prog.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[10px] text-[var(--text3)]">
                          <ChevronRight size={10} className="mt-0.5 flex-shrink-0 text-[var(--green)]" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Buyers ── */}
        {activeTab === 'buyers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text)]">Active Buyers</h3>
              <div className="flex gap-1">
                {(['price', 'volume', 'rating'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSortBuyersBy(s)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-colors capitalize ${
                      sortBuyersBy === s
                        ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {buyers.map(buyer => (
                <div key={buyer.id}
                  className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--green)]/30 transition-colors cursor-pointer"
                  style={{ background: 'var(--bg2)' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--bg3)] border border-[var(--border)]">
                        <BuyerTypeIcon type={buyer.type} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text)]">{buyer.name}</p>
                          {buyer.verified && <CheckCircle2 size={12} className="text-[var(--green)]" />}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
                          <span className="capitalize">{buyer.type}</span>
                          <span>&middot;</span>
                          <span>{buyer.contractLength}</span>
                          <span>&middot;</span>
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} size={8}
                                className={i < buyer.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--text3)]'} />
                            ))}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold font-mono text-[var(--green)]">{formatSEK(buyer.currentPrice)}</p>
                      <p className="text-[10px] text-[var(--text3)]">per tonne</p>
                      <p className="text-[10px] text-[var(--text3)]">
                        {buyer.minVolume}-{formatCO2(buyer.maxVolume)} t
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Transactions ── */}
        {activeTab === 'transactions' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Transaction History</h3>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Date</th>
                      <th className="text-left p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Type</th>
                      <th className="text-left p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Buyer</th>
                      <th className="text-right p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Tonnes</th>
                      <th className="text-right p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Price/t</th>
                      <th className="text-right p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Total</th>
                      <th className="text-center p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="p-3 font-mono text-[var(--text2)]">{tx.date}</td>
                        <td className="p-3"><TransactionTypeBadge type={tx.type} /></td>
                        <td className="p-3 text-[var(--text)]">{tx.buyer || '-'}</td>
                        <td className="p-3 text-right font-mono text-[var(--text)]">{formatCO2(tx.tonnes)}</td>
                        <td className="p-3 text-right font-mono text-[var(--text2)]">
                          {tx.priceSEK > 0 ? formatSEK(tx.priceSEK) : '-'}
                        </td>
                        <td className={`p-3 text-right font-mono font-semibold ${
                          tx.totalSEK > 0 ? 'text-[var(--green)]' : tx.totalSEK < 0 ? 'text-red-400' : 'text-[var(--text3)]'
                        }`}>
                          {tx.totalSEK !== 0 ? formatSEK(tx.totalSEK) : '-'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            tx.status === 'completed' ? 'bg-[var(--green)]/10 text-[var(--green)]' :
                            tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Certification ── */}
        {activeTab === 'certification' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Certification Status</h3>
            <div className="space-y-3">
              {certifications.map(cert => (
                <div key={cert.program} className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--green)]/10 border border-[var(--green)]/20">
                        <ShieldCheck size={18} className="text-[var(--green)]" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">{cert.name}</h4>
                        <p className="text-[10px] text-[var(--text3)]">{cert.methodology}</p>
                      </div>
                    </div>
                    <CertStatusBadge status={cert.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text3)]">Credits Issued</p>
                      <p className="text-base font-bold font-mono text-[var(--text)]">{formatCO2(cert.creditsIssued)} t</p>
                    </div>
                    {cert.validUntil && (
                      <div className="rounded-lg bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                        <p className="text-[10px] text-[var(--text3)]">Valid Until</p>
                        <p className="text-sm font-medium font-mono text-[var(--text)]">{cert.validUntil}</p>
                      </div>
                    )}
                    {cert.nextAudit && (
                      <div className="rounded-lg bg-[var(--bg)] p-2.5 border border-[var(--border)]">
                        <p className="text-[10px] text-[var(--text3)]">Next Audit</p>
                        <p className="text-sm font-medium font-mono text-[var(--text)]">{cert.nextAudit}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Revenue Projection ── */}
        {activeTab === 'projection' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">10-Year Revenue Projection</h3>
            <p className="text-xs text-[var(--text3)]">
              Based on {formatCO2(inventory.annualSequestration)} tonnes/year sequestration, 2% annual carbon price growth.
            </p>
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <RevenueProjectionChart data={revenueProjection} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--green)]/30 p-4 bg-[var(--green)]/5">
                <p className="text-[10px] text-[var(--text3)] mb-1">Year 10 Annual Revenue</p>
                <p className="text-xl font-bold font-mono text-[var(--green)]">
                  {formatSEK(revenueProjection[revenueProjection.length - 1]?.totalRevenue || 0)}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--green)]/30 p-4 bg-[var(--green)]/5">
                <p className="text-[10px] text-[var(--text3)] mb-1">10-Year Cumulative</p>
                <p className="text-xl font-bold font-mono text-[var(--green)]">
                  {formatSEK(revenueProjection[revenueProjection.length - 1]?.cumulativeRevenue || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Listing modal */}
      {showListingModal && (
        <ListingModal
          maxTonnes={inventory.verifiedCredits}
          onConfirm={startListing}
          onClose={() => setShowListingModal(false)}
        />
      )}
    </div>
  );
}
