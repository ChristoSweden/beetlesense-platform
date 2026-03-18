import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sprout, ChevronDown, Info, BarChart3 } from 'lucide-react';
import {
  DEMO_PARCELS,
  getAllScenarioResults,
  generateStandardProjection,
  assessClimateImpact,
} from '@/services/growthModelService';
import { GrowthChart } from '@/components/growth/GrowthChart';
import { SiteIndexCard } from '@/components/growth/SiteIndexCard';
import { RotationOptimizer } from '@/components/growth/RotationOptimizer';
import { ClimateImpactSummary } from '@/components/growth/ClimateImpactSummary';
import { KeyMetricsBar } from '@/components/growth/KeyMetricsBar';

export default function GrowthModelPage() {
  const { t } = useTranslation();
  const [selectedParcelId, setSelectedParcelId] = useState(DEMO_PARCELS[0].id);
  const [rotationAge, setRotationAge] = useState(75);
  const [viewYears, setViewYears] = useState<10 | 30 | 50 | 80>(80);

  const parcel = DEMO_PARCELS.find((p) => p.id === selectedParcelId) ?? DEMO_PARCELS[0];

  const scenarios = useMemo(() => getAllScenarioResults(parcel, 120), [parcel]);
  const standardProjection = useMemo(() => generateStandardProjection(parcel, 120), [parcel]);
  const climateImpact = useMemo(() => assessClimateImpact(parcel), [parcel]);
  const moderateScenario = scenarios.find((s) => s.scenario === 'rcp60') ?? scenarios[1];

  // View range: from current age to current age + viewYears
  const viewRange: [number, number] = [
    Math.max(1, parcel.currentAge - 5),
    Math.min(120, parcel.currentAge + viewYears),
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-5 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--green)]/10 border border-[var(--green)]/20">
              <Sprout size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('growth.page.title')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('growth.page.subtitle')}
              </p>
            </div>
          </div>

          {/* Parcel selector */}
          <div className="relative">
            <select
              value={selectedParcelId}
              onChange={(e) => {
                setSelectedParcelId(e.target.value);
                // Reset rotation to a reasonable default
                const newParcel = DEMO_PARCELS.find((p) => p.id === e.target.value);
                if (newParcel) {
                  setRotationAge(Math.min(120, Math.max(40, newParcel.currentAge + 30)));
                }
              }}
              className="appearance-none rounded-lg border border-[var(--border)] px-3 py-2 pr-8 text-xs font-medium text-[var(--text)] cursor-pointer transition-colors hover:border-[var(--border2)]"
              style={{ background: 'var(--bg2)' }}
            >
              {DEMO_PARCELS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — H{p.siteIndex} ({
                    p.species === 'spruce' ? t('growth.species.spruce') :
                    p.species === 'pine' ? t('growth.species.pine') :
                    t('growth.species.mixed')
                  })
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none"
            />
          </div>
        </div>

        {/* Key metrics */}
        <div className="mb-6">
          <KeyMetricsBar moderate={moderateScenario} currentAge={parcel.currentAge} />
        </div>

        {/* Growth chart section */}
        <div
          className="rounded-xl border border-[var(--border)] p-4 lg:p-6 mb-6"
          style={{ background: 'var(--bg2)' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-[var(--green)]" />
              <h2 className="text-sm font-semibold text-[var(--text)]">
                {t('growth.chart.title')}
              </h2>
            </div>

            {/* Time horizon buttons */}
            <div className="flex gap-1">
              {([10, 30, 50, 80] as const).map((years) => (
                <button
                  key={years}
                  onClick={() => setViewYears(years)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-medium transition-colors ${
                    viewYears === years
                      ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                      : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text2)]'
                  }`}
                >
                  {years} {t('growth.units.yr')}
                </button>
              ))}
            </div>
          </div>

          <GrowthChart
            scenarios={scenarios}
            standardProjection={standardProjection}
            currentAge={parcel.currentAge}
            rotationAge={rotationAge}
            maxAge={120}
            viewRange={viewRange}
          />

          {/* Chart footnote */}
          <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
            <Info size={10} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-[var(--text3)] leading-relaxed">
              {t('growth.chart.footnote')}
            </p>
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Site index + Climate */}
          <div className="space-y-6">
            <SiteIndexCard parcel={parcel} />
            <ClimateImpactSummary
              impact={climateImpact}
              species={parcel.species}
            />
          </div>

          {/* Right column: Rotation optimizer (spans 2 cols) */}
          <div className="lg:col-span-2">
            <RotationOptimizer
              parcel={parcel}
              rotationAge={rotationAge}
              onRotationChange={setRotationAge}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
