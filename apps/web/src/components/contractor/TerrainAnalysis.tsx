import { useTranslation } from 'react-i18next';
import {
  Mountain,
  Droplets,
  Route,
  AlertTriangle,
  TrendingUp,
  Thermometer,
} from 'lucide-react';

interface TerrainAnalysisProps {
  parcelId: string;
  parcelName: string;
}

// Demo terrain data keyed by parcel
const TERRAIN_DATA: Record<string, {
  slope_class: 'flat' | 'gentle' | 'moderate' | 'steep';
  slope_percent: number;
  soil_bearing: 'high' | 'medium' | 'low';
  soil_type: string;
  recommended_strip_roads: number;
  strip_road_spacing_m: number;
  sensitive_areas: Array<{ type: string; description: string }>;
  elevation_min: number;
  elevation_max: number;
  season_recommendation: string;
}> = {
  p1: {
    slope_class: 'gentle',
    slope_percent: 8,
    soil_bearing: 'high',
    soil_type: 'Moränmark (morän)',
    recommended_strip_roads: 4,
    strip_road_spacing_m: 20,
    sensitive_areas: [
      { type: 'wetland', description: 'Sumpskog 0.3 ha i NV hörnet' },
    ],
    elevation_min: 185,
    elevation_max: 212,
    season_recommendation: 'year_round',
  },
  p2: {
    slope_class: 'moderate',
    slope_percent: 18,
    soil_bearing: 'medium',
    soil_type: 'Sedimentär mark (lera/silt)',
    recommended_strip_roads: 5,
    strip_road_spacing_m: 18,
    sensitive_areas: [
      { type: 'wetland', description: 'Bäck med kantzon 15m' },
      { type: 'cultural', description: 'Fornlämning RAÄ 142:1 (röse)' },
    ],
    elevation_min: 152,
    elevation_max: 198,
    season_recommendation: 'frozen_ground',
  },
  p3: {
    slope_class: 'flat',
    slope_percent: 3,
    soil_bearing: 'low',
    soil_type: 'Torvmark',
    recommended_strip_roads: 3,
    strip_road_spacing_m: 22,
    sensitive_areas: [
      { type: 'wetland', description: 'Våtmark klass 3 enligt VMI, södra delen' },
      { type: 'wetland', description: 'Dike med buffertzon 10m' },
    ],
    elevation_min: 134,
    elevation_max: 141,
    season_recommendation: 'frozen_ground',
  },
};

const DEFAULT_TERRAIN = TERRAIN_DATA.p1;

export function TerrainAnalysis({ parcelId, parcelName }: TerrainAnalysisProps) {
  const { t } = useTranslation();
  const terrain = TERRAIN_DATA[parcelId] ?? DEFAULT_TERRAIN;

  const slopeColors = {
    flat: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
    gentle: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
    moderate: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
    steep: { bg: 'bg-red-500/15', text: 'text-red-400' },
  };

  const bearingColors = {
    high: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
    medium: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
    low: { bg: 'bg-red-500/15', text: 'text-red-400' },
  };

  const slopeStyle = slopeColors[terrain.slope_class];
  const bearingStyle = bearingColors[terrain.soil_bearing];

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Mountain size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('contractor.terrain.title')}
        </h3>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full ml-auto">
          {parcelName}
        </span>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Slope */}
        <div className="p-2.5 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('contractor.terrain.slope')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${slopeStyle.bg} ${slopeStyle.text}`}>
              {t(`contractor.terrain.slopeClass.${terrain.slope_class}`)}
            </span>
            <span className="text-xs font-mono text-[var(--text)]">{terrain.slope_percent}%</span>
          </div>
        </div>

        {/* Soil bearing */}
        <div className="p-2.5 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('contractor.terrain.bearing')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${bearingStyle.bg} ${bearingStyle.text}`}>
              {t(`contractor.terrain.bearingLevel.${terrain.soil_bearing}`)}
            </span>
          </div>
        </div>

        {/* Elevation */}
        <div className="p-2.5 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Mountain size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('contractor.terrain.elevation')}</span>
          </div>
          <span className="text-xs font-mono text-[var(--text)]">
            {terrain.elevation_min}&ndash;{terrain.elevation_max} m.ö.h.
          </span>
        </div>

        {/* Season recommendation */}
        <div className="p-2.5 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Thermometer size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('contractor.terrain.season')}</span>
          </div>
          <span className="text-xs text-[var(--text)]">
            {t(`contractor.terrain.seasonRec.${terrain.season_recommendation}`)}
          </span>
        </div>
      </div>

      {/* Strip roads */}
      <div className="p-2.5 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Route size={12} className="text-[var(--green)]" />
          <span className="text-[10px] font-mono text-[var(--text3)] uppercase">{t('contractor.terrain.stripRoads')}</span>
        </div>
        <p className="text-xs text-[var(--text)]">
          {t('contractor.terrain.stripRoadDesc', {
            count: terrain.recommended_strip_roads,
            spacing: terrain.strip_road_spacing_m,
          })}
        </p>
      </div>

      {/* Sensitive areas */}
      {terrain.sensitive_areas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-[10px] font-mono text-amber-400 uppercase">{t('contractor.terrain.sensitiveAreas')}</span>
          </div>
          {terrain.sensitive_areas.map((area, i) => (
            <div
              key={i}
              className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5"
            >
              <span className="text-[10px] font-mono text-amber-400 uppercase">{t(`contractor.terrain.areaType.${area.type}`)}</span>
              <p className="text-[11px] text-[var(--text2)] mt-0.5">{area.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Soil type */}
      <p className="text-[10px] text-[var(--text3)] mt-3">
        {t('contractor.terrain.soilType')}: {terrain.soil_type}
      </p>
    </div>
  );
}
