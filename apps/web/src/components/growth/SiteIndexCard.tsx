import { useTranslation } from 'react-i18next';
import { Layers, Thermometer, Droplets, TreePine } from 'lucide-react';
import type { ParcelData } from '@/services/growthModelService';

interface SiteIndexCardProps {
  parcel: ParcelData;
}

export function SiteIndexCard({ parcel }: SiteIndexCardProps) {
  const { t } = useTranslation();

  const siteClass =
    parcel.siteIndex >= 28 ? t('growth.siteIndex.veryHigh') :
    parcel.siteIndex >= 24 ? t('growth.siteIndex.high') :
    parcel.siteIndex >= 20 ? t('growth.siteIndex.medium') :
    t('growth.siteIndex.low');

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
          <Layers size={16} className="text-[var(--green)]" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {t('growth.siteIndex.title')}
          </h3>
          <p className="text-[10px] text-[var(--text3)]">{parcel.name}</p>
        </div>
      </div>

      {/* Site index and class */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-mono font-semibold text-[var(--green)]">
          H{parcel.siteIndex}
        </span>
        <span className="text-xs text-[var(--text2)]">
          ({siteClass})
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Soil type */}
        <div className="rounded-lg border border-[var(--border)] p-2.5">
          <p className="text-[10px] text-[var(--text3)] mb-0.5">
            {t('growth.siteIndex.soilType')}
          </p>
          <p className="text-xs font-medium text-[var(--text)]">
            {parcel.soilType}
          </p>
        </div>

        {/* Current age */}
        <div className="rounded-lg border border-[var(--border)] p-2.5">
          <p className="text-[10px] text-[var(--text3)] mb-0.5">
            {t('growth.siteIndex.currentAge')}
          </p>
          <p className="text-xs font-medium text-[var(--text)] font-mono">
            {parcel.currentAge} {t('growth.units.years')}
          </p>
        </div>

        {/* Current volume */}
        <div className="rounded-lg border border-[var(--border)] p-2.5">
          <p className="text-[10px] text-[var(--text3)] mb-0.5">
            {t('growth.siteIndex.currentVolume')}
          </p>
          <p className="text-xs font-medium text-[var(--text)] font-mono">
            {parcel.currentVolume} m³sk/ha
          </p>
        </div>

        {/* Area */}
        <div className="rounded-lg border border-[var(--border)] p-2.5">
          <p className="text-[10px] text-[var(--text3)] mb-0.5">
            {t('growth.siteIndex.area')}
          </p>
          <p className="text-xs font-medium text-[var(--text)] font-mono">
            {parcel.area} ha
          </p>
        </div>
      </div>

      {/* Species composition */}
      <div className="mt-3">
        <p className="text-[10px] text-[var(--text3)] mb-2 flex items-center gap-1">
          <TreePine size={10} />
          {t('growth.siteIndex.speciesComposition')}
        </p>
        <div className="flex gap-1 h-3 rounded-full overflow-hidden">
          {parcel.speciesComposition.map((s, i) => (
            <div
              key={s.species}
              className="h-full"
              style={{
                width: `${s.percent}%`,
                background:
                  i === 0 ? '#4ade80' :
                  i === 1 ? '#86efac' :
                  i === 2 ? '#a3e635' :
                  '#d9f99d',
                opacity: 1 - i * 0.15,
              }}
              title={`${s.species}: ${s.percent}%`}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
          {parcel.speciesComposition.map((s, i) => (
            <div key={s.species} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background:
                    i === 0 ? '#4ade80' :
                    i === 1 ? '#86efac' :
                    i === 2 ? '#a3e635' :
                    '#d9f99d',
                }}
              />
              <span className="text-[10px] text-[var(--text2)]">
                {s.species} {s.percent}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Climate trends */}
      <div className="mt-3 pt-3 border-t border-[var(--border)]">
        <p className="text-[10px] text-[var(--text3)] mb-2">
          {t('growth.siteIndex.climateTrends')}
        </p>
        <div className="flex gap-4">
          <div className="flex items-center gap-1.5">
            <Thermometer size={12} className="text-[#f87171]" />
            <span className="text-[10px] font-mono text-[var(--text)]">
              +{parcel.temperatureTrend}°C
            </span>
            <span className="text-[10px] text-[var(--text3)]">
              /{t('growth.units.decade')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Droplets size={12} className="text-[#60a5fa]" />
            <span className="text-[10px] font-mono text-[var(--text)]">
              +{parcel.precipitationTrend}mm
            </span>
            <span className="text-[10px] text-[var(--text3)]">
              /{t('growth.units.decade')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
