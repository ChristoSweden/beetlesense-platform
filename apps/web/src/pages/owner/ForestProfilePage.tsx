import { useTranslation } from 'react-i18next';
import { useForestProfile } from '@/hooks/useForestProfile';
import { ForestFactCard } from '@/components/profile/ForestFactCard';
import { SpeciesBreakdownVisual } from '@/components/profile/SpeciesBreakdownVisual';
import {
  TreePine,
  Mountain,
  Droplets,
  Sun,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Leaf,
  TreeDeciduous,
  Bug,
  Info,
} from 'lucide-react';

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-40 rounded-2xl bg-[var(--bg3)]" />
      <div className="h-6 w-48 rounded bg-[var(--bg3)]" />
      <div className="h-4 w-full rounded bg-[var(--bg3)]" />
      <div className="h-4 w-3/4 rounded bg-[var(--bg3)]" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-[var(--bg3)]" />
        ))}
      </div>
    </div>
  );
}

export default function ForestProfilePage() {
  const { t } = useTranslation();
  const { profile, isLoading, isDemo: isDemoMode } = useForestProfile();

  if (isLoading || !profile) {
    return (
      <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
        <LoadingSkeleton />
      </div>
    );
  }

  const {
    totalArea,
    parcelCount,
    county,
    municipality,
    species,
    soil,
    terrain,
    climate,
    specialFeatures,
    comparisons,
    dominantSpecies,
    forestType,
  } = profile;

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <div className="max-w-3xl mx-auto pb-16">
        {/* ─── Hero Section ─── */}
        <div className="relative overflow-hidden rounded-b-3xl mb-8">
          {/* Gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #15803d 100%)',
            }}
          />
          {/* Abstract tree pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L20 25h5L18 40h24L35 25h5L30 5z' fill='%23fff'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
          <div className="relative px-6 py-10 md:px-10 md:py-14">
            <div className="flex items-center gap-2 mb-3">
              <TreePine size={20} className="text-green-300" />
              <span className="text-xs font-mono text-green-300/70 uppercase tracking-widest">
                {t('forestProfile.heroLabel')}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white mb-3">
              {t('forestProfile.heroTitle')}
            </h1>
            <p className="text-sm md:text-base leading-relaxed text-green-100/80 max-w-xl">
              {t('forestProfile.heroDescription', {
                area: totalArea,
                forestType: t(`forestProfile.forestType.${forestType}`),
                dominantSpecies: t(`forestProfile.species.${species[0]?.icon}`, dominantSpecies),
                ageYears: species[0]?.ageYears ?? 45,
                soilType: t(`forestProfile.soilTypes.${soil.type.toLowerCase().replace(/\s+/g, '_')}`, soil.type),
                county,
              })}
            </p>

            {/* Quick stats pills */}
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-green-100 border border-white/10">
                {totalArea} ha
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-green-100 border border-white/10">
                {parcelCount} {t('forestProfile.parcels')}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-green-100 border border-white/10">
                {municipality}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/10 text-green-100 border border-white/10">
                {species.length} {t('forestProfile.speciesLabel')}
              </span>
            </div>

            {isDemoMode && (
              <div className="mt-4 flex items-center gap-1.5 text-[10px] font-mono text-green-300/50">
                <Info size={10} />
                {t('forestProfile.demoNote')}
              </div>
            )}
          </div>
        </div>

        <div className="px-4 md:px-6 space-y-6">
          {/* ─── Comparison Callouts ─── */}
          {comparisons.length > 0 && (
            <div className="space-y-2">
              {comparisons.map((comp) => {
                const diff = Math.abs(Math.round(comp.yourValue - comp.regionalAvg));
                const pctDiff = comp.regionalAvg > 0 ? Math.round((diff / comp.regionalAvg) * 100) : 0;
                if (pctDiff < 5) return null;
                return (
                  <div
                    key={comp.metric}
                    className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--border)]"
                    style={{
                      background: comp.isPositive
                        ? 'color-mix(in srgb, var(--green) 5%, transparent)'
                        : 'color-mix(in srgb, var(--amber) 5%, transparent)',
                    }}
                  >
                    {comp.isPositive ? (
                      <TrendingUp size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
                    ) : (
                      <TrendingDown size={14} className="text-[var(--amber)] mt-0.5 flex-shrink-0" />
                    )}
                    <p className="text-xs leading-relaxed text-[var(--text2)]">
                      {t(`forestProfile.comparison.${comp.metric}`, {
                        diff: pctDiff,
                        value: comp.yourValue,
                        avg: comp.regionalAvg,
                        unit: comp.unit,
                      })}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Your Trees ─── */}
          <ForestFactCard
            icon={<TreePine size={20} />}
            iconColor="#4ade80"
            title={t('forestProfile.sections.trees.title')}
            description={t('forestProfile.sections.trees.description', {
              count: species.length,
              dominant: t(`forestProfile.species.${species[0]?.icon}`, dominantSpecies),
              dominantPct: species[0]?.percentage ?? 0,
            })}
            didYouKnow={t('forestProfile.sections.trees.didYouKnow')}
            companionPrompt={t('forestProfile.sections.trees.companionPrompt')}
            expandedContent={
              <div className="text-xs leading-relaxed text-[var(--text2)] space-y-2">
                <p>{t('forestProfile.sections.trees.expandedInfo')}</p>
              </div>
            }
          >
            <SpeciesBreakdownVisual species={species} />
          </ForestFactCard>

          {/* ─── Your Soil ─── */}
          <ForestFactCard
            icon={<Droplets size={20} />}
            iconColor="#a78bfa"
            title={t('forestProfile.sections.soil.title')}
            description={t(`forestProfile.soilDescription.${soil.type.toLowerCase().replace(/\s+/g, '_')}`, {
              defaultValue: t('forestProfile.soilDescription.default', { type: soil.type }),
            })}
            didYouKnow={t('forestProfile.sections.soil.didYouKnow')}
            companionPrompt={t('forestProfile.sections.soil.companionPrompt')}
            expandedContent={
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.soil.moisture')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {t(`forestProfile.moistureLevel.${soil.moisture}`)}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.soil.rootRot')}</p>
                    <p className={`text-xs font-semibold ${
                      soil.rootRotRisk === 'high' ? 'text-[var(--red)]' :
                      soil.rootRotRisk === 'moderate' ? 'text-[var(--amber)]' :
                      'text-[var(--green)]'
                    }`}>
                      {t(`forestProfile.riskLevel.${soil.rootRotRisk}`)}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.soil.type')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {t(`forestProfile.soilTypes.${soil.type.toLowerCase().replace(/\s+/g, '_')}`, soil.type)}
                    </p>
                  </div>
                </div>
              </div>
            }
          />

          {/* ─── Your Terrain ─── */}
          <ForestFactCard
            icon={<Mountain size={20} />}
            iconColor="#f59e0b"
            title={t('forestProfile.sections.terrain.title')}
            description={t('forestProfile.sections.terrain.description', {
              elevationAvg: terrain.elevationAvg,
              elevationMin: terrain.elevationMin,
              elevationMax: terrain.elevationMax,
              drainage: t(`forestProfile.drainageLevel.${terrain.drainage}`),
              machineAccess: t(`forestProfile.machineAccess.${terrain.machineAccessibility}`),
            })}
            didYouKnow={t('forestProfile.sections.terrain.didYouKnow')}
            companionPrompt={t('forestProfile.sections.terrain.companionPrompt')}
            expandedContent={
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.terrain.elevation')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {terrain.elevationMin}–{terrain.elevationMax} m
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.terrain.slope')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">
                      ~{terrain.slopeAvg}°
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.terrain.drainage')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {t(`forestProfile.drainageLevel.${terrain.drainage}`)}
                    </p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.terrain.machineAccess')}</p>
                    <p className={`text-xs font-semibold ${
                      terrain.machineAccessibility === 'good' ? 'text-[var(--green)]' :
                      terrain.machineAccessibility === 'limited' ? 'text-[var(--amber)]' :
                      'text-[var(--red)]'
                    }`}>
                      {t(`forestProfile.machineAccess.${terrain.machineAccessibility}`)}
                    </p>
                  </div>
                </div>
              </div>
            }
          />

          {/* ─── Your Climate Zone ─── */}
          <ForestFactCard
            icon={<Sun size={20} />}
            iconColor="#38bdf8"
            title={t('forestProfile.sections.climate.title')}
            description={t('forestProfile.sections.climate.description', {
              zone: t(`forestProfile.climateZone.${climate.zone}`),
              growingStart: climate.growingSeasonStart,
              growingEnd: climate.growingSeasonEnd,
              summerTemp: climate.avgTempSummer,
              precipitation: climate.annualPrecipitation,
            })}
            didYouKnow={t('forestProfile.sections.climate.didYouKnow')}
            companionPrompt={t('forestProfile.sections.climate.companionPrompt')}
            expandedContent={
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.climate.summer')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">{climate.avgTempSummer}°C</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.climate.winter')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">{climate.avgTempWinter}°C</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.climate.precipitation')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">{climate.annualPrecipitation} mm</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-[var(--bg)]">
                    <p className="text-[10px] text-[var(--text3)] mb-1">{t('forestProfile.sections.climate.growingSeason')}</p>
                    <p className="text-xs font-semibold text-[var(--text)]">
                      {climate.growingSeasonStart}–{climate.growingSeasonEnd}
                    </p>
                  </div>
                </div>
              </div>
            }
          />

          {/* ─── What Makes Your Forest Special ─── */}
          {specialFeatures.length > 0 && (
            <ForestFactCard
              icon={<Sparkles size={20} />}
              iconColor="#f472b6"
              title={t('forestProfile.sections.special.title')}
              description={t('forestProfile.sections.special.description')}
              companionPrompt={t('forestProfile.sections.special.companionPrompt')}
            >
              <div className="space-y-2">
                {specialFeatures.map((feature) => {
                  const icons: Record<string, React.ReactNode> = {
                    old_growth: <TreeDeciduous size={14} className="text-[#65a30d]" />,
                    wetland: <Droplets size={14} className="text-[#38bdf8]" />,
                    biodiversity: <Leaf size={14} className="text-[#4ade80]" />,
                    deadwood: <TreePine size={14} className="text-[#a78bfa]" />,
                    water_proximity: <Droplets size={14} className="text-[#38bdf8]" />,
                    edge_habitat: <Leaf size={14} className="text-[#84cc16]" />,
                  };
                  return (
                    <div
                      key={feature.id}
                      className="flex items-start gap-2.5 p-3 rounded-lg border border-[var(--border)]"
                      style={{ background: 'var(--bg)' }}
                    >
                      <span className="mt-0.5 flex-shrink-0">{icons[feature.type] ?? <Bug size={14} />}</span>
                      <div>
                        <p className="text-xs font-medium text-[var(--text)] mb-0.5">
                          {t(`forestProfile.features.${feature.type}.title`)}
                        </p>
                        <p className="text-[11px] leading-relaxed text-[var(--text2)]">
                          {t(`forestProfile.features.${feature.type}.description`)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ForestFactCard>
          )}
        </div>
      </div>
    </div>
  );
}
