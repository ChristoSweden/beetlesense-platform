/**
 * Climate Species Migration Planner
 * Route: /owner/climate-adaptation
 *
 * Tells forest owners which species will thrive at their location in 2040, 2060, 2080
 * as climate zones shift north. Generational wealth advice nobody else provides.
 */

import { Sprout, ArrowLeft, MapPin, ThermometerSun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClimateAdaptation } from '@/hooks/useClimateAdaptation';
import { SpeciesSuitabilityMatrix } from '@/components/climate/SpeciesSuitabilityMatrix';
import { ClimateZoneShift } from '@/components/climate/ClimateZoneShift';
import { PlantingStrategy } from '@/components/climate/PlantingStrategy';
import { SpeciesProfile } from '@/components/climate/SpeciesProfile';

export default function ClimateAdaptationPage() {
  const data = useClimateAdaptation();

  const selectedSpeciesData = data.selectedSpecies
    ? data.species.find((s) => s.id === data.selectedSpecies) ?? null
    : null;

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--border)] border-t-[var(--green)] animate-spin" />
          <span className="text-xs text-[var(--text3)]">Beräknar klimatscenarier...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <Link
          to="/owner/dashboard"
          className="flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors"
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>
      </div>

      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 flex items-center justify-center">
              <Sprout size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                Klimatanpassad artplanering
              </h1>
              <p className="text-xs text-[var(--text3)] mt-0.5">
                Vilka tradslag kommer trivas pa din mark 2040, 2060 och 2080?
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <MapPin size={13} className="text-[var(--green)]" />
          <div>
            <div className="text-xs font-medium text-[var(--text)]">{data.location.name}</div>
            <div className="text-[10px] text-[var(--text3)] font-mono">
              {data.location.lat.toFixed(2)} N, {data.location.lng.toFixed(2)} E
            </div>
          </div>
        </div>
      </div>

      {/* Key insight banner */}
      <div className="mb-6 rounded-xl border border-[var(--green)]/20 bg-gradient-to-r from-[var(--green)]/5 to-transparent p-5">
        <div className="flex items-start gap-3">
          <ThermometerSun size={20} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)] mb-1">
              Gran ar pa vag att bli olamplig for nyplantering pa din mark
            </h2>
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              Klimatzonen i Värnamo förskjuts fran sodra boreal till nemoral inom 40 ar. Gran (nuvarande 65% av
              bestandet) tappar lamplighet fran 82 till 18 poang. Ek och Douglasgran ar de starkaste ersattarna
              med 40-70% hogre nettovarde over en omloppstid. Ditt val idag avgör skogens varde 2080.
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="space-y-6">
        {/* 1. Climate Zone Shift */}
        <ClimateZoneShift zones={data.climateZones} />

        {/* 2. Species Suitability Matrix */}
        <SpeciesSuitabilityMatrix
          species={data.species}
          timeHorizons={data.timeHorizons}
          sortKey={data.sortKey}
          onSortChange={data.setSortKey}
          onSelectSpecies={data.setSelectedSpecies}
        />

        {/* 3. Species profile detail (if selected) */}
        {selectedSpeciesData && (
          <SpeciesProfile
            species={selectedSpeciesData}
            timeHorizons={data.timeHorizons}
            onClose={() => data.setSelectedSpecies(null)}
          />
        )}

        {/* 4. Planting Strategy */}
        <PlantingStrategy
          strategies={data.strategies}
          selectedStrategy={data.selectedStrategy}
          onSelectStrategy={data.setSelectedStrategy}
        />

        {/* Economic comparison summary */}
        <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)]">Ekonomisk jämförelse — NPV per trädslag</h3>
            <p className="text-xs text-[var(--text3)] mt-0.5">
              Nuvärde over 60 ar vid plantering idag (SEK per hektar, 3% realränta)
            </p>
          </div>

          <div className="p-5 space-y-2">
            {[...data.species]
              .sort((a, b) => b.npv60yr - a.npv60yr)
              .map((sp) => {
                const maxNpv = Math.max(...data.species.map((s) => s.npv60yr));
                const barWidth = (sp.npv60yr / maxNpv) * 100;
                return (
                  <div key={sp.id} className="flex items-center gap-3">
                    <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
                      <span className="text-xs text-[var(--text)]">{sp.nameSwedish}</span>
                      {sp.isRecommended && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
                      )}
                    </div>
                    <div className="flex-1 h-5 rounded bg-[var(--bg3)] overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${barWidth}%`,
                          backgroundColor: sp.climateLoser
                            ? '#ef4444'
                            : sp.climateWinner
                              ? '#4ade80'
                              : '#64748b',
                          opacity: 0.6,
                        }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs font-mono text-[var(--text2)]">
                      {(sp.npv60yr / 1000).toFixed(0)}k SEK
                    </span>
                  </div>
                );
              })}
          </div>

          <div className="px-5 py-3 border-t border-[var(--border)] flex items-center gap-4 text-[10px] text-[var(--text3)]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#4ade80]/60" />
              Klimatvinnare
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#ef4444]/60" />
              Klimatforlorare
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              Rekommenderad
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="rounded-lg border border-[var(--border)] p-4" style={{ background: 'var(--bg3)' }}>
          <p className="text-[10px] text-[var(--text3)] leading-relaxed">
            <strong className="text-[var(--text2)]">Om denna prognos:</strong> Klimatdata baseras pa SMHI:s regionala
            klimatscenarier (RCP 4.5 / SSP2-4.5). Artlämplighet beräknas med klimathyllamodeller fran SLU och EFI.
            Ekonomiska beräkningar anvander Skogsstyrelsens produktionstabeller och aktuella virkespriser (mars 2026).
            Alla prognoser innehaller osäkerhet — använd som rådgivande underlag, inte som garanti. Kontakta
            Skogsstyrelsen eller din skogsbruksplan-rådgivare for en platsspecifik bedömning.
          </p>
        </div>
      </div>
    </div>
  );
}
