import { useEffect, useRef, useCallback, memo } from 'react';
import type maplibregl from 'maplibre-gl';
import { useMapStore } from '@/stores/mapStore';
import { DEMO_PARCELS } from '@/lib/demoData';

interface CrownHealthLayerProps {
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'crown-health-source';
const CIRCLE_LAYER_ID = 'crown-health-circles';
const LABEL_LAYER_ID = 'crown-health-labels';

/**
 * Crown Health color: 0 (dead/red) → 50 (stressed/yellow) → 100 (healthy/green)
 */
function healthColor(score: number): string {
  const s = Math.max(0, Math.min(100, score));
  if (s < 30) return '#ef4444';
  if (s < 50) return '#f97316';
  if (s < 65) return '#eab308';
  if (s < 80) return '#84cc16';
  return '#22c55e';
}

/**
 * Simulate individual tree crowns with multi-sensor health scores.
 * In production, this reads from tree_inventory table.
 */
function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  const treeData: Record<string, Array<{
    dx: number; dy: number;
    height: number; crownDiam: number;
    ndvi: number; ndre: number; tempAnomaly: number;
    species: string; healthScore: number;
    stressFlag: boolean; stressType?: string;
  }>> = {
    p1: [
      { dx: 0.001, dy: 0.002, height: 22, crownDiam: 6.5, ndvi: 0.42, ndre: 0.28, tempAnomaly: 2.1, species: 'Gran', healthScore: 32, stressFlag: true, stressType: 'beetle' },
      { dx: 0.003, dy: -0.001, height: 18, crownDiam: 5.2, ndvi: 0.51, ndre: 0.35, tempAnomaly: 1.6, species: 'Gran', healthScore: 45, stressFlag: true, stressType: 'beetle' },
      { dx: -0.002, dy: 0.003, height: 25, crownDiam: 7.1, ndvi: 0.78, ndre: 0.62, tempAnomaly: -0.2, species: 'Gran', healthScore: 85, stressFlag: false },
      { dx: 0.004, dy: 0.001, height: 20, crownDiam: 5.8, ndvi: 0.72, ndre: 0.55, tempAnomaly: 0.3, species: 'Tall', healthScore: 78, stressFlag: false },
      { dx: -0.001, dy: -0.002, height: 15, crownDiam: 4.3, ndvi: 0.65, ndre: 0.48, tempAnomaly: 0.8, species: 'Björk', healthScore: 68, stressFlag: false },
      { dx: 0.005, dy: 0.003, height: 24, crownDiam: 6.8, ndvi: 0.38, ndre: 0.22, tempAnomaly: 2.5, species: 'Gran', healthScore: 25, stressFlag: true, stressType: 'beetle' },
    ],
    p2: [
      { dx: 0.001, dy: 0.001, height: 28, crownDiam: 7.5, ndvi: 0.85, ndre: 0.71, tempAnomaly: -0.3, species: 'Gran', healthScore: 92, stressFlag: false },
      { dx: -0.002, dy: 0.002, height: 26, crownDiam: 7.0, ndvi: 0.82, ndre: 0.68, tempAnomaly: 0.1, species: 'Tall', healthScore: 88, stressFlag: false },
      { dx: 0.003, dy: -0.001, height: 22, crownDiam: 6.2, ndvi: 0.79, ndre: 0.64, tempAnomaly: 0.2, species: 'Gran', healthScore: 84, stressFlag: false },
      { dx: -0.001, dy: -0.002, height: 12, crownDiam: 4.0, ndvi: 0.88, ndre: 0.73, tempAnomaly: -0.5, species: 'Björk', healthScore: 95, stressFlag: false },
    ],
    p3: [
      { dx: 0.002, dy: 0.001, height: 24, crownDiam: 6.5, ndvi: 0.74, ndre: 0.58, tempAnomaly: 0.5, species: 'Gran', healthScore: 72, stressFlag: false },
      { dx: -0.001, dy: 0.003, height: 20, crownDiam: 5.5, ndvi: 0.68, ndre: 0.50, tempAnomaly: 1.1, species: 'Gran', healthScore: 58, stressFlag: true, stressType: 'drought' },
      { dx: 0.003, dy: -0.002, height: 30, crownDiam: 8.0, ndvi: 0.81, ndre: 0.66, tempAnomaly: 0.0, species: 'Tall', healthScore: 86, stressFlag: false },
      { dx: -0.003, dy: 0.001, height: 18, crownDiam: 5.0, ndvi: 0.76, ndre: 0.60, tempAnomaly: 0.3, species: 'Gran', healthScore: 76, stressFlag: false },
    ],
  };

  let treeNumber = 1;
  for (const parcel of DEMO_PARCELS) {
    const trees = treeData[parcel.id];
    if (!trees) continue;

    const [lng, lat] = parcel.center;
    for (const tree of trees) {
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng + tree.dx, lat + tree.dy] },
        properties: {
          tree_id: `tree-${treeNumber}`,
          tree_number: treeNumber,
          parcel_id: parcel.id,
          parcel_name: parcel.name,
          species: tree.species,
          height_m: tree.height,
          crown_diameter_m: tree.crownDiam,
          ndvi: tree.ndvi,
          ndre: tree.ndre,
          temp_anomaly: tree.tempAnomaly,
          health_score: tree.healthScore,
          stress_flag: tree.stressFlag,
          stress_type: tree.stressType ?? null,
          color: healthColor(tree.healthScore),
          radius: Math.max(4, tree.crownDiam * 1.2),
        },
      });
      treeNumber++;
    }
  }

  return { type: 'FeatureCollection', features };
}

function CrownHealthLayer({ map }: CrownHealthLayerProps) {
  const { visibleLayers } = useMapStore();
  const isVisible = visibleLayers.includes('crown-health');
  const addedRef = useRef(false);

  const addLayer = useCallback(() => {
    if (!map || addedRef.current) return;

    const geojson = buildDemoGeoJSON();
    map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

    // Circle layer — crown circles sized by crown diameter, colored by health
    map.addLayer({
      id: CIRCLE_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-color': ['get', 'color'],
        'circle-radius': [
          'interpolate', ['linear'], ['zoom'],
          12, ['get', 'radius'],
          16, ['*', ['get', 'radius'], 3],
          20, ['*', ['get', 'radius'], 6],
        ],
        'circle-opacity': 0.7,
        'circle-stroke-width': [
          'case',
          ['get', 'stress_flag'], 2,
          0.5,
        ],
        'circle-stroke-color': [
          'case',
          ['get', 'stress_flag'], '#ef4444',
          'rgba(255,255,255,0.3)',
        ],
      },
      layout: { visibility: isVisible ? 'visible' : 'none' },
    });

    // Labels at high zoom
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: 'symbol',
      source: SOURCE_ID,
      minzoom: 16,
      layout: {
        'text-field': ['concat', ['get', 'health_score'], '%'],
        'text-size': 11,
        'text-font': ['Open Sans Bold'],
        visibility: isVisible ? 'visible' : 'none',
      },
      paint: {
        'text-color': '#ffffff',
        'text-halo-color': 'rgba(0,0,0,0.7)',
        'text-halo-width': 1,
      },
    });

    addedRef.current = true;
  }, [map, isVisible]);

  useEffect(() => { addLayer(); }, [addLayer]);

  useEffect(() => {
    if (!map || !addedRef.current) return;
    const vis = isVisible ? 'visible' : 'none';
    map.setLayoutProperty(CIRCLE_LAYER_ID, 'visibility', vis);
    map.setLayoutProperty(LABEL_LAYER_ID, 'visibility', vis);
  }, [map, isVisible]);

  return null;
}

export default memo(CrownHealthLayer);
