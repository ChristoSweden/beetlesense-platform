import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

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
    case 'storm_damage':
      return '#60a5fa'; // blue
    case 'fire_risk':
      return '#f97316'; // orange
    default:
      return '#f59e0b';
  }
}

function alertLabel(status: string): string {
  switch (status) {
    case 'at_risk':
      return 'Bark Beetle — At Risk';
    case 'infested':
      return 'Bark Beetle — Active Infestation';
    case 'storm_damage':
      return 'Storm Damage Alert';
    case 'fire_risk':
      return 'Fire Risk Alert';
    default:
      return status;
  }
}

/**
 * Build demo alert points — active beetle/storm/fire alerts around Smaland.
 */
function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const alerts = [
    {
      id: 'alert-1',
      name: 'Norra Skogen',
      status: 'at_risk',
      lng: DEMO_PARCELS[0].center[0],
      lat: DEMO_PARCELS[0].center[1],
      detail: 'Elevated bark beetle pheromone levels detected. Monitor closely.',
    },
    {
      id: 'alert-2',
      name: 'Granudden',
      status: 'infested',
      lng: DEMO_PARCELS[3].center[0],
      lat: DEMO_PARCELS[3].center[1],
      detail: 'Active infestation confirmed. ~420 spruce trees affected. Immediate action needed.',
    },
    {
      id: 'alert-3',
      name: 'Granudden South',
      status: 'infested',
      lng: DEMO_PARCELS[3].center[0] + 0.005,
      lat: DEMO_PARCELS[3].center[1] - 0.003,
      detail: 'Infestation spreading southward. New bore holes found.',
    },
    {
      id: 'alert-4',
      name: 'Tallmon NW',
      status: 'storm_damage',
      lng: DEMO_PARCELS[2].center[0] - 0.01,
      lat: DEMO_PARCELS[2].center[1] + 0.005,
      detail: 'Wind damage from March storm. 12 windthrown spruce — beetle breeding risk.',
    },
  ];

  return {
    type: 'FeatureCollection',
    features: alerts.map((a) => ({
      type: 'Feature',
      id: a.id,
      properties: {
        id: a.id,
        name: a.name,
        status: a.status,
        color: alertColor(a.status),
        detail: a.detail,
      },
      geometry: {
        type: 'Point',
        coordinates: [a.lng, a.lat],
      },
    })),
  };
}

export function AlertsLayer({ map }: AlertsLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      let geojson: GeoJSON.FeatureCollection;

      if (isDemo() || !isSupabaseConfigured) {
        geojson = buildDemoGeoJSON();
      } else {
        const { data, error } = await supabase
          .from('parcels')
          .select('id, name, status, centroid')
          .in('status', ['at_risk', 'infested'])
          .not('centroid', 'is', null);

        if (error) {
          console.warn('Failed to load alert parcels, falling back to demo:', error.message);
          geojson = buildDemoGeoJSON();
        } else if (!data || data.length === 0) {
          geojson = buildDemoGeoJSON();
        } else {
          geojson = {
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
        }
      }

      if (geojson.features.length === 0) return;

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

        // Click to show alert popup with details
        (map as maplibregl.Map).on('click', CIRCLE_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const props = feature.properties;
            const status = props?.status ?? 'unknown';
            const coords = e.lngLat;
            new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family: 'DM Sans', sans-serif;">
                  <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px; color: #e8f5e9;">
                    ${props?.name ?? 'Unnamed Parcel'}
                  </p>
                  <p style="font-size: 12px; margin: 0 0 4px; color: #a3c9a8;">
                    Alert: <span style="color: ${alertColor(status)}; font-weight: 600;">${alertLabel(status)}</span>
                  </p>
                  ${props?.detail ? `<p style="font-size: 11px; margin: 0; color: #5a8a62; line-height: 1.4;">${props.detail}</p>` : ''}
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
