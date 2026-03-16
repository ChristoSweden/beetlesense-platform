import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';

interface AlertsLayerProps {
  map: maplibregl.Map | null;
}

interface AlertParcelRow {
  id: string;
  name: string;
  status: string;
  centroid: GeoJSON.Geometry;
}

const SOURCE_ID = 'alerts-source';
const CIRCLE_LAYER_ID = 'alerts-circle';
const PULSE_LAYER_ID = 'alerts-pulse';

function alertColor(status: string): string {
  switch (status) {
    case 'at_risk':
      return '#f59e0b'; // amber
    case 'infested':
      return '#ef4444'; // red
    default:
      return '#f59e0b';
  }
}

export function AlertsLayer({ map }: AlertsLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      const { data, error } = await supabase
        .from('parcels')
        .select('id, name, status, centroid')
        .in('status', ['at_risk', 'infested'])
        .not('centroid', 'is', null);

      if (error) {
        console.warn('Failed to load alert parcels:', error.message);
        return;
      }

      if (!data || data.length === 0) return;

      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: (data as AlertParcelRow[]).map((parcel) => ({
          type: 'Feature',
          id: parcel.id,
          properties: {
            id: parcel.id,
            name: parcel.name,
            status: parcel.status,
            color: alertColor(parcel.status),
          },
          geometry: parcel.centroid,
        })),
      };

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        // Pulsing outer circle (animated via radius)
        map.addLayer({
          id: PULSE_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          paint: {
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.3,
            'circle-radius': 14,
            'circle-stroke-width': 0,
          },
        });

        // Inner solid circle
        map.addLayer({
          id: CIRCLE_LAYER_ID,
          type: 'circle',
          source: SOURCE_ID,
          paint: {
            'circle-color': ['get', 'color'],
            'circle-opacity': 0.9,
            'circle-radius': 7,
            'circle-stroke-color': '#030d05',
            'circle-stroke-width': 2,
          },
        });

        // Pulse animation
        let pulsePhase = 0;
        const animate = () => {
          pulsePhase = (pulsePhase + 0.03) % (2 * Math.PI);
          const pulseRadius = 14 + Math.sin(pulsePhase) * 6;
          const pulseOpacity = 0.3 - Math.sin(pulsePhase) * 0.15;

          if (map.getLayer(PULSE_LAYER_ID)) {
            map.setPaintProperty(PULSE_LAYER_ID, 'circle-radius', pulseRadius);
            map.setPaintProperty(PULSE_LAYER_ID, 'circle-opacity', Math.max(0.05, pulseOpacity));
          }

          animationRef.current = requestAnimationFrame(animate);
        };
        animationRef.current = requestAnimationFrame(animate);

        // Hover interaction
        (map as maplibregl.Map).on('mouseenter', CIRCLE_LAYER_ID, () => {
          map.getCanvas().style.cursor = 'pointer';
        });

        (map as maplibregl.Map).on('mouseleave', CIRCLE_LAYER_ID, () => {
          map.getCanvas().style.cursor = '';
        });

        // Click to show alert popup
        (map as maplibregl.Map).on('click', CIRCLE_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
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
                    ⚠ ${props?.name ?? 'Unnamed Parcel'}
                  </p>
                  <p style="font-size: 12px; margin: 0; color: #a3c9a8;">
                    Alert: <span style="color: ${alertColor(status)}; font-weight: 600;">${status === 'at_risk' ? 'At Risk' : 'Infested'}</span>
                  </p>
                </div>`,
              )
              .addTo(map);
          }
        });

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('AlertsLayer error:', err);
    }
  }, [map]);

  // Load alerts when map is ready
  useEffect(() => {
    if (!map) return;

    if (map.loaded()) {
      loadAlerts();
    } else {
      map.on('load', loadAlerts);
      return () => {
        map.off('load', loadAlerts);
      };
    }
  }, [map, loadAlerts]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('alerts');
    const vis = visible ? 'visible' : 'none';
    [CIRCLE_LAYER_ID, PULSE_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return null;
}
