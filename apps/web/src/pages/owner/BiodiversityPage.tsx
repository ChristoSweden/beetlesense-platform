/**
 * BiodiversityPage — Biodiversity Credits Marketplace hub.
 *
 * The next carbon. EU Nature Restoration Law creates massive demand.
 * BeetleSense is FIRST to quantify, verify, and trade biodiversity
 * credits from Swedish forests.
 */

import { useState } from 'react';
import {
  Bug,
  ShoppingCart,
  Lightbulb,
  Leaf,
  BarChart3,
} from 'lucide-react';
import { useBiodiversity } from '@/hooks/useBiodiversity';
import { BiodiversityScore } from '@/components/biodiversity/BiodiversityScore';
import { SpeciesInventory } from '@/components/biodiversity/SpeciesInventory';
import { CreditTrading } from '@/components/biodiversity/CreditTrading';
import { ImprovementPlan } from '@/components/biodiversity/ImprovementPlan';

type Tab = 'score' | 'species' | 'credits' | 'improve';

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  score: <BarChart3 size={14} />,
  species: <Bug size={14} />,
  credits: <ShoppingCart size={14} />,
  improve: <Lightbulb size={14} />,
};

export default function BiodiversityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('score');
  const bio = useBiodiversity();

  const tabs: { key: Tab; label: string }[] = [
    { key: 'score', label: 'Biodiversitetspoäng' },
    { key: 'species', label: 'Artinventering' },
    { key: 'credits', label: 'Kredithandel' },
    { key: 'improve', label: 'Förbättringsplan' },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <Leaf size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                Biodiversitetskrediter
              </h1>
              <p className="text-xs text-[var(--text3)]">
                Kvantifiera, verifiera och handla med biologisk mångfald
              </p>
            </div>
          </div>
        </div>

        {/* Parcel selector */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-[var(--text3)]">Skifte:</span>
          {bio.parcelBiodiversity.map(p => (
            <button
              key={p.parcelId}
              onClick={() => bio.setSelectedParcelId(p.parcelId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                bio.selectedParcelId === p.parcelId
                  ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                  : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {p.parcelName} ({p.areaHa} ha)
            </button>
          ))}
        </div>

        {/* Quick stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-3">
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Poäng</p>
            <p className="text-xl font-bold font-mono text-[var(--green)]">{bio.selectedParcel.totalScore}/100</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Arter</p>
            <p className="text-xl font-bold font-mono text-[var(--text)]">{bio.totalSpecies}</p>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Rödlistade</p>
            <p className="text-xl font-bold font-mono text-amber-400">{bio.redListedCount}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Krediter/år</p>
            <p className="text-xl font-bold font-mono text-[var(--text)]">{bio.totalCreditsPerYear}</p>
          </div>
          <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-3">
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Värde/år</p>
            <p className="text-xl font-bold font-mono text-[var(--green)]">~{bio.estimatedAnnualRevenue.toLocaleString('sv-SE')} kr</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 border-b border-[var(--border)]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all
                whitespace-nowrap -mb-px border-b-2
                ${activeTab === tab.key
                  ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/5'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
                }
              `}
            >
              <span className={activeTab === tab.key ? 'text-[var(--green)]' : 'text-[var(--text3)]'}>
                {TAB_ICONS[tab.key]}
              </span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="min-h-[60vh]">
          {activeTab === 'score' && (
            <BiodiversityScore
              data={bio.selectedParcel}
              nationalAvg={bio.nationalAvgScore}
            />
          )}
          {activeTab === 'species' && (
            <SpeciesInventory
              species={bio.parcelSpecies}
              allSpecies={bio.allSpecies}
            />
          )}
          {activeTab === 'credits' && (
            <CreditTrading
              creditInventory={bio.creditInventory}
              totalRevenue={bio.totalRevenue}
              estimatedAnnualRevenue={bio.estimatedAnnualRevenue}
              programs={bio.programs}
              buyers={bio.buyers}
              listings={bio.listings}
              transactions={bio.transactions}
              totalCreditsPerYear={bio.totalCreditsPerYear}
            />
          )}
          {activeTab === 'improve' && (
            <ImprovementPlan
              actions={bio.parcelActions}
              currentScore={bio.selectedParcel.totalScore}
              parcelName={bio.selectedParcel.parcelName}
            />
          )}
        </div>
      </div>
    </div>
  );
}
