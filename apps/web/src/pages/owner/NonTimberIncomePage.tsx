/**
 * NonTimberIncomePage — Non-timber revenue hub.
 *
 * Tabs: Jakt (hunting), Friluftsliv (recreation),
 * Svamp & Bär (foraging), Övriga intäkter.
 * Revenue dashboard showing total non-timber income.
 */

import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Target,
  TreePine,
  Flower2,
  TrendingUp,
} from 'lucide-react';
import { useNonTimberIncome, type IncomeCategory } from '@/hooks/useNonTimberIncome';
import { HuntingManager } from '@/components/nontimber/HuntingManager';
import { RecreationIncome } from '@/components/nontimber/RecreationIncome';
import { ForagingRights } from '@/components/nontimber/ForagingRights';
import { OtherRevenue } from '@/components/nontimber/OtherRevenue';

function formatSEK(v: number): string {
  return v.toLocaleString('sv-SE');
}

const TABS: { id: IncomeCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'hunting', label: 'Jakt', icon: <Target size={14} /> },
  { id: 'recreation', label: 'Friluftsliv', icon: <TreePine size={14} /> },
  { id: 'foraging', label: 'Svamp & Bär', icon: <Flower2 size={14} /> },
  { id: 'other', label: 'Övriga intäkter', icon: <TrendingUp size={14} /> },
];

export default function NonTimberIncomePage() {
  const {
    activeTab,
    setActiveTab,
    huntingLeases,
    huntingSeasons,
    huntingSpeciesRates,
    recreationActivities,
    foragingItems,
    otherRevenue,
    summary,
    expiringLeases,
    underMarketLeases,
  } = useNonTimberIncome();

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 py-4" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-3xl mx-auto">
          <Link
            to="/owner/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors mb-3"
          >
            <ArrowLeft size={14} /> Tillbaka
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">Icke-virkes intäkter</h1>
              <p className="text-xs text-[var(--text3)] mt-0.5">
                Lås upp intäktsströmmar som Södra och Stora Enso helt ignorerar
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-[var(--green)]">{formatSEK(summary.totalAnnualIncome)}</p>
              <p className="text-[10px] text-[var(--text3)]">SEK/år totalt</p>
            </div>
          </div>

          {/* Revenue mini-cards */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            {[
              { label: 'Jakt', value: summary.huntingIncome, color: '#4ade80' },
              { label: 'Friluftsliv', value: summary.recreationIncome, color: '#60a5fa' },
              { label: 'Svamp & Bär', value: summary.foragingIncome, color: '#f97316' },
              { label: 'Övrigt', value: summary.otherIncome, color: '#a78bfa' },
            ].map(card => (
              <div key={card.label} className="p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                <p className="text-[10px] text-[var(--text3)]">{card.label}</p>
                <p className="text-sm font-mono font-semibold" style={{ color: card.color }}>
                  {formatSEK(card.value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)] px-4" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-3xl mx-auto flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto p-4">
        {activeTab === 'hunting' && (
          <HuntingManager
            leases={huntingLeases}
            seasons={huntingSeasons}
            speciesRates={huntingSpeciesRates}
            expiringLeases={expiringLeases}
            underMarketLeases={underMarketLeases}
            totalIncome={summary.huntingIncome}
          />
        )}

        {activeTab === 'recreation' && (
          <RecreationIncome
            activities={recreationActivities}
            totalIncome={summary.recreationIncome}
          />
        )}

        {activeTab === 'foraging' && (
          <ForagingRights
            items={foragingItems}
            totalIncome={summary.foragingIncome}
          />
        )}

        {activeTab === 'other' && (
          <OtherRevenue
            streams={otherRevenue}
            totalIncome={summary.otherIncome}
            summary={summary}
          />
        )}
      </div>
    </div>
  );
}
