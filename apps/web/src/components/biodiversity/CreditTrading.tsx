/**
 * CreditTrading — Biodiversity credits marketplace.
 *
 * Credit inventory, listing flow, buyer board, active listings,
 * transaction history, and revenue projection.
 */

import { useState } from 'react';
import {
  Package,
  ShoppingCart,
  Building2,
  Clock,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Banknote,
  ChevronRight,
} from 'lucide-react';
import type {
  BiodiversityBuyer,
  BiodiversityProgram,
  CreditListing,
  CreditTransaction,
} from '@/hooks/useBiodiversity';

// ─── Helpers ───

function formatSEK(n: number): string {
  return n.toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
}

function UrgencyBadge({ urgency }: { urgency: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-500/10 text-red-400 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    low: 'bg-[var(--bg3)] text-[var(--text3)] border-[var(--border)]',
  };
  const labels = { high: 'Brådskande', medium: 'Medel', low: 'Låg' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[urgency]}`}>
      {labels[urgency]}
    </span>
  );
}

function ListingStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
    sold: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${styles[status] || ''}`}>
      {status === 'active' ? 'Aktiv' : status === 'sold' ? 'Såld' : 'Väntande'}
    </span>
  );
}

function TxTypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    sale: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
    generation: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    verification: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    listing: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  const labels: Record<string, string> = {
    sale: 'Försäljning', generation: 'Generering', verification: 'Verifiering', listing: 'Listning',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${styles[type] || ''}`}>
      {labels[type] || type}
    </span>
  );
}

// ─── Listing Modal ───

function ListCreditModal({ onClose }: { onClose: () => void }) {
  const [units, setUnits] = useState(10);
  const [price, setPrice] = useState(600);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] p-6" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <ShoppingCart size={16} className="text-[var(--green)]" />
            Lista biodiversitetskrediter
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)]">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">Antal enheter</label>
            <input type="range" min={1} max={30} value={units} onChange={e => setUnits(Number(e.target.value))}
              className="w-full accent-[var(--green)]" />
            <div className="flex justify-between text-[10px] text-[var(--text3)] mt-1">
              <span>1</span>
              <span className="font-mono font-semibold text-[var(--text)]">{units} enheter</span>
              <span>30</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">Pris per enhet (SEK)</label>
            <input type="range" min={200} max={800} step={10} value={price} onChange={e => setPrice(Number(e.target.value))}
              className="w-full accent-[var(--green)]" />
            <div className="flex justify-between text-[10px] text-[var(--text3)] mt-1">
              <span>200</span>
              <span className="font-mono font-semibold text-[var(--green)]">{formatSEK(price)}</span>
              <span>800</span>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text2)]">Uppskattat totalt</span>
              <span className="text-lg font-bold font-mono text-[var(--green)]">{formatSEK(units * price)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <ShoppingCart size={14} />
            Lista {units} enheter till {formatSEK(price)}/enhet
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-tabs ───

type SubTab = 'inventory' | 'programs' | 'buyers' | 'listings' | 'history' | 'revenue';

// ─── Main Component ───

interface CreditTradingProps {
  creditInventory: { available: number; listed: number; sold: number; totalGenerated: number };
  totalRevenue: number;
  estimatedAnnualRevenue: number;
  programs: BiodiversityProgram[];
  buyers: BiodiversityBuyer[];
  listings: CreditListing[];
  transactions: CreditTransaction[];
  totalCreditsPerYear: number;
}

export function CreditTrading({
  creditInventory,
  totalRevenue,
  estimatedAnnualRevenue,
  programs,
  buyers,
  listings,
  transactions,
  totalCreditsPerYear,
}: CreditTradingProps) {
  const [activeTab, setActiveTab] = useState<SubTab>('inventory');
  const [showListModal, setShowListModal] = useState(false);

  const tabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'inventory', label: 'Kreditlager', icon: <Package size={14} /> },
    { id: 'programs', label: 'Program', icon: <ShieldCheck size={14} /> },
    { id: 'buyers', label: 'Köpare', icon: <Building2 size={14} /> },
    { id: 'listings', label: 'Listningar', icon: <ShoppingCart size={14} /> },
    { id: 'history', label: 'Historik', icon: <Clock size={14} /> },
    { id: 'revenue', label: 'Intäkter', icon: <TrendingUp size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* First mover banner */}
      <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-4">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-[var(--green)]">First mover advantage</h3>
            <p className="text-xs text-[var(--text2)] mt-1">
              EU:s lag om naturrestaurering skapar en ny marknad. Du bygger ditt kreditlager
              innan efterfrågan exploderar. Tidiga aktörer sätter standarden och priset.
            </p>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Package size={14} className="text-[var(--green)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Tillgängliga</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--green)]">{creditInventory.available}</p>
          <p className="text-[10px] text-[var(--text3)]">enheter</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <ShoppingCart size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Listade</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text)]">{creditInventory.listed}</p>
          <p className="text-[10px] text-[var(--text3)]">enheter till salu</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <CheckCircle2 size={14} className="text-[var(--text3)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Sålda</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--text)]">{creditInventory.sold}</p>
          <p className="text-[10px] text-[var(--text3)]">enheter</p>
        </div>
        <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Banknote size={14} className="text-[var(--green)]" />
            <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">Intäkter</span>
          </div>
          <p className="text-xl font-bold font-mono text-[var(--green)]">{formatSEK(totalRevenue)}</p>
          <p className="text-[10px] text-[var(--text3)]">totalt</p>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => setShowListModal(true)}
        className="w-full py-3 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] text-sm font-semibold hover:bg-[var(--green)]/15 transition-colors flex items-center justify-center gap-2"
      >
        <ShoppingCart size={16} />
        Lista krediter till salu
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
      <div className="min-h-[30vh]">
        {/* Inventory */}
        {activeTab === 'inventory' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Kreditöversikt</h3>
            <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-[var(--text3)] mb-1">Generering per år</p>
                  <p className="text-2xl font-bold font-mono text-[var(--green)]">{totalCreditsPerYear}</p>
                  <p className="text-[10px] text-[var(--text3)]">biodiversitetsenheter/år</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)] mb-1">Uppskattad årsintäkt</p>
                  <p className="text-2xl font-bold font-mono text-[var(--green)]">{formatSEK(estimatedAnnualRevenue)}</p>
                  <p className="text-[10px] text-[var(--text3)]">vid ~600 kr/enhet</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div className="h-full flex">
                  <div className="bg-[var(--green)] transition-all" style={{ width: `${(creditInventory.available / creditInventory.totalGenerated) * 100}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ width: `${(creditInventory.listed / creditInventory.totalGenerated) * 100}%` }} />
                  <div className="bg-blue-400 transition-all" style={{ width: `${(creditInventory.sold / creditInventory.totalGenerated) * 100}%` }} />
                </div>
              </div>
              <div className="flex gap-4 mt-2">
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text3)]"><div className="w-2 h-2 rounded-full bg-[var(--green)]" /> Tillgängliga</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text3)]"><div className="w-2 h-2 rounded-full bg-amber-400" /> Listade</span>
                <span className="flex items-center gap-1.5 text-[10px] text-[var(--text3)]"><div className="w-2 h-2 rounded-full bg-blue-400" /> Sålda</span>
              </div>
            </div>
          </div>
        )}

        {/* Programs */}
        {activeTab === 'programs' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Tillgängliga program</h3>
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
                    {prog.status === 'active' ? 'Aktivt' : prog.status === 'eligible' ? 'Kvalificerad' : 'Kommande'}
                  </span>
                </div>
                <p className="text-xs text-[var(--text2)] mb-3">{prog.description}</p>
                <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)] mb-3">
                  <p className="text-[10px] text-[var(--text3)] mb-1">Prisintervall</p>
                  <p className="text-sm font-bold font-mono text-[var(--green)]">
                    {formatSEK(prog.priceRange.min)} — {formatSEK(prog.priceRange.max)}
                  </p>
                  <p className="text-[9px] text-[var(--text3)]">per biodiversitetsenhet/år</p>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-[var(--text2)] mb-1.5">Krav</p>
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
        )}

        {/* Buyers */}
        {activeTab === 'buyers' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Aktiva köpare</h3>
            <div className="space-y-2">
              {buyers.map(buyer => (
                <div key={buyer.id}
                  className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--green)]/30 transition-colors cursor-pointer"
                  style={{ background: 'var(--bg2)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--bg3)] border border-[var(--border)]">
                        <Building2 size={16} className="text-[var(--text3)]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-[var(--text)]">{buyer.name}</p>
                          {buyer.verified && <CheckCircle2 size={12} className="text-[var(--green)]" />}
                        </div>
                        <p className="text-[10px] text-[var(--text3)]">{buyer.industry}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold font-mono text-[var(--green)]">{formatSEK(buyer.pricePerUnit)}</p>
                      <p className="text-[10px] text-[var(--text3)]">per enhet</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--text2)] mb-2">{buyer.reason}</p>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-[var(--text3)]">Behöver: <strong className="font-mono">{buyer.creditsNeeded}</strong> enheter</span>
                    <UrgencyBadge urgency={buyer.urgency} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listings */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Dina listningar</h3>
            <div className="space-y-2">
              {listings.map(listing => (
                <div key={listing.id} className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">{listing.parcelName}</p>
                      <p className="text-[10px] text-[var(--text3)]">Listad {listing.listedDate}</p>
                    </div>
                    <ListingStatusBadge status={listing.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Enheter</p>
                      <p className="text-sm font-bold font-mono text-[var(--text)]">{listing.units}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Pris/enhet</p>
                      <p className="text-sm font-bold font-mono text-[var(--green)]">{formatSEK(listing.pricePerUnit)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Totalt</p>
                      <p className="text-sm font-bold font-mono text-[var(--text)]">{formatSEK(listing.units * listing.pricePerUnit)}</p>
                    </div>
                  </div>
                  {listing.buyer && (
                    <p className="text-[10px] text-[var(--text3)] mt-2">Köpare: <span className="text-[var(--text)]">{listing.buyer}</span></p>
                  )}
                  <p className="text-[10px] text-[var(--text3)] mt-1">Verifiering: {listing.verificationMethod}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Transaktionshistorik</h3>
            <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Datum</th>
                      <th className="text-left p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Typ</th>
                      <th className="text-left p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Skifte</th>
                      <th className="text-right p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Enheter</th>
                      <th className="text-right p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Totalt</th>
                      <th className="text-center p-3 text-[10px] font-medium text-[var(--text3)] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx.id} className="border-b border-[var(--border)] last:border-0">
                        <td className="p-3 font-mono text-[var(--text2)]">{tx.date}</td>
                        <td className="p-3"><TxTypeBadge type={tx.type} /></td>
                        <td className="p-3 text-[var(--text)]">{tx.parcelName}</td>
                        <td className="p-3 text-right font-mono text-[var(--text)]">{tx.units}</td>
                        <td className={`p-3 text-right font-mono font-semibold ${tx.totalSEK > 0 ? 'text-[var(--green)]' : 'text-[var(--text3)]'}`}>
                          {tx.totalSEK > 0 ? formatSEK(tx.totalSEK) : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            tx.status === 'completed' ? 'bg-[var(--green)]/10 text-[var(--green)]' :
                            tx.status === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-blue-500/10 text-blue-400'
                          }`}>
                            {tx.status === 'completed' ? 'Slutförd' : tx.status === 'pending' ? 'Väntande' : 'Pågår'}
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

        {/* Revenue */}
        {activeTab === 'revenue' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text)]">Intäktsprognos</h3>
            <p className="text-xs text-[var(--text3)]">
              Baserat på {totalCreditsPerYear} enheter/år, genomsnittspris 600 kr/enhet, 5% årlig prisökning.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-4">
                <p className="text-[10px] text-[var(--text3)] mb-1">Årsintäkt (nuvarande)</p>
                <p className="text-xl font-bold font-mono text-[var(--green)]">{formatSEK(estimatedAnnualRevenue)}</p>
              </div>
              <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-4">
                <p className="text-[10px] text-[var(--text3)] mb-1">5-års kumulativ</p>
                <p className="text-xl font-bold font-mono text-[var(--green)]">{formatSEK(Math.round(estimatedAnnualRevenue * 5 * 1.125))}</p>
              </div>
            </div>
            {/* 5-year projection bars */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(year => {
                  const yearRev = Math.round(estimatedAnnualRevenue * Math.pow(1.05, year - 1));
                  const maxRev = Math.round(estimatedAnnualRevenue * Math.pow(1.05, 4));
                  const pct = (yearRev / maxRev) * 100;
                  return (
                    <div key={year} className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-[var(--text3)] w-10">År {year}</span>
                      <div className="flex-1 h-5 rounded-full bg-[var(--bg3)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--green)]/60 flex items-center justify-end pr-2 transition-all duration-700"
                          style={{ width: `${pct}%` }}>
                          <span className="text-[9px] font-mono font-bold text-[var(--text)]">{formatSEK(yearRev)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showListModal && <ListCreditModal onClose={() => setShowListModal(false)} />}
    </div>
  );
}
