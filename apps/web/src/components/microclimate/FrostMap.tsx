import { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseMap } from '@/components/map/BaseMap';
import {
  getParcelBoundary,
  type FrostPocketZone,
} from '@/services/microclimateService';
import type maplibregl from 'maplibre-gl';

interface FrostMapProps {
  parcelId: string;
  frostPockets: FrostPocketZone[];
}

export function FrostMap({ parcelId, frostPockets }: FrostMapProps) {
  const { t } = useTranslation();
  const [map, setMap] = useState<maplibregl.Map | null>(null);

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m);
  }, []);

  useEffect(() => {
    if (!map) return;

    const boundary = getParcelBoundary(parcelId);

    // Clean up previous layers
    const layerIds = ['parcel-fill', 'parcel-outline', ...frostPockets.map((_, i) => `frost-pocket-${i}`), ...frostPockets.map((_, i) => `frost-pocket-outline-${i}`)];
    for (const id of layerIds) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    const sourceIds = ['parcel-boundary', ...frostPockets.map((_, i) => `frost-pocket-${i}`)];
    for (const id of sourceIds) {
      if (map.getSource(id)) map.removeSource(id);
    }

    // Add parcel boundary
    map.addSource('parcel-boundary', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: boundary.coordinates,
        },
      },
    });

    map.addLayer({
      id: 'parcel-fill',
      type: 'fill',
      source: 'parcel-boundary',
      paint: {
        'fill-color': '#4ade80',
        'fill-opacity': 0.08,
      },
    });

    map.addLayer({
      id: 'parcel-outline',
      type: 'line',
      source: 'parcel-boundary',
      paint: {
        'line-color': '#4ade80',
        'line-width': 2,
        'line-dasharray': [2, 2],
      },
    });

    // Add frost pocket zones
    frostPockets.forEach((fp, i) => {
      map.addSource(`frost-pocket-${i}`, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            name: t(fp.name),
            extraFrostDays: fp.extraFrostDays,
            tempReduction: fp.tempReduction,
          },
          geometry: {
            type: 'Polygon',
            coordinates: fp.coordinates,
          },
        },
      });

      map.addLayer({
        id: `frost-pocket-${i}`,
        type: 'fill',
        source: `frost-pocket-${i}`,
        paint: {
          'fill-color': '#60a5fa',
          'fill-opacity': 0.25,
        },
      });

      map.addLayer({
        id: `frost-pocket-outline-${i}`,
        type: 'line',
        source: `frost-pocket-${i}`,
        paint: {
          'line-color': '#60a5fa',
          'line-width': 2,
        },
      });
    });

    // Fit bounds to parcel
    const coords = boundary.coordinates[0];
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    map.fitBounds(
      [
        [Math.min(...lngs) - 0.002, Math.min(...lats) - 0.002],
        [Math.max(...lngs) + 0.002, Math.max(...lats) + 0.002],
      ],
      { padding: 40, duration: 500 },
    );
  }, [map, parcelId, frostPockets, t]);

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
          {t('microclimate.frostMap.title')}
        </h3>
        <p className="text-[10px] text-[var(--text3)] mt-0.5">
          {t('microclimate.frostMap.subtitle')}
        </p>
      </div>

      <div className="h-64 relative">
        <BaseMap onMapReady={handleMapReady} />
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-[#4ade80] bg-[#4ade80]/10" />
            <span className="text-[10px] text-[var(--text3)]">{t('microclimate.frostMap.parcelBoundary')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-[#60a5fa]/30 border border-[#60a5fa]" />
            <span className="text-[10px] text-[var(--text3)]">{t('microclimate.frostMap.frostPocket')}</span>
          </div>
        </div>

        {/* Frost pocket details */}
        {frostPockets.length > 0 && (
          <div className="mt-3 space-y-2">
            {frostPockets.map((fp) => (
              <div
                key={fp.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-[#60a5fa]/5 border border-[#60a5fa]/20"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">{t(fp.name)}</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    -{fp.tempReduction}°C &middot; +{fp.extraFrostDays} {t('microclimate.frostMap.extraFrostDays')}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] italic">{t(fp.reason)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {frostPockets.length === 0 && (
          <p className="text-[10px] text-[var(--text3)] mt-2 italic">
            {t('microclimate.frostMap.noFrostPockets')}
          </p>
        )}
      </div>
    </div>
  );
}
