import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import type maplibregl from 'maplibre-gl';
import {
  getStandRiskData,
  getWindConditions,
  toGeoJSON,
  getRiskColor,
  type StandRiskResult,
  type RiskFactors,
} from '@/services/stormRiskService';

interface RiskMapProps {
  map: maplibregl.Map | null;
  onStandClick: (stand: StandRiskResult) => void;
}

const FACTOR_LAYER_KEYS: (keyof RiskFactors)[] = [
  'terrainExposure',
  'edgeEffect',
  'heightDiameterRatio',
  'soilAnchoring',
  'speciesVulnerability',
  'recentThinning',
];

const SOURCE_ID = 'storm-risk-stands';
const FILL_LAYER_ID = 'storm-risk-fill';
const OUTLINE_LAYER_ID = 'storm-risk-outline';
const LABEL_LAYER_ID = 'storm-risk-labels';
const WIND_ARROW_LAYER_ID = 'storm-wind-arrows';
const WIND_ARROW_SOURCE = 'storm-wind-arrows-source';

export function RiskMap({ map, onStandClick }: RiskMapProps) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<keyof RiskFactors | 'overall'>('overall');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const stands = getStandRiskData();
  const wind = getWindConditions();

  const getColorExpression = useCallback(
    (filter: keyof RiskFactors | 'overall') => {
      if (filter === 'overall') {
        // Match by stand ID to color
        const matchExpr: (string | number | string[])[] = ['match', ['get', 'standId']];
        for (const stand of stands) {
          matchExpr.push(stand.standId as any);
          matchExpr.push(getRiskColor(stand.classification) as any);
        }
        matchExpr.push('#4ade80' as any); // fallback
        return matchExpr;
      }

      // For individual factor, compute color from factor value
      const matchExpr: (string | number | string[])[] = ['match', ['get', 'standId']];
      for (const stand of stands) {
        const value = stand.factors[filter];
        let color: string;
        if (value >= 7.5) color = '#ef4444';
        else if (value >= 5) color = '#f97316';
        else if (value >= 3) color = '#fbbf24';
        else color = '#4ade80';
        matchExpr.push(stand.standId as any);
        matchExpr.push(color as any);
      }
      matchExpr.push('#4ade80' as any);
      return matchExpr;
    },
    [stands],
  );

  // Add layers to map
  useEffect(() => {
    if (!map) return;

    const geojson = toGeoJSON(stands);

    // Remove existing layers/sources if they exist
    if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
    if (map.getLayer(OUTLINE_LAYER_ID)) map.removeLayer(OUTLINE_LAYER_ID);
    if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
    if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

    // Add source
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: geojson,
    });

    // Fill layer
    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': getColorExpression('overall') as any,
        'fill-opacity': 0.35,
      },
    });

    // Outline layer
    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': getColorExpression('overall') as any,
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    // Label layer
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      layout: {
        'text-field': ['concat', ['get', 'overallScore'], ''],
        'text-size': 14,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1.5,
      },
    });

    // Click handler
    map.on('click', FILL_LAYER_ID, (e) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const standId = feature.properties?.standId;
      const stand = stands.find((s) => s.standId === standId);
      if (stand) onStandClick(stand);
    });

    // Cursor
    map.on('mouseenter', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    // Fit bounds to stands
    const allCoords = stands.flatMap((s) => s.coordinates[0]);
    const lngs = allCoords.map((c) => c[0]);
    const lats = allCoords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs) - 0.01, Math.min(...lats) - 0.005],
        [Math.max(...lngs) + 0.01, Math.max(...lats) + 0.005],
      ],
      { padding: 60, duration: 1000 },
    );

    return () => {
      if (map.getLayer(LABEL_LAYER_ID)) map.removeLayer(LABEL_LAYER_ID);
      if (map.getLayer(OUTLINE_LAYER_ID)) map.removeLayer(OUTLINE_LAYER_ID);
      if (map.getLayer(FILL_LAYER_ID)) map.removeLayer(FILL_LAYER_ID);
      if (map.getLayer(WIND_ARROW_LAYER_ID)) map.removeLayer(WIND_ARROW_LAYER_ID);
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      if (map.getSource(WIND_ARROW_SOURCE)) map.removeSource(WIND_ARROW_SOURCE);
    };

  }, [map]);

  // Update colors when filter changes
  useEffect(() => {
    if (!map) return;
    if (!map.getLayer(FILL_LAYER_ID)) return;

    map.setPaintProperty(FILL_LAYER_ID, 'fill-color', getColorExpression(activeFilter) as any);
    map.setPaintProperty(OUTLINE_LAYER_ID, 'line-color', getColorExpression(activeFilter) as any);
  }, [map, activeFilter, getColorExpression]);

  return (
    <>
      {/* Filter toggle button */}
      <div className="absolute top-20 right-4 z-10">
        <div className="relative">
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilterPanel
                ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                : 'border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)]'
            }`}
            style={showFilterPanel ? {} : { background: 'var(--surface)' }}
            aria-label={t('storm.map.filterLayers')}
            title={t('storm.map.filterLayers')}
          >
            <Layers size={18} />
          </button>

          {showFilterPanel && (
            <div
              className="absolute right-full mr-2 top-0 w-52 rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden"
              style={{ background: 'var(--surface)' }}
            >
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
                  {t('storm.map.riskFactors')}
                </span>
              </div>

              {/* Overall */}
              <label className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--bg3)] transition-colors">
                <input
                  type="radio"
                  name="risk-filter"
                  checked={activeFilter === 'overall'}
                  onChange={() => setActiveFilter('overall')}
                  className="accent-[var(--green)]"
                />
                <span className="text-xs text-[var(--text2)]">{t('storm.map.overall')}</span>
              </label>

              {/* Individual factors */}
              {FACTOR_LAYER_KEYS.map((key) => (
                <label
                  key={key}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--bg3)] transition-colors"
                >
                  <input
                    type="radio"
                    name="risk-filter"
                    checked={activeFilter === key}
                    onChange={() => setActiveFilter(key)}
                    className="accent-[var(--green)]"
                  />
                  <span className="text-xs text-[var(--text2)]">{t(`storm.factors.${key}`)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wind direction indicator */}
      <div
        className="absolute bottom-4 right-4 z-10 p-3 rounded-xl border border-[var(--border)]"
        style={{ background: 'var(--surface)' }}
      >
        <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-1">
          {t('storm.map.windDirection')}
        </p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--bg)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              style={{ transform: `rotate(${wind.currentDirection}deg)` }}
            >
              <path d="M8 1 L12 13 L8 10 L4 13 Z" fill="var(--text2)" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-mono font-semibold text-[var(--text)]">
              {wind.currentSpeed} m/s
            </p>
            <p className="text-[9px] text-[var(--text3)]">
              {windDirectionLabel(wind.currentDirection)} ({wind.currentDirection}°)
            </p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 z-10 p-3 rounded-xl border border-[var(--border)]"
        style={{ background: 'var(--surface)' }}
      >
        <p className="text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
          {t('storm.map.riskLevel')}
        </p>
        <div className="flex items-center gap-3">
          {[
            { label: t('storm.risk.low'), color: '#4ade80' },
            { label: t('storm.risk.moderate'), color: '#fbbf24' },
            { label: t('storm.risk.high'), color: '#f97316' },
            { label: t('storm.risk.critical'), color: '#ef4444' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded" style={{ background: color, opacity: 0.6 }} />
              <span className="text-[9px] text-[var(--text3)]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}
