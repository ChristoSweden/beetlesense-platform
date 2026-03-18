import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

interface DronePathsLayerProps {
  map: maplibregl.Map | null;
}

interface SurveyUploadRow {
  id: string;
  survey_id: string;
  status: string;
  metadata: {
    gps_track?: GeoJSON.Geometry;
    capture_metadata?: {
      gps_track?: GeoJSON.Geometry;
    };
  } | null;
  geo_bounds: GeoJSON.Geometry | null;
}

const SOURCE_ID = 'drone-paths-source';
const COMPLETED_LINE_LAYER_ID = 'drone-paths-completed';
const PLANNED_LINE_LAYER_ID = 'drone-paths-planned';

function statusColor(status: string): string {
  switch (status) {
    case 'processing':
    case 'validating':
    case 'pending':
    case 'planned':
      return '#60a5fa'; // blue for active/planned
    case 'ready':
    case 'completed':
      return '#4ade80'; // green for complete
    case 'error':
    case 'invalid':
      return '#ef4444'; // red for error
    default:
      return '#60a5fa';
  }
}

/**
 * Build demo drone flight paths — completed and planned missions around demo parcels.
 * Creates realistic lawnmower-pattern flight paths.
 */
function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  // Completed flight — lawnmower pattern over Norra Skogen (p1)
  const p1 = DEMO_PARCELS[0].center; // [14.04, 57.19]
  const completedPath1: [number, number][] = [];
  const rows = 6;
  const startLng = p1[0] - 0.008;
  const endLng = p1[0] + 0.008;
  const startLat = p1[1] - 0.005;
  const latStep = 0.002;
  for (let i = 0; i < rows; i++) {
    const lat = startLat + i * latStep;
    if (i % 2 === 0) {
      completedPath1.push([startLng, lat], [endLng, lat]);
    } else {
      completedPath1.push([endLng, lat], [startLng, lat]);
    }
  }
  features.push({
    type: 'Feature',
    properties: {
      id: 'dp-1',
      survey_id: 's1',
      status: 'completed',
      color: statusColor('completed'),
      name: 'Spring Beetle Assessment — Norra Skogen',
      date: '2026-03-10',
    },
    geometry: { type: 'LineString', coordinates: completedPath1 },
  });

  // Completed flight — Granudden (p4)
  const p4 = DEMO_PARCELS[3].center; // [14.10, 57.22]
  const completedPath2: [number, number][] = [];
  const startLng2 = p4[0] - 0.006;
  const endLng2 = p4[0] + 0.006;
  const startLat2 = p4[1] - 0.004;
  for (let i = 0; i < 5; i++) {
    const lat = startLat2 + i * 0.002;
    if (i % 2 === 0) {
      completedPath2.push([startLng2, lat], [endLng2, lat]);
    } else {
      completedPath2.push([endLng2, lat], [startLng2, lat]);
    }
  }
  features.push({
    type: 'Feature',
    properties: {
      id: 'dp-2',
      survey_id: 's3',
      status: 'completed',
      color: statusColor('completed'),
      name: 'Emergency Survey — Granudden',
      date: '2026-03-08',
    },
    geometry: { type: 'LineString', coordinates: completedPath2 },
  });

  // Planned flight — Tallmon (p3)
  const p3 = DEMO_PARCELS[2].center; // [14.16, 57.78]
  const plannedPath1: [number, number][] = [];
  const startLng3 = p3[0] - 0.01;
  const endLng3 = p3[0] + 0.01;
  const startLat3 = p3[1] - 0.006;
  for (let i = 0; i < 7; i++) {
    const lat = startLat3 + i * 0.002;
    if (i % 2 === 0) {
      plannedPath1.push([startLng3, lat], [endLng3, lat]);
    } else {
      plannedPath1.push([endLng3, lat], [startLng3, lat]);
    }
  }
  features.push({
    type: 'Feature',
    properties: {
      id: 'dp-3',
      survey_id: 's4',
      status: 'planned',
      color: statusColor('planned'),
      name: 'Tallmon Full Inventory (planned)',
      date: '2026-03-20',
    },
    geometry: { type: 'LineString', coordinates: plannedPath1 },
  });

  // Planned flight — Ekbacken (p2)
  const p2 = DEMO_PARCELS[1].center; // [13.53, 57.30]
  const plannedPath2: [number, number][] = [];
  const startLng4 = p2[0] - 0.005;
  const endLng4 = p2[0] + 0.005;
  const startLat4 = p2[1] - 0.003;
  for (let i = 0; i < 4; i++) {
    const lat = startLat4 + i * 0.002;
    if (i % 2 === 0) {
      plannedPath2.push([startLng4, lat], [endLng4, lat]);
    } else {
      plannedPath2.push([endLng4, lat], [startLng4, lat]);
    }
  }
  features.push({
    type: 'Feature',
    properties: {
      id: 'dp-4',
      survey_id: 's5',
      status: 'planned',
      color: statusColor('planned'),
      name: 'Q2 Health Check — Ekbacken (planned)',
      date: '2026-03-25',
    },
    geometry: { type: 'LineString', coordinates: plannedPath2 },
  });

  return { type: 'FeatureCollection', features };
}

export function DronePathsLayer({ map }: DronePathsLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);

  const loadDronePaths = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      let geojson: GeoJSON.FeatureCollection;

      if (isDemo() || !isSupabaseConfigured) {
        geojson = buildDemoGeoJSON();
      } else {
        const { data, error } = await supabase
          .from('survey_uploads')
          .select('id, survey_id, status, metadata, geo_bounds')
          .in('upload_type', ['flight_log', 'drone_rgb', 'drone_multispectral', 'drone_lidar']);

        if (error) {
          console.warn('Failed to load drone paths, falling back to demo:', error.message);
          geojson = buildDemoGeoJSON();
        } else if (!data || data.length === 0) {
          geojson = buildDemoGeoJSON();
        } else {
          const features: GeoJSON.Feature[] = [];

          for (const row of data as SurveyUploadRow[]) {
            const gpsTrack =
              row.metadata?.gps_track ??
              row.metadata?.capture_metadata?.gps_track ??
              null;

            if (gpsTrack) {
              features.push({
                type: 'Feature',
                properties: {
                  id: row.id,
                  survey_id: row.survey_id,
                  status: row.status,
                  color: statusColor(row.status),
                },
                geometry: gpsTrack,
              });
            } else if (row.geo_bounds) {
              features.push({
                type: 'Feature',
                properties: {
                  id: row.id,
                  survey_id: row.survey_id,
                  status: row.status,
                  color: statusColor(row.status),
                },
                geometry: row.geo_bounds,
              });
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

        // Completed paths — solid green line
        map.addLayer({
          id: COMPLETED_LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['==', ['get', 'status'], 'completed'],
          paint: {
            'line-color': '#4ade80',
            'line-width': 2.5,
            'line-opacity': 0.85,
          },
        });

        // Planned paths — dashed blue line
        map.addLayer({
          id: PLANNED_LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['!=', ['get', 'status'], 'completed'],
          paint: {
            'line-color': '#60a5fa',
            'line-width': 2,
            'line-opacity': 0.7,
            'line-dasharray': [4, 3],
          },
        });

        // Hover interaction
        const lineLayerIds = [COMPLETED_LINE_LAYER_ID, PLANNED_LINE_LAYER_ID];
        for (const layerId of lineLayerIds) {
          (map as maplibregl.Map).on('mouseenter', layerId, () => {
            map.getCanvas().style.cursor = 'pointer';
          });

          (map as maplibregl.Map).on('mouseleave', layerId, () => {
            map.getCanvas().style.cursor = '';
          });

          // Click popup
          (map as maplibregl.Map).on('click', layerId, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
            if (e.features && e.features.length > 0) {
              const feature = e.features[0];
              const props = feature.properties;
              const status = props?.status ?? 'unknown';
              const coords = e.lngLat;
              new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
                .setLngLat(coords)
                .setHTML(
                  `<div style="font-family: 'DM Sans', sans-serif;">
                    <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px; color: #e8f5e9;">
                      Drone Flight Path
                    </p>
                    ${props?.name ? `<p style="font-size: 12px; margin: 0 0 2px; color: #a3c9a8;">${props.name}</p>` : ''}
                    <p style="font-size: 12px; margin: 0 0 2px; color: #a3c9a8;">
                      Status: <span style="color: ${statusColor(status)}; font-weight: 600;">${status}</span>
                    </p>
                    ${props?.date ? `<p style="font-size: 11px; margin: 2px 0 0; color: #5a8a62;">${props.date}</p>` : ''}
                  </div>`,
                )
                .addTo(map);
            }
          });
        }

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('DronePathsLayer error:', err);
    }
  }, [map]);

  // Load drone paths when map is ready
  useEffect(() => {
    if (!map) return;

    if (map.loaded()) {
      loadDronePaths();
    } else {
      map.on('load', loadDronePaths);
      return () => {
        map.off('load', loadDronePaths);
      };
    }
  }, [map, loadDronePaths]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('drone-paths');
    const vis = visible ? 'visible' : 'none';
    [COMPLETED_LINE_LAYER_ID, PLANNED_LINE_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  return null;
}
