/**
 * MillRadarPage — Mill Demand Radar & Negotiation Intelligence.
 *
 * Shows forest owners what the big buyers DON'T want them to see:
 * mill capacity utilization, demand signals, and how to negotiate.
 */

import { useState, useCallback } from 'react';
import {
  Factory,
  Radar,
  BarChart3,
  Shield,
  Filter,
  ChevronLeft,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMillDemand, type DemandLevel } from '@/hooks/useMillDemand';
import { MillMap } from '@/components/mills/MillMap';
import { MillCard } from '@/components/mills/MillCard';
import { DemandDashboard } from '@/components/mills/DemandDashboard';
import { NegotiationPrep } from '@/components/mills/NegotiationPrep';

type Tab = 'map' | 'demand' | 'negotiate';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'map', label: 'Karta', icon: <Radar size={14} /> },
  { id: 'demand', label: 'Efterfrågan', icon: <BarChart3 size={14} /> },
  { id: 'negotiate', label: 'Förhandla', icon: <Shield size={14} /> },
];

export default function MillRadarPage() {
  const { mills, hotMarkets, trends, regionBalances, isLoading, getNegotiationBrief } = useMillDemand();

  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [selectedMillId, setSelectedMillId] = useState<string | null>(null);
  const [negotiateMillId, setNegotiateMillId] = useState<string | null>(null);
  const [negotiateAssortment, setNegotiateAssortment] = useState<string | null>(null);

  // Filters
  const [filterDemand, setFilterDemand] = useState<DemandLevel | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMaxDistance, setFilterMaxDistance] = useState<number>(9999);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedMill = mills.find((m) => m.id === selectedMillId);

  const handleSelectMill = useCallback((id: string) => {
    setSelectedMillId((prev) => (prev === id ? null : id));
  }, []);

  const handleNegotiate = useCallback((millId: string, assortment: string) => {
    setNegotiateMillId(millId);
    setNegotiateAssortment(assortment);
    setActiveTab('negotiate');
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          <span className="text-sm text-[var(--text2)] font-mono">Laddar bruksdata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 lg:px-6 py-3" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Link
            to="/owner/dashboard"
            className="text-[var(--text3)] hover:text-[var(--green)] transition-colors"
          >
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/15 flex items-center justify-center">
              <Factory size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-base font-serif font-bold text-[var(--text)]">
                Bruksradar & Förhandling
              </h1>
              <p className="text-[10px] text-[var(--text3)]">
                Intelligens som industrin inte vill att du ska ha
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--green)]/15 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}

          {/* Filter button */}
          {activeTab === 'map' && (
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
                filtersOpen
                  ? 'bg-[var(--green)]/15 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
              }`}
            >
              <Filter size={14} />
              Filter
            </button>
          )}
        </div>

        {/* Filters panel */}
        {filtersOpen && activeTab === 'map' && (
          <div className="mt-3 pt-3 border-t border-[var(--border)] flex flex-wrap gap-3">
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Efterfrågan</label>
              <select
                value={filterDemand}
                onChange={(e) => setFilterDemand(e.target.value as DemandLevel | 'all')}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)]"
                style={{ background: 'var(--bg3)' }}
              >
                <option value="all">Alla</option>
                <option value="high">Hög</option>
                <option value="normal">Normal</option>
                <option value="low">Låg</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Typ</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)]"
                style={{ background: 'var(--bg3)' }}
              >
                <option value="all">Alla</option>
                <option value="sawmill">Sågverk</option>
                <option value="pulp">Massabruk</option>
                <option value="board">Kartongbruk</option>
                <option value="energy">Energi</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[var(--text3)] block mb-1">Max avstånd</label>
              <select
                value={filterMaxDistance}
                onChange={(e) => setFilterMaxDistance(Number(e.target.value))}
                className="rounded-lg border border-[var(--border)] px-2 py-1 text-xs text-[var(--text)]"
                style={{ background: 'var(--bg3)' }}
              >
                <option value={9999}>Alla</option>
                <option value={100}>100 km</option>
                <option value={200}>200 km</option>
                <option value={400}>400 km</option>
                <option value={600}>600 km</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'map' && (
          <>
            {/* Map (fills available space) */}
            <div className="flex-1 relative">
              <MillMap
                mills={mills}
                onSelectMill={handleSelectMill}
                selectedMillId={selectedMillId}
                filterDemand={filterDemand}
                filterType={filterType}
                filterMaxDistance={filterMaxDistance}
              />
            </div>

            {/* Mill detail sidebar (when selected) */}
            {selectedMill && (
              <div
                className="w-80 xl:w-96 border-l border-[var(--border)] overflow-y-auto"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-[var(--text)]">Detaljer</h2>
                    <button
                      onClick={() => setSelectedMillId(null)}
                      className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
                    >
                      <X size={14} className="text-[var(--text3)]" />
                    </button>
                  </div>
                  <MillCard mill={selectedMill} onSelectForNegotiation={handleNegotiate} />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'demand' && (
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-4xl mx-auto">
              <DemandDashboard
                mills={mills}
                hotMarkets={hotMarkets}
                trends={trends}
                regionBalances={regionBalances}
                onSelectMill={(id) => {
                  setSelectedMillId(id);
                  setActiveTab('map');
                }}
              />
            </div>
          </div>
        )}

        {activeTab === 'negotiate' && (
          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            <div className="max-w-3xl mx-auto">
              <NegotiationPrep
                mills={mills}
                getNegotiationBrief={getNegotiationBrief}
                initialMillId={negotiateMillId}
                initialAssortment={negotiateAssortment}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
