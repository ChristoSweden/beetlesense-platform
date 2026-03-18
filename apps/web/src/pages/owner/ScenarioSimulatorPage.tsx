import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GitBranch,
  Clock,
  Axe,
  Bug,
  TreePine,
  Thermometer,
  SlidersHorizontal,
} from 'lucide-react';
import {
  type ScenarioId,
  type ScenarioResult,
  type CustomScenarioParams,
  runScenario,
  DEFAULT_PARCEL_INPUT,
} from '@/services/scenarioEngine';
import { ScenarioCard } from '@/components/scenarios/ScenarioCard';
import { ProjectionChart } from '@/components/scenarios/ProjectionChart';
import { ComparisonSummary } from '@/components/scenarios/ComparisonSummary';

// ─── Preset scenarios ───

const PRESETS: Array<{
  id: ScenarioId;
  titleKey: string;
  descriptionKey: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'do_nothing_5y',
    titleKey: 'scenarios.presets.doNothing.title',
    descriptionKey: 'scenarios.presets.doNothing.description',
    icon: <Clock size={20} />,
  },
  {
    id: 'thin_30_spruce',
    titleKey: 'scenarios.presets.thin30.title',
    descriptionKey: 'scenarios.presets.thin30.description',
    icon: <Axe size={20} />,
  },
  {
    id: 'beetle_unchecked',
    titleKey: 'scenarios.presets.beetleUnchecked.title',
    descriptionKey: 'scenarios.presets.beetleUnchecked.description',
    icon: <Bug size={20} />,
  },
  {
    id: 'mixed_species',
    titleKey: 'scenarios.presets.mixedSpecies.title',
    descriptionKey: 'scenarios.presets.mixedSpecies.description',
    icon: <TreePine size={20} />,
  },
  {
    id: 'climate_2c',
    titleKey: 'scenarios.presets.climate2c.title',
    descriptionKey: 'scenarios.presets.climate2c.description',
    icon: <Thermometer size={20} />,
  },
  {
    id: 'custom',
    titleKey: 'scenarios.presets.custom.title',
    descriptionKey: 'scenarios.presets.custom.description',
    icon: <SlidersHorizontal size={20} />,
  },
];

// ─── Page ───

export default function ScenarioSimulatorPage() {
  const { t } = useTranslation();

  const [activeScenario, setActiveScenario] = useState<ScenarioId | null>(null);
  const [customParams, setCustomParams] = useState<CustomScenarioParams>({
    thinningPercent: 20,
    targetSpecies: 'mixed',
    yearsToProject: 5,
    climateWarmingC: 0,
    beetleIntervention: true,
  });

  const handleSimulate = useCallback(
    (id: ScenarioId) => {
      setActiveScenario(id);
    },
    [],
  );

  const result: ScenarioResult | null = useMemo(() => {
    if (!activeScenario) return null;
    return runScenario(activeScenario, DEFAULT_PARCEL_INPUT, customParams);
  }, [activeScenario, customParams]);

  const formatSEK = useCallback((v: number) => {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M kr`;
    if (v >= 1_000) return `${Math.round(v / 1_000)}k kr`;
    return `${Math.round(v)} kr`;
  }, []);

  const formatPercent = useCallback((v: number) => `${Math.round(v)}%`, []);
  const formatScore = useCallback((v: number) => `${Math.round(v)}`, []);
  const formatTonnes = useCallback((v: number) => `${Math.round(v)} t`, []);

  return (
    <div className="min-h-full" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="border-b border-[var(--border)] px-6 py-5" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center">
              <GitBranch size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('scenarios.pageTitle')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('scenarios.pageSubtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Scenario selector */}
          <div className="lg:col-span-4">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
              {t('scenarios.selectScenario')}
            </h2>
            <div className="space-y-3">
              {PRESETS.map((preset) => (
                <ScenarioCard
                  key={preset.id}
                  scenarioId={preset.id}
                  icon={preset.icon}
                  titleKey={preset.titleKey}
                  descriptionKey={preset.descriptionKey}
                  isActive={activeScenario === preset.id}
                  onSimulate={handleSimulate}
                />
              ))}
            </div>

            {/* Custom scenario builder */}
            {activeScenario === 'custom' && (
              <div className="mt-4 rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
                <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider mb-4">
                  {t('scenarios.customBuilder')}
                </h3>

                {/* Thinning */}
                <div className="mb-4">
                  <label className="text-xs text-[var(--text2)] block mb-1">
                    {t('scenarios.custom.thinning')} ({customParams.thinningPercent}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={60}
                    step={5}
                    value={customParams.thinningPercent}
                    onChange={(e) =>
                      setCustomParams((p) => ({ ...p, thinningPercent: Number(e.target.value) }))
                    }
                    className="w-full h-2 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--green)]
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--green)]
                      [&::-moz-range-thumb]:cursor-pointer"
                    style={{ background: 'var(--bg3)' }}
                    aria-label={t('scenarios.custom.thinning')}
                  />
                </div>

                {/* Target species */}
                <div className="mb-4">
                  <label className="text-xs text-[var(--text2)] block mb-1">
                    {t('scenarios.custom.targetSpecies')}
                  </label>
                  <div className="flex gap-2">
                    {(['spruce', 'pine', 'mixed'] as const).map((sp) => (
                      <button
                        key={sp}
                        onClick={() => setCustomParams((p) => ({ ...p, targetSpecies: sp }))}
                        className={`
                          flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                          ${
                            customParams.targetSpecies === sp
                              ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                              : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]'
                          }
                        `}
                      >
                        {t(`scenarios.custom.species.${sp}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Climate warming */}
                <div className="mb-4">
                  <label className="text-xs text-[var(--text2)] block mb-1">
                    {t('scenarios.custom.climateWarming')} (+{customParams.climateWarmingC}\u00B0C)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.5}
                    value={customParams.climateWarmingC}
                    onChange={(e) =>
                      setCustomParams((p) => ({ ...p, climateWarmingC: Number(e.target.value) }))
                    }
                    className="w-full h-2 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--amber)]
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--amber)]
                      [&::-moz-range-thumb]:cursor-pointer"
                    style={{ background: 'var(--bg3)' }}
                    aria-label={t('scenarios.custom.climateWarming')}
                  />
                </div>

                {/* Beetle intervention */}
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={customParams.beetleIntervention}
                      onChange={(e) =>
                        setCustomParams((p) => ({ ...p, beetleIntervention: e.target.checked }))
                      }
                      className="w-4 h-4 rounded border-[var(--border)] accent-[var(--green)]"
                    />
                    <span className="text-xs text-[var(--text2)]">
                      {t('scenarios.custom.beetleIntervention')}
                    </span>
                  </label>
                </div>

                {/* Years */}
                <div>
                  <label className="text-xs text-[var(--text2)] block mb-1">
                    {t('scenarios.custom.projectionYears')} ({customParams.yearsToProject})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={customParams.yearsToProject}
                    onChange={(e) =>
                      setCustomParams((p) => ({ ...p, yearsToProject: Number(e.target.value) }))
                    }
                    className="w-full h-2 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--green)]
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--green)]
                      [&::-moz-range-thumb]:cursor-pointer"
                    style={{ background: 'var(--bg3)' }}
                    aria-label={t('scenarios.custom.projectionYears')}
                  />
                </div>
              </div>
            )}

            {/* Parcel info card */}
            <div className="mt-4 rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
              <h3 className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
                {t('scenarios.parcelData')}
              </h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--text3)]">{t('scenarios.parcelFields.area')}</span>
                  <span className="font-mono text-[var(--text)]">{DEFAULT_PARCEL_INPUT.areaHa} ha</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text3)]">{t('scenarios.parcelFields.volume')}</span>
                  <span className="font-mono text-[var(--text)]">{DEFAULT_PARCEL_INPUT.volumeM3sk.toLocaleString()} m\u00B3sk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text3)]">{t('scenarios.parcelFields.spruce')}</span>
                  <span className="font-mono text-[var(--text)]">{Math.round(DEFAULT_PARCEL_INPUT.spruceFraction * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text3)]">{t('scenarios.parcelFields.pine')}</span>
                  <span className="font-mono text-[var(--text)]">{Math.round(DEFAULT_PARCEL_INPUT.pineFraction * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text3)]">{t('scenarios.parcelFields.broadleaf')}</span>
                  <span className="font-mono text-[var(--text)]">{Math.round(DEFAULT_PARCEL_INPUT.broadleafFraction * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text3)]">{t('scenarios.parcelFields.siteIndex')}</span>
                  <span className="font-mono text-[var(--text)]">G{DEFAULT_PARCEL_INPUT.siteIndex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text3)]">{t('scenarios.parcelFields.standAge')}</span>
                  <span className="font-mono text-[var(--text)]">{DEFAULT_PARCEL_INPUT.standAge} {t('scenarios.parcelFields.years')}</span>
                </div>
              </div>
              <p className="text-[10px] text-[var(--text3)] mt-3 italic">
                {t('scenarios.parcelDisclaimer')}
              </p>
            </div>
          </div>

          {/* Right: Projections */}
          <div className="lg:col-span-8">
            {!result ? (
              <div className="flex flex-col items-center justify-center min-h-[400px] rounded-xl border border-[var(--border)] border-dashed" style={{ background: 'var(--bg2)' }}>
                <GitBranch size={40} className="text-[var(--text3)] mb-4 opacity-30" />
                <p className="text-sm text-[var(--text3)]">{t('scenarios.selectPrompt')}</p>
                <p className="text-xs text-[var(--text3)] mt-1 opacity-60">
                  {t('scenarios.selectPromptHint')}
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Charts */}
                <ProjectionChart
                  baseline={result.baseline}
                  action={result.action}
                  metric="health"
                  titleKey="scenarios.charts.health"
                  formatValue={formatScore}
                />

                <ProjectionChart
                  baseline={result.baseline}
                  action={result.action}
                  metric="timberValue"
                  titleKey="scenarios.charts.timberValue"
                  formatValue={formatSEK}
                />

                <ProjectionChart
                  baseline={result.baseline}
                  action={result.action}
                  metric="beetleRisk"
                  titleKey="scenarios.charts.beetleRisk"
                  formatValue={formatPercent}
                />

                <ProjectionChart
                  baseline={result.baseline}
                  action={result.action}
                  metric="biodiversity"
                  titleKey="scenarios.charts.biodiversity"
                  formatValue={formatScore}
                />

                <ProjectionChart
                  baseline={result.baseline}
                  action={result.action}
                  metric="carbonSeq"
                  titleKey="scenarios.charts.carbonSeq"
                  formatValue={formatTonnes}
                />

                {/* Comparison summary */}
                <ComparisonSummary result={result} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
