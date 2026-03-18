/**
 * SilviculturePage — Silviculture Freedom tools.
 *
 * Alternative forest management plans that Stora Enso and Sodra
 * would never recommend because they reduce timber throughput.
 * Shows owners there are more profitable paths.
 */

import { useState } from 'react';
import {
  TreePine,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSilviculture } from '@/hooks/useSilviculture';
import { StrategyComparison } from '@/components/silviculture/StrategyComparison';
import { CCFPlanner } from '@/components/silviculture/CCFPlanner';
import { TotalValueCalculator } from '@/components/silviculture/TotalValueCalculator';
import { ParcelRecommendation } from '@/components/silviculture/ParcelRecommendation';
import { RegulationHelper } from '@/components/silviculture/RegulationHelper';

type Section = 'comparison' | 'ccf' | 'value' | 'parcels' | 'regulations';

export default function SilviculturePage() {
  const {
    strategies,
    selectedStrategy,
    selectStrategy,
    selectedParcelId,
    selectParcel,
    projections,
    totalValues,
    parcelSuitabilities,
    ccfPlan,
    winners,
    regulations,
    comparisonParcels,
    totalArea,
  } = useSilviculture();

  const [activeSection, setActiveSection] = useState<Section>('comparison');

  const sections: { id: Section; label: string; labelSv: string }[] = [
    { id: 'comparison', label: 'Strategy Comparison', labelSv: 'Strategijamforelse' },
    { id: 'ccf', label: 'CCF Planner', labelSv: 'Hyggesfritt planner' },
    { id: 'value', label: 'Total Value', labelSv: 'Totalt varde' },
    { id: 'parcels', label: 'Parcel Plans', labelSv: 'Skiftesrekommendationer' },
    { id: 'regulations', label: 'Regulations', labelSv: 'Regelverk' },
  ];

  const selectedParcel = comparisonParcels.find(p => p.id === selectedParcelId) ?? comparisonParcels[0];

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-4 py-4" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Link
              to="/owner/dashboard"
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
            >
              <ArrowLeft size={16} className="text-[var(--text3)]" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
                <TreePine size={18} className="text-[var(--green)]" />
              </div>
              <div>
                <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                  Silviculture Freedom
                </h1>
                <p className="text-[10px] text-[var(--text3)]">
                  Alternative management strategies &middot; {totalArea} ha across {comparisonParcels.length} parcels
                </p>
              </div>
            </div>
          </div>

          {/* Provocative subtitle */}
          <div className="p-3 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
            <p className="text-xs text-[var(--text)]">
              <span className="font-semibold text-[var(--green)]">Din skog, dina val.</span>{' '}
              Stora Enso and Sodra recommend clearcut because it maximizes <em>their</em> timber supply.
              These tools show you strategies that maximize <em>your</em> total value — timber, carbon,
              biodiversity, hunting, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-[var(--border)] px-4" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-5xl mx-auto">
          {/* Desktop tabs */}
          <div className="hidden md:flex gap-0 overflow-x-auto">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-[var(--green)] text-[var(--green)]'
                    : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {section.labelSv}
              </button>
            ))}
          </div>

          {/* Mobile dropdown */}
          <div className="md:hidden relative py-2">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value as Section)}
              className="w-full appearance-none bg-[var(--bg3)] border border-[var(--border)] rounded-lg px-3 py-2 pr-8 text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
            >
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.labelSv}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeSection === 'comparison' && (
          <StrategyComparison
            strategies={strategies}
            projections={projections}
            selectedStrategy={selectedStrategy}
            onSelectStrategy={selectStrategy}
            winners={winners}
          />
        )}

        {activeSection === 'ccf' && (
          <div className="space-y-6">
            <CCFPlanner
              plan={ccfPlan}
              parcelName={selectedParcel.name}
              areaHa={selectedParcel.area_hectares}
            />

            {/* Additional CCF info */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-2">Why CCF?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[var(--bg3)]">
                  <p className="text-[10px] font-medium text-[var(--green)] mb-1">Continuous Income</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Harvest every 5-10 years instead of waiting 65-80 years. Income flows
                    continuously — no decades-long gap after clearcut.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg3)]">
                  <p className="text-[10px] font-medium text-[var(--green)] mb-1">No Regeneration Cost</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Natural regeneration in canopy gaps eliminates planting costs
                    (12,000+ SEK/ha) and site preparation (3,500 SEK/ha).
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[var(--bg3)]">
                  <p className="text-[10px] font-medium text-[var(--green)] mb-1">Storm Resilient</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Multi-aged, multi-layered forests resist windthrow far better than
                    even-aged plantations. After storm Gudrun, CCF stands survived.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'value' && (
          <TotalValueCalculator
            strategies={strategies}
            totalValues={totalValues}
            selectedStrategy={selectedStrategy}
          />
        )}

        {activeSection === 'parcels' && (
          <ParcelRecommendation
            suitabilities={parcelSuitabilities}
            strategies={strategies}
            selectedParcelId={selectedParcelId}
            onSelectParcel={selectParcel}
          />
        )}

        {activeSection === 'regulations' && (
          <RegulationHelper
            regulations={regulations}
            strategies={strategies}
            selectedStrategy={selectedStrategy}
          />
        )}
      </div>
    </div>
  );
}
