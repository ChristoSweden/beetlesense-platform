import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, ChevronDown } from 'lucide-react';
import {
  getDemoStand,
  generateHarvestPlan,
  type StandInfo,
  type Season,
  type HarvestPlan,
} from '@/services/harvestLogisticsService';
import { MachineSchedule } from '@/components/logistics/MachineSchedule';
import { ExtractionPathMap } from '@/components/logistics/ExtractionPathMap';
import { MillComparison } from '@/components/logistics/MillComparison';
import { CostSummary } from '@/components/logistics/CostSummary';
import { SeasonRecommendation } from '@/components/logistics/SeasonRecommendation';

const DEMO_STANDS: StandInfo[] = [
  getDemoStand(),
  {
    id: 'stand-demo-2',
    name: 'Ekbacken (avd. 7)',
    areaHa: 32,
    volumeM3fub: 1800,
    terrainClass: 'flat_easy',
    soilType: 'sand',
    species: 'pine',
    distanceToRoadKm: 0.3,
    hasWetlands: false,
    hasCulturalSites: false,
    hasSteepSlopes: false,
    center: [14.835, 57.790],
    boundary: [
      [14.830, 57.787],
      [14.840, 57.787],
      [14.842, 57.793],
      [14.832, 57.793],
      [14.830, 57.787],
    ],
  },
  {
    id: 'stand-demo-3',
    name: 'Västra Kärret (avd. 15)',
    areaHa: 18,
    volumeM3fub: 950,
    terrainClass: 'steep_wet',
    soilType: 'wet_clay',
    species: 'spruce',
    distanceToRoadKm: 1.5,
    hasWetlands: true,
    hasCulturalSites: false,
    hasSteepSlopes: true,
    center: [14.800, 57.775],
    boundary: [
      [14.795, 57.772],
      [14.805, 57.772],
      [14.807, 57.778],
      [14.797, 57.778],
      [14.795, 57.772],
    ],
  },
];

const SEASONS: Season[] = ['winter', 'spring', 'summer', 'autumn'];

export default function HarvestLogisticsPage() {
  const { t } = useTranslation();
  const [selectedStandId, setSelectedStandId] = useState(DEMO_STANDS[0].id);
  const [selectedSeason, setSelectedSeason] = useState<Season>('winter');

  const stand = DEMO_STANDS.find((s) => s.id === selectedStandId) ?? DEMO_STANDS[0];

  const plan: HarvestPlan = useMemo(
    () => generateHarvestPlan(stand, selectedSeason),
    [stand, selectedSeason],
  );

  const handleOptimize = () => {
    // In production, this would call a backend optimizer
    // For demo, just regenerate with current params
    setSelectedSeason('winter');
  };

  return (
    <div className="min-h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Route size={20} className="text-[var(--green)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('logistics.page.title')}
              </h1>
            </div>
            <p className="text-xs text-[var(--text3)]">
              {t('logistics.page.subtitle')}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Stand selector */}
            <div className="relative">
              <select
                value={selectedStandId}
                onChange={(e) => setSelectedStandId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text)] cursor-pointer hover:border-[var(--border2)] transition-colors"
                style={{ background: 'var(--bg2)' }}
                aria-label={t('logistics.page.selectStand')}
              >
                {DEMO_STANDS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.areaHa} ha / {s.volumeM3fub.toLocaleString('sv-SE')} m{'\u00B3'}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
            </div>

            {/* Season selector */}
            <div className="relative">
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value as Season)}
                className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text)] cursor-pointer hover:border-[var(--border2)] transition-colors"
                style={{ background: 'var(--bg2)' }}
                aria-label={t('logistics.page.selectSeason')}
              >
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {t(`logistics.page.season_${s}`)}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stand summary bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[
            { label: t('logistics.page.area'), value: `${stand.areaHa} ha` },
            { label: t('logistics.page.volume'), value: `${stand.volumeM3fub.toLocaleString('sv-SE')} m\u00B3` },
            { label: t('logistics.page.terrain'), value: t(`logistics.terrain.${stand.terrainClass}`) },
            { label: t('logistics.page.soil'), value: t(`logistics.soil.${stand.soilType}`) },
            { label: t('logistics.page.species'), value: t(`logistics.species.${stand.species}`) },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-[var(--border)] p-3"
              style={{ background: 'var(--bg2)' }}
            >
              <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{item.label}</p>
              <p className="text-sm font-semibold font-mono text-[var(--text)] mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Main content grid */}
        <div className="space-y-6">
          {/* Machine Schedule — Gantt chart */}
          <MachineSchedule schedule={plan.schedule} onOptimize={handleOptimize} />

          {/* Extraction Path Map */}
          <ExtractionPathMap stand={plan.stand} extraction={plan.extraction} />

          {/* Two-column layout for mills + cost */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mill Comparison */}
            <MillComparison mills={plan.mills} />

            {/* Cost Summary */}
            <CostSummary summary={plan.costSummary} stand={plan.stand} />
          </div>

          {/* Season Recommendation */}
          <SeasonRecommendation recommendation={plan.seasonRecommendation} />
        </div>
      </div>
    </div>
  );
}
