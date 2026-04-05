import { useEffect, useRef, useCallback, memo } from 'react';
import type maplibregl from 'maplibre-gl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

interface ThermalLayerProps {
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'thermal-source';
const FILL_LAYER_ID = 'thermal-fill';

/**
 * Color gradient for thermal anomalies:
 * Blue (cold/healthy) → White (normal) → Yellow → Red (hot/stressed)
 */
function anomalyColor(zscore: number): string {
  const clamped = Math.max(-3, Math.min(3, zscore));

  if (clamped <= -1) {
    // Blue → Cyan (very cool)
    const t = (clamped + 3) / 2;
    return `rgb(${Math.round(30 + 50 * t)}, ${Math.round(100 + 100 * t)}, ${Math.round(200 + 55 * t)})`;
  }
  if (clamped <= 0.5) {
    // Cyan → Green (normal range)
    const t = (clamped + 1) / 1.5;
    return `rgb(${Math.round(80 - 20 * t)}, ${Math.round(200 + 22 * t)}, ${Math.round(255 - 127 * t)})`;
  }
  if (clamped <= 1.5) {
    // Green → Yellow (mild stress)
    const t = (clamped - 0.5);
    return `rgb(${Math.round(60 + 190 * t)}, ${Math.round(222 - 18 * t)}, ${Math.round(128 - 108 * t)})`;
  }
  // Yellow → Red (severe stress / beetle indicator)
  const t = (clamped - 1.5) / 1.5;
  return `rgb(${Math.round(250)}, ${Math.round(204 - 160 * t)}, ${Math.round(20 + 10 * t)})`;
}

function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  const thermalData: Record<string, { centerTemp: number; anomalies: Array<{ dx: number; dy: number; zscore: number }> }> = {
    p1: {
      centerTemp: 24.5,
      anomalies: [
        { dx: 0.003, dy: 0.002, zscore: 2.4 },
        { dx: 0.005, dy: -0.001, zscore: 1.8 },
        { dx: -0.002, dy: 0.004, zscore: -0.3 },
        { dx: 0.001, dy: -0.003, zscore: 0.2 },
        { dx: -0.004, dy: 0.001, zscore: 2.1 },
      ],
    },
    p2: {
      centerTemp: 22.1,
      anomalies: [
        { dx: 0.002, dy: 0.001, zscore: -0.2 },
        { dx: -0.001, dy: 0.003, zscore: 0.1 },
        { dx: 0.004, dy: -0.002, zscore: 0.4 },
      ],
    },
    p3: {
      centerTemp: 23.3,
      anomalies: [
        { dx: 0.001, dy: 0.002, zscore: 0.8 },
        { dx: -0.003, dy: -0.001, zscore: 1.2 },
        { dx: 0.002, dy: 0.004, zscore: -0.5 },
        { dx: -0.001, dy: -0.003, zscore: 0.3 },
      ],
    },
  };

  for (const parcel of DEMO_PARCELS) {
    const data = thermalData[parcel.id];
    if (!data) continue;

    const [lng, lat] = parcel.center;
    for (const anomaly of data.anomalies) {
      const cellSize = 0.001;
      const cx = lng + anomaly.dx;
      const cy = lat + anomaly.dy;
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [cx - cellSize, cy - cellSize],
            [cx + cellSize, cy - cellSize],
            [cx + cellSize, cy + cellSize],
            [cx - cellSize, cy + cellSize],
            [cx - cellSize, cy - cellSize],
          ]],
        },
        properties: {
          parcel_id: parcel.id,
          parcel_name: parcel.name,
          zscore: anomaly.zscore,
          temp_c: data.centerTemp + anomaly.zscore * 1.5,
          color: anomalyColor(anomaly.zscore),
          label: anomaly.zscore > 1.5 ? 'Hotspot — möjlig barkborre' :
                 anomaly.zscore > 0.5 ? 'Förhöjd temperatur' :
                 anomaly.zscore < -1 ? 'Kyligare — skuggat' : 'Normal',
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

function ThermalLayer({ map }: ThermalLayerProps) {
  const { visibleLayers } = useMapStore();
  const isVisible = visibleLayers.includes('thermal');
  const addedRef = useRef(false);

  const addLayer = useCallback(async () => {
    if (!map || addedRef.current) return;

    let geojson: GeoJSON.FeatureCollection;

    if (isDemo() || !isSupabaseConfigured) {
      geojson = buildDemoGeoJSON();
    } else {
      const { data } = await supabase
        .from('sensor_products')
        .select('survey_id, parcel_id, metadata, storage_path')
        .eq('sensor_type', 'thermal')
        .eq('product_name', 'anomaly')
        .limit(50);

      geojson = { type: 'FeatureCollection', features: [] };
      // In production: fetch COG tiles and render as raster source
      // For now, show metadata-based markers
      if (data) {
        for (const row of data) {
          const stats = (row.metadata as Record<string, unknown>)?.stats as Record<string, number> | undefined;
          if (!stats) continue;
          geojson.features.push({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {
              survey_id: row.survey_id,
              parcel_id: row.parcel_id,
              mean_temp: stats.mean,
              hotspots: stats.hotspotCount,
            },
          });
        }
      }
    }

    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.6,
      },
      layout: { visibility: isVisible ? 'visible' : 'none' },
    });

    addedRef.current = true;
  }, [map, isVisible]);

  useEffect(() => { addLayer(); }, [addLayer]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    map.setLayoutProperty(FILL_LAYER_ID, 'visibility', isVisible ? 'visible' : 'none');
  }, [map, isVisible]);

  return null;
}

export default memo(ThermalLayer);
