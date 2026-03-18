import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useMapStore } from '@/stores/mapStore';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';

interface ParcelLayerProps {
  map: maplibregl.Map | null;
}

interface ParcelRow {
  id: string;
  name: string;
  area_ha: number;
  status: string;
  boundary_wgs84: GeoJSON.Geometry;
}

const SOURCE_ID = 'parcels-source';
const FILL_LAYER_ID = 'parcels-fill';
const STROKE_LAYER_ID = 'parcels-stroke';
const HIGHLIGHT_LAYER_ID = 'parcels-highlight';

function statusColor(status: string): string {
  switch (status) {
    case 'healthy':
      return '#4ade80';
    case 'at_risk':
      return '#fbbf24';
    case 'infested':
      return '#ef4444';
    default:
      return '#5a8a62';
  }
}

/**
 * Build demo parcel polygons from DEMO_PARCELS center coordinates.
 * Creates realistic-sized polygons around each parcel center.
 */
function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = DEMO_PARCELS.map((parcel) => {
    const [lng, lat] = parcel.center;
    // Scale polygon size roughly by area (sqrt for visual proportion)
    const size = Math.sqrt(parcel.area_hectares) * 0.0008;
    const w = size;
    const h = size * 0.7;

    return {
      type: 'Feature',
      id: parcel.id,
      properties: {
        id: parcel.id,
        name: parcel.name,
        area_ha: parcel.area_hectares,
        status: parcel.status,
        color: statusColor(parcel.status),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [lng - w, lat - h],
          [lng + w, lat - h],
          [lng + w * 0.8, lat + h * 0.5],
          [lng + w, lat + h],
          [lng - w * 0.3, lat + h],
          [lng - w, lat - h],
        ]],
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

export function ParcelLayer({ map }: ParcelLayerProps) {
  const { selectedParcelId, selectParcel, visibleLayers } = useMapStore();
  const loadedRef = useRef(false);

  const loadParcels = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      let geojson: GeoJSON.FeatureCollection;

      if (isDemo() || !isSupabaseConfigured) {
        geojson = buildDemoGeoJSON();
      } else {
        const { data, error } = await supabase
          .from('parcels')
          .select('id, name, area_ha, status, boundary_wgs84')
          .not('boundary_wgs84', 'is', null);

        if (error) {
          console.warn('Failed to load parcels, falling back to demo:', error.message);
          geojson = buildDemoGeoJSON();
        } else if (!data || data.length === 0) {
          geojson = buildDemoGeoJSON();
        } else {
          geojson = {
            type: 'FeatureCollection',
            features: (data as ParcelRow[]).map((parcel) => ({
              type: 'Feature',
              id: parcel.id,
              properties: {
                id: parcel.id,
                name: parcel.name,
                area_ha: parcel.area_ha,
                status: parcel.status,
                color: statusColor(parcel.status),
              },
              geometry: parcel.boundary_wgs84,
            })),
          };
        }
      }

      if (geojson.features.length === 0) return;

      // Add source
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        // Fill layer
        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              0.3,
              0.15,
            ],
          },
        });

        // Stroke layer
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

        // Highlight selected parcel
        map.addLayer({
          id: HIGHLIGHT_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': '#4ade80',
            'line-width': 3,
            'line-opacity': 1,
          },
          filter: ['==', ['get', 'id'], ''],
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

        // Click to select
        (map as maplibregl.Map).on('click', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const parcelId = feature.properties?.id;
            selectParcel(parcelId);

            // Show popup
            const coords = e.lngLat;
            new maplibregl.Popup({ closeButton: true, maxWidth: '280px' })
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family: 'DM Sans', sans-serif;">
                  <p style="font-weight: 600; font-size: 14px; margin: 0 0 4px; color: #e8f5e9;">
                    ${feature.properties?.name ?? 'Unnamed Parcel'}
                  </p>
                  <p style="font-size: 12px; margin: 0; color: #a3c9a8;">
                    <span style="font-family: 'DM Mono', monospace;">${typeof feature.properties?.area_ha === 'number' ? Number(feature.properties.area_ha).toFixed(1) : '—'}</span> ha
                    &nbsp;&middot;&nbsp;
                    <span style="color: ${statusColor(feature.properties?.status ?? 'unknown')};">
                      ${feature.properties?.status ?? 'unknown'}
                    </span>
                  </p>
                </div>`,
              )
              .addTo(map);
          }
        });

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('ParcelLayer error:', err);
    }
  }, [map, selectParcel]);

  // Load parcels when map is ready
  useEffect(() => {
    if (!map) return;

    if (map.loaded()) {
      loadParcels();
    } else {
      map.on('load', loadParcels);
      return () => {
        map.off('load', loadParcels);
      };
    }
  }, [map, loadParcels]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('parcels');
    const vis = visible ? 'visible' : 'none';
    [FILL_LAYER_ID, STROKE_LAYER_ID, HIGHLIGHT_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  // Update highlight filter when selection changes
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    if (map.getLayer(HIGHLIGHT_LAYER_ID)) {
      map.setFilter(HIGHLIGHT_LAYER_ID, ['==', ['get', 'id'], selectedParcelId ?? '']);
    }
  }, [map, selectedParcelId]);

  return null;
}
