import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';

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
const LINE_LAYER_ID = 'drone-paths-line';

function statusColor(status: string): string {
  switch (status) {
    case 'processing':
    case 'validating':
    case 'pending':
      return '#60a5fa'; // blue for active
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

export function DronePathsLayer({ map }: DronePathsLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);

  const loadDronePaths = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      const { data, error } = await supabase
        .from('survey_uploads')
        .select('id, survey_id, status, metadata, geo_bounds')
        .in('upload_type', ['flight_log', 'drone_rgb', 'drone_multispectral', 'drone_lidar']);

      if (error) {
        console.warn('Failed to load drone paths:', error.message);
        return;
      }

      if (!data || data.length === 0) return;

      const features: GeoJSON.Feature[] = [];

      for (const row of data as SurveyUploadRow[]) {
        // Try to extract GPS track from metadata
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
          // Fall back to geo_bounds outline as a line ring
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

      if (features.length === 0) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      };

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        // Dashed line layer for flight paths
        map.addLayer({
          id: LINE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.5,
            'line-opacity': 0.8,
            'line-dasharray': [3, 2],
          },
        });

        // Hover interaction
        (map as maplibregl.Map).on('mouseenter', LINE_LAYER_ID, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        (map as maplibregl.Map).on('mouseleave', LINE_LAYER_ID, () => {
          map.getCanvas().style.cursor = '';
        });

        // Click popup
        (map as maplibregl.Map).on('click', LINE_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const props = feature.properties;
            const status = props?.status ?? 'unknown';
            const coords = e.lngLat;
            new maplibregl.Popup({ closeButton: true, maxWidth: '260px' })
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family: 'DM Sans', sans-serif;">
                  <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px; color: #e8f5e9;">
                    Drone Flight Path
                  </p>
                  <p style="font-size: 12px; margin: 0 0 2px; color: #a3c9a8;">
                    Survey: <span style="font-family: 'DM Mono', monospace;">${props?.survey_id?.slice(0, 8) ?? '—'}…</span>
                  </p>
                  <p style="font-size: 12px; margin: 0; color: #a3c9a8;">
                    Status: <span style="color: ${statusColor(status)}; font-weight: 600;">${status}</span>
                  </p>
                </div>`,
              )
              .addTo(map);
          }
        });

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
    [LINE_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  return null;
}
