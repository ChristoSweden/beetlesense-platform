import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';
import { isDemo } from '@/lib/demoData';

interface RiskLayerProps {
  map: maplibregl.Map | null;
}

interface AnalysisRow {
  id: string;
  survey_id: string;
  result_summary: {
    severity?: string;
    risk_score?: number;
    risk_zones?: Array<{
      severity: string;
      risk_score: number;
      geometry?: GeoJSON.Geometry;
      area_ha?: number;
    }>;
  };
  result_geojson: GeoJSON.Geometry | null;
}

const SOURCE_ID = 'risk-source';
const FILL_LAYER_ID = 'risk-fill';
const STROKE_LAYER_ID = 'risk-stroke';
function severityColor(severity: string): string {
  switch (severity) {
    case 'none':
      return '#4ade80';
    case 'early':
      return '#facc15';
    case 'active':
      return '#f97316';
    case 'severe':
      return '#ef4444';
    default:
      return '#5a8a62';
  }
}

/**
 * Build demo risk zones as circles/polygons around Smaland area.
 * Uses demo parcel locations plus additional risk points.
 */
function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Risk zones based on demo parcels
  const riskData = [
    { id: 'rz-1', center: [14.04, 57.19], severity: 'active', risk_score: 0.72, area_ha: 8.5, label: 'NE sector — Norra Skogen' },
    { id: 'rz-2', center: [14.12, 57.225], severity: 'severe', risk_score: 0.91, area_ha: 14.2, label: 'Core zone — Granudden' },
    { id: 'rz-3', center: [14.08, 57.215], severity: 'severe', risk_score: 0.85, area_ha: 6.8, label: 'South spread — Granudden' },
    { id: 'rz-4', center: [13.53, 57.30], severity: 'none', risk_score: 0.08, area_ha: 3.1, label: 'Clear zone — Ekbacken' },
    { id: 'rz-5', center: [14.16, 57.78], severity: 'early', risk_score: 0.35, area_ha: 5.4, label: 'Watch zone — Tallmon' },
    { id: 'rz-6', center: [14.02, 57.185], severity: 'active', risk_score: 0.65, area_ha: 4.2, label: 'South edge — Norra Skogen' },
    { id: 'rz-7', center: [14.70, 57.65], severity: 'early', risk_score: 0.28, area_ha: 7.0, label: 'NW corner — Bjorklund' },
    { id: 'rz-8', center: [14.15, 57.20], severity: 'severe', risk_score: 0.88, area_ha: 10.3, label: 'Expansion front' },
  ];

  for (const zone of riskData) {
    const [lng, lat] = zone.center;
    const radius = Math.sqrt(zone.area_ha) * 0.002;

    // Create rough polygon (hexagon-like) for each risk zone
    const sides = 6;
    const coords: [number, number][] = [];
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * 2 * Math.PI;
      coords.push([
        lng + radius * Math.cos(angle) * 1.2,
        lat + radius * Math.sin(angle),
      ]);
    }

    features.push({
      type: 'Feature',
      properties: {
        id: zone.id,
        severity: zone.severity,
        risk_score: zone.risk_score,
        area_ha: zone.area_ha,
        color: severityColor(zone.severity),
        label: zone.label,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

export function RiskLayer({ map }: RiskLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);

  const loadRiskZones = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      let geojson: GeoJSON.FeatureCollection;

      if (isDemo() || !isSupabaseConfigured) {
        geojson = buildDemoGeoJSON();
      } else {
        const { data, error } = await supabase
          .from('analysis_results')
          .select('id, survey_id, result_summary, result_geojson')
          .eq('module', 'beetle_detection')
          .eq('status', 'complete');

        if (error) {
          console.warn('Failed to load risk zones, falling back to demo:', error.message);
          geojson = buildDemoGeoJSON();
        } else if (!data || data.length === 0) {
          geojson = buildDemoGeoJSON();
        } else {
          const features: GeoJSON.Feature[] = [];

          for (const row of data as AnalysisRow[]) {
            const summary = row.result_summary;

            if (row.result_geojson) {
              const severity = summary?.severity ?? 'unknown';
              const riskScore = summary?.risk_score ?? 0;
              features.push({
                type: 'Feature',
                id: row.id,
                properties: {
                  id: row.id,
                  severity,
                  risk_score: riskScore,
                  area_ha: summary?.risk_zones?.[0]?.area_ha ?? null,
                  color: severityColor(severity),
                },
                geometry: row.result_geojson,
              });
            }

            if (summary?.risk_zones && Array.isArray(summary.risk_zones)) {
              for (const zone of summary.risk_zones) {
                if (zone.geometry) {
                  features.push({
                    type: 'Feature',
                    properties: {
                      id: `${row.id}-${zone.severity}`,
                      severity: zone.severity,
                      risk_score: zone.risk_score,
                      area_ha: zone.area_ha ?? null,
                      color: severityColor(zone.severity),
                    },
                    geometry: zone.geometry,
                  });
                }
              }
            }
          }

          if (features.length === 0) {
            geojson = buildDemoGeoJSON();
          } else {
            geojson = { type: 'FeatureCollection', features };
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

        // Semi-transparent fill
        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.5,
              0.3,
            ],
          },
        });

        // Stroke
        map.addLayer({
          id: STROKE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              2.5,
              1.5,
            ],
            'line-opacity': 0.8,
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

        // Click to show risk popup
        (map as maplibregl.Map).on('click', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const props = feature.properties;
            const severity = props?.severity ?? 'unknown';
            const coords = e.lngLat;
            new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family: 'DM Sans', sans-serif;">
                  <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px; color: #e8f5e9;">
                    Beetle Risk Zone
                  </p>
                  ${props?.label ? `<p style="font-size: 11px; margin: 0 0 4px; color: #5a8a62;">${props.label}</p>` : ''}
                  <p style="font-size: 12px; margin: 0 0 2px; color: #a3c9a8;">
                    Severity: <span style="color: ${severityColor(severity)}; font-weight: 600;">${severity}</span>
                  </p>
                  <p style="font-size: 12px; margin: 0 0 2px; color: #a3c9a8;">
                    Risk score: <span style="font-family: 'DM Mono', monospace;">${typeof props?.risk_score === 'number' ? (Number(props.risk_score) * 100).toFixed(0) + '%' : '—'}</span>
                  </p>
                  ${props?.area_ha ? `<p style="font-size: 12px; margin: 0; color: #a3c9a8;">Area: <span style="font-family: 'DM Mono', monospace;">${Number(props.area_ha).toFixed(1)}</span> ha</p>` : ''}
                </div>`,
              )
              .addTo(map);
          }
        });

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('RiskLayer error:', err);
    }
  }, [map]);

  // Load risk zones when map is ready
  useEffect(() => {
    if (!map) return;

    if (map.loaded()) {
      loadRiskZones();
    } else {
      map.on('load', loadRiskZones);
      return () => {
        map.off('load', loadRiskZones);
      };
    }
  }, [map, loadRiskZones]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('risk');
    const vis = visible ? 'visible' : 'none';
    [FILL_LAYER_ID, STROKE_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  return null;
}
