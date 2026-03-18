import { Thermometer, Droplets, Snowflake, Sun, MapPin } from 'lucide-react';
import type { ClimateZoneData, ClimateZone } from '@/hooks/useClimateAdaptation';

interface Props {
  zones: ClimateZoneData[];
}

const ZONE_COLORS: Record<ClimateZone, string> = {
  boreal: '#1e40af',
  southern_boreal: '#2563eb',
  hemiboreal: '#059669',
  northern_nemoral: '#65a30d',
  nemoral: '#ca8a04',
};

const ZONE_GRADIENT: Record<ClimateZone, string> = {
  boreal: 'from-blue-800 to-blue-600',
  southern_boreal: 'from-blue-600 to-cyan-500',
  hemiboreal: 'from-cyan-500 to-emerald-500',
  northern_nemoral: 'from-emerald-500 to-lime-500',
  nemoral: 'from-lime-500 to-amber-500',
};

export function ClimateZoneShift({ zones }: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text)]">Klimatzonens förskjutning norrut</h3>
        <p className="text-xs text-[var(--text3)] mt-0.5">Värnamo, lat 57.18 N — hur klimatzonen förändras</p>
      </div>

      {/* Big insight banner */}
      <div className="mx-5 mt-4 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 p-4">
        <p className="text-sm font-medium text-[var(--green)]">
          Din skog om 40 ar kommer ha samma klimat som Kopenhamn idag
        </p>
        <p className="text-xs text-[var(--text3)] mt-1">
          Medeltemperaturen okar fran 6.2 C till 9.8 C. Vaxtsaksongen forlängs med 60+ dagar.
        </p>
      </div>

      {/* Zone gradient bar */}
      <div className="px-5 py-5">
        <div className="relative">
          {/* Track */}
          <div className="h-10 rounded-full overflow-hidden flex">
            {zones.map((z, _i) => (
              <div
                key={z.year}
                className={`flex-1 bg-gradient-to-r ${ZONE_GRADIENT[z.zone]} flex items-center justify-center relative`}
              >
                <span className="text-[10px] font-bold text-white/90 drop-shadow-sm">{z.year}</span>
              </div>
            ))}
          </div>

          {/* Labels below */}
          <div className="flex mt-2">
            {zones.map((z) => (
              <div key={z.year} className="flex-1 text-center">
                <p className="text-[10px] font-medium text-[var(--text2)]">{z.zoneLabel}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow indicating direction */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <span className="text-[10px] text-[var(--text3)]">Kallare (Boreal)</span>
          <div className="flex-1 h-px bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 opacity-40" />
          <span className="text-[10px] text-[var(--text3)]">Varmare (Nemoral)</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {zones.map((z) => (
            <div
              key={z.year}
              className="rounded-lg border border-[var(--border)] p-3"
              style={{ background: 'var(--bg3)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[var(--text)]">{z.year}</span>
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: ZONE_COLORS[z.zone] }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Thermometer size={11} className="text-red-400 flex-shrink-0" />
                  <span className="text-[10px] text-[var(--text3)]">Medeltemp</span>
                  <span className="text-[10px] font-mono font-medium text-[var(--text)] ml-auto">
                    {z.meanTemp.toFixed(1)} C
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Sun size={11} className="text-amber-400 flex-shrink-0" />
                  <span className="text-[10px] text-[var(--text3)]">Vaxtgraddagar</span>
                  <span className="text-[10px] font-mono font-medium text-[var(--text)] ml-auto">
                    {z.growingDegreeDays}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Droplets size={11} className="text-blue-400 flex-shrink-0" />
                  <span className="text-[10px] text-[var(--text3)]">Nederbörd</span>
                  <span className="text-[10px] font-mono font-medium text-[var(--text)] ml-auto">
                    {z.annualPrecipMm} mm
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Snowflake size={11} className="text-cyan-400 flex-shrink-0" />
                  <span className="text-[10px] text-[var(--text3)]">Frostdagar</span>
                  <span className="text-[10px] font-mono font-medium text-[var(--text)] ml-auto">
                    {z.frostDays} d
                  </span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center gap-1">
                  <MapPin size={10} className="text-[var(--text3)] flex-shrink-0" />
                  <span className="text-[10px] text-[var(--text3)]">{z.analogueLocation}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
