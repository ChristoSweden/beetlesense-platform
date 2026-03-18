import { useEffect, useRef, useCallback, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { useMapStore } from '@/stores/mapStore';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

interface MultispectralLayerProps {
  map: maplibregl.Map | null;
}

/** Available spectral indices that can be toggled */
export type SpectralIndexName = 'ndvi' | 'ndre' | 'gndvi' | 'evi' | 'moisture';

const INDEX_CONFIG: Record<SpectralIndexName, {
  label: string;
  labelSv: string;
  colorStops: Array<{ value: number; color: string }>;
}> = {
  ndvi: {
    label: 'NDVI', labelSv: 'NDVI (vegetationsindex)',
    colorStops: [
      { value: 0.0, color: '#8B4513' },
      { value: 0.2, color: '#ef4444' },
      { value: 0.4, color: '#f59e0b' },
      { value: 0.6, color: '#84cc16' },
      { value: 0.8, color: '#22c55e' },
      { value: 1.0, color: '#065f46' },
    ],
  },
  ndre: {
    label: 'NDRE', labelSv: 'NDRE (klorofyll/tidig stress)',
    colorStops: [
      { value: 0.0, color: '#7c2d12' },
      { value: 0.15, color: '#dc2626' },
      { value: 0.3, color: '#fb923c' },
      { value: 0.45, color: '#fde047' },
      { value: 0.6, color: '#86efac' },
      { value: 0.8, color: '#14532d' },
    ],
  },
  gndvi: {
    label: 'GNDVI', labelSv: 'GNDVI (klorofyllkoncentration)',
    colorStops: [
      { value: 0.0, color: '#451a03' },
      { value: 0.3, color: '#b45309' },
      { value: 0.5, color: '#fbbf24' },
      { value: 0.7, color: '#4ade80' },
      { value: 0.9, color: '#166534' },
    ],
  },
  evi: {
    label: 'EVI', labelSv: 'EVI (förbättrat vegetationsindex)',
    colorStops: [
      { value: -0.2, color: '#7f1d1d' },
      { value: 0.0, color: '#b91c1c' },
      { value: 0.2, color: '#f97316' },
      { value: 0.4, color: '#eab308' },
      { value: 0.6, color: '#22c55e' },
      { value: 0.8, color: '#064e3b' },
    ],
  },
  moisture: {
    label: 'Moisture Stress', labelSv: 'Fuktighetsstress',
    colorStops: [
      { value: -0.3, color: '#1e3a5f' },
      { value: -0.1, color: '#3b82f6' },
      { value: 0.0, color: '#93c5fd' },
      { value: 0.1, color: '#fde047' },
      { value: 0.3, color: '#ef4444' },
      { value: 0.5, color: '#7f1d1d' },
    ],
  },
};

const SOURCE_ID = 'multispectral-source';
const FILL_LAYER_ID = 'multispectral-fill';

function interpolateColor(value: number, stops: Array<{ value: number; color: string }>): string {
  if (value <= stops[0].value) return stops[0].color;
  if (value >= stops[stops.length - 1].value) return stops[stops.length - 1].color;

  for (let i = 0; i < stops.length - 1; i++) {
    if (value >= stops[i].value && value <= stops[i + 1].value) {
      const t = (value - stops[i].value) / (stops[i + 1].value - stops[i].value);
      const c1 = hexToRgb(stops[i].color);
      const c2 = hexToRgb(stops[i + 1].color);
      if (!c1 || !c2) return stops[i].color;
      return `rgb(${Math.round(c1.r + (c2.r - c1.r) * t)},${Math.round(c1.g + (c2.g - c1.g) * t)},${Math.round(c1.b + (c2.b - c1.b) * t)})`;
    }
  }
  return stops[stops.length - 1].color;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function buildDemoGeoJSON(indexName: SpectralIndexName): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const config = INDEX_CONFIG[indexName];
  const gridSize = 0.0008;

  // Generate per-parcel grid with realistic index values
  const parcelValues: Record<string, { base: number; variance: number }> = {
    p1: { base: indexName === 'moisture' ? 0.15 : 0.45, variance: 0.15 },
    p2: { base: indexName === 'moisture' ? -0.05 : 0.78, variance: 0.08 },
    p3: { base: indexName === 'moisture' ? 0.02 : 0.72, variance: 0.10 },
  };

  for (const parcel of DEMO_PARCELS) {
    const pv = parcelValues[parcel.id];
    if (!pv) continue;

    const [lng, lat] = parcel.centroid;
    // 6x6 grid per parcel
    for (let gx = -3; gx < 3; gx++) {
      for (let gy = -3; gy < 3; gy++) {
        const cx = lng + gx * gridSize;
        const cy = lat + gy * gridSize;
        // Pseudo-random based on position
        const noise = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453 % 1;
        const value = pv.base + (noise - 0.5) * pv.variance * 2;

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [cx, cy], [cx + gridSize, cy],
              [cx + gridSize, cy + gridSize], [cx, cy + gridSize],
              [cx, cy],
            ]],
          },
          properties: {
            parcel_id: parcel.id,
            index_name: indexName,
            value: Math.round(value * 1000) / 1000,
            color: interpolateColor(value, config.colorStops),
          },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

export default function MultispectralLayer({ map }: MultispectralLayerProps) {
  const { visibleLayers } = useMapStore();
  const isVisible = visibleLayers.includes('multispectral');
  const [activeIndex, setActiveIndex] = useState<SpectralIndexName>('ndvi');
  const addedRef = useRef(false);

  // Expose setActiveIndex via store or context if needed
  // For now, defaults to NDVI

  const addLayer = useCallback(() => {
    if (!map || addedRef.current) return;

    const geojson = buildDemoGeoJSON(activeIndex);

    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.65,
      },
      layout: { visibility: isVisible ? 'visible' : 'none' },
    });

    addedRef.current = true;
  }, [map, isVisible, activeIndex]);

  useEffect(() => { addLayer(); }, [addLayer]);

  // Update data when index changes
  useEffect(() => {
    if (!map || !addedRef.current) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(buildDemoGeoJSON(activeIndex));
    }
  }, [map, activeIndex]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    map.setLayoutProperty(FILL_LAYER_ID, 'visibility', isVisible ? 'visible' : 'none');
  }, [map, isVisible]);

  return null;
}

export { INDEX_CONFIG };
