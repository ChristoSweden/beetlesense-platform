import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

interface NDVILayerProps {
  map: maplibregl.Map | null;
}

interface NDVIRow {
  parcel_id: string;
  ndvi_mean: number;
  ndvi_min: number;
  ndvi_max: number;
  observation_date: string;
}

interface ParcelRow {
  id: string;
  name: string;
  boundary_wgs84: GeoJSON.Geometry;
}

const SOURCE_ID = 'ndvi-source';
const FILL_LAYER_ID = 'ndvi-fill';

/**
 * Returns a color on the red-yellow-green gradient for NDVI values 0-0.5-1.0.
 */
function ndviColor(ndvi: number): string {
  const clamped = Math.max(0, Math.min(1, ndvi));
  if (clamped <= 0.5) {
    // Red (#ef4444) -> Yellow (#facc15)
    const t = clamped / 0.5;
    const r = Math.round(239 + (250 - 239) * t);
    const g = Math.round(68 + (204 - 68) * t);
    const b = Math.round(68 + (21 - 68) * t);
    return `rgb(${r},${g},${b})`;
  }
  // Yellow (#facc15) -> Green (#4ade80)
  const t = (clamped - 0.5) / 0.5;
  const r = Math.round(250 + (74 - 250) * t);
  const g = Math.round(204 + (222 - 204) * t);
  const b = Math.round(21 + (128 - 21) * t);
  return `rgb(${r},${g},${b})`;
}

/**
 * Build demo NDVI grid cells around each demo parcel.
 * Creates a grid of small rectangles with varying NDVI values.
 */
function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Simulated NDVI per parcel based on status
  const ndviMap: Record<string, { mean: number; min: number; max: number }> = {
    p1: { mean: 0.52, min: 0.35, max: 0.68 },  // at_risk
    p2: { mean: 0.82, min: 0.71, max: 0.91 },  // healthy
    p3: { mean: 0.78, min: 0.65, max: 0.88 },  // healthy
    p4: { mean: 0.31, min: 0.15, max: 0.48 },  // infested
    p5: { mean: 0.60, min: 0.45, max: 0.75 },  // unknown
  };

  for (const parcel of DEMO_PARCELS) {
    const [lng, lat] = parcel.center;
    const ndvi = ndviMap[parcel.id] ?? { mean: 0.6, min: 0.4, max: 0.8 };
    const gridSize = 3; // 3x3 grid per parcel
    const cellSize = 0.004;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        // Vary NDVI per cell with some randomness (deterministic based on position)
        const variation = ((row * gridSize + col) / (gridSize * gridSize)) * (ndvi.max - ndvi.min);
        const cellNdvi = ndvi.min + variation;
        const cellLng = lng - (gridSize * cellSize) / 2 + col * cellSize;
        const cellLat = lat - (gridSize * cellSize) / 2 + row * cellSize;

        features.push({
          type: 'Feature',
          properties: {
            id: `ndvi-${parcel.id}-${row}-${col}`,
            name: parcel.name,
            ndvi_mean: Number(cellNdvi.toFixed(3)),
            ndvi_min: Number(ndvi.min.toFixed(3)),
            ndvi_max: Number(ndvi.max.toFixed(3)),
            observation_date: '2026-03-14',
            color: ndviColor(cellNdvi),
          },
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [cellLng, cellLat],
              [cellLng + cellSize, cellLat],
              [cellLng + cellSize, cellLat + cellSize],
              [cellLng, cellLat + cellSize],
              [cellLng, cellLat],
            ]],
          },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

export function NDVILayer({ map }: NDVILayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);

  const loadNDVI = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      let geojson: GeoJSON.FeatureCollection;

      if (isDemo() || !isSupabaseConfigured) {
        geojson = buildDemoGeoJSON();
      } else {
        // Fetch latest NDVI observation per parcel
        const { data: ndviData, error: ndviError } = await supabase
          .from('satellite_observations')
          .select('parcel_id, ndvi_mean, ndvi_min, ndvi_max, observation_date')
          .not('ndvi_mean', 'is', null)
          .order('observation_date', { ascending: false });

        if (ndviError) {
          console.warn('Failed to load NDVI data, falling back to demo:', ndviError.message);
          geojson = buildDemoGeoJSON();
        } else if (!ndviData || ndviData.length === 0) {
          geojson = buildDemoGeoJSON();
        } else {
          // Keep only the latest observation per parcel
          const latestByParcel = new Map<string, NDVIRow>();
          for (const row of ndviData as NDVIRow[]) {
            if (!latestByParcel.has(row.parcel_id)) {
              latestByParcel.set(row.parcel_id, row);
            }
          }

          // Fetch parcel geometries for those parcels
          const parcelIds = Array.from(latestByParcel.keys());
          const { data: parcels, error: parcelError } = await supabase
            .from('parcels')
            .select('id, name, boundary_wgs84')
            .in('id', parcelIds)
            .not('boundary_wgs84', 'is', null);

          if (parcelError || !parcels || parcels.length === 0) {
            geojson = buildDemoGeoJSON();
          } else {
            geojson = {
              type: 'FeatureCollection',
              features: (parcels as ParcelRow[]).map((parcel) => {
                const ndvi = latestByParcel.get(parcel.id)!;
                return {
                  type: 'Feature',
                  id: parcel.id,
                  properties: {
                    id: parcel.id,
                    name: parcel.name,
                    ndvi_mean: ndvi.ndvi_mean,
                    ndvi_min: ndvi.ndvi_min,
                    ndvi_max: ndvi.ndvi_max,
                    observation_date: ndvi.observation_date,
                    color: ndviColor(ndvi.ndvi_mean),
                  },
                  geometry: parcel.boundary_wgs84,
                };
              }),
            };
          }
        }
      }

      if (geojson.features.length === 0) return;

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        // NDVI fill layer
        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.65,
              0.45,
            ],
          },
        });

        // Hover interaction
        let hoveredId: string | number | undefined;

        (map as maplibregl.Map).on('mousemove', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            if (hoveredId !== undefined) {
              map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
            }
            hoveredId = e.features[0].id;
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId! }, { hover: true });
            map.getCanvas().style.cursor = 'pointer';
          }
        });

        (map as maplibregl.Map).on('mouseleave', FILL_LAYER_ID, () => {
          if (hoveredId !== undefined) {
            map.setFeatureState({ source: SOURCE_ID, id: hoveredId }, { hover: false });
          }
          hoveredId = undefined;
          map.getCanvas().style.cursor = '';
        });

        // Click to show NDVI popup
        (map as maplibregl.Map).on('click', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const props = feature.properties;
            const coords = e.lngLat;
            const mean = typeof props?.ndvi_mean === 'number' ? Number(props.ndvi_mean).toFixed(3) : '—';
            const min = typeof props?.ndvi_min === 'number' ? Number(props.ndvi_min).toFixed(3) : '—';
            const max = typeof props?.ndvi_max === 'number' ? Number(props.ndvi_max).toFixed(3) : '—';
            new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family: 'DM Sans', sans-serif;">
                  <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px; color: #e8f5e9;">
                    ${props?.name ?? 'Unnamed Parcel'} — NDVI
                  </p>
                  <p style="font-size: 12px; margin: 0 0 2px; color: #a3c9a8;">
                    Mean: <span style="font-family: 'DM Mono', monospace; color: ${ndviColor(props?.ndvi_mean ?? 0)};">${mean}</span>
                  </p>
                  <p style="font-size: 12px; margin: 0 0 2px; color: #a3c9a8;">
                    Min: <span style="font-family: 'DM Mono', monospace;">${min}</span>
                    &nbsp;&middot;&nbsp;
                    Max: <span style="font-family: 'DM Mono', monospace;">${max}</span>
                  </p>
                  <p style="font-size: 11px; margin: 2px 0 0; color: #5a8a62;">
                    ${props?.observation_date ?? ''}
                  </p>
                </div>`,
              )
              .addTo(map);
          }
        });

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('NDVILayer error:', err);
    }
  }, [map]);

  // Load NDVI data when map is ready
  useEffect(() => {
    if (!map) return;

    if (map.loaded()) {
      loadNDVI();
    } else {
      map.on('load', loadNDVI);
      return () => {
        map.off('load', loadNDVI);
      };
    }
  }, [map, loadNDVI]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('ndvi');
    const vis = visible ? 'visible' : 'none';
    [FILL_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  return null;
}
