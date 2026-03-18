import { useEffect, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/stores/mapStore';
import { useTranslation } from 'react-i18next';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import {
  ZONE_COLORS,
  type RegulatoryZoneType,
} from '@/hooks/useRegulatoryData';

interface RegulatoryLayerProps {
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'regulatory-source';
const FILL_LAYER_ID = 'regulatory-fill';
const STROKE_LAYER_ID = 'regulatory-stroke';
const PATTERN_LAYER_ID = 'regulatory-pattern';

// Human-readable zone type labels (uses i18n keys)
const ZONE_TYPE_KEYS: Record<RegulatoryZoneType, string> = {
  nyckelbiotop: 'regulatory.types.nyckelbiotop',
  natura2000: 'regulatory.types.natura2000',
  strandskydd: 'regulatory.types.strandskydd',
  vattenskydd: 'regulatory.types.vattenskydd',
  avverkningsanmalan: 'regulatory.types.avverkningsanmalan',
};

function _strokeDashArray(type: RegulatoryZoneType): number[] {
  switch (type) {
    case 'nyckelbiotop':
      return [4, 4]; // hatched
    case 'avverkningsanmalan':
      return [6, 3]; // dashed
    default:
      return [1, 0]; // solid
  }
}

function _fillOpacity(type: RegulatoryZoneType): number {
  switch (type) {
    case 'natura2000':
      return 0.18;
    case 'strandskydd':
      return 0.12;
    case 'vattenskydd':
      return 0.15;
    case 'nyckelbiotop':
      return 0.2;
    case 'avverkningsanmalan':
      return 0.08;
    default:
      return 0.12;
  }
}

// Build demo GeoJSON for all regulatory zones across all demo parcels
function buildDemoGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const parcel of DEMO_PARCELS) {
    const center = parcel.center;

    const makePolygon = (offsetLng: number, offsetLat: number, size: number): GeoJSON.Geometry => ({
      type: 'Polygon',
      coordinates: [[
        [center[0] + offsetLng, center[1] + offsetLat],
        [center[0] + offsetLng + size, center[1] + offsetLat],
        [center[0] + offsetLng + size, center[1] + offsetLat + size * 0.6],
        [center[0] + offsetLng, center[1] + offsetLat + size * 0.6],
        [center[0] + offsetLng, center[1] + offsetLat],
      ]],
    });

    if (parcel.id === 'p1') {
      features.push(
        {
          type: 'Feature',
          properties: {
            id: 'rz-p1-1',
            type: 'nyckelbiotop',
            name: 'Nyckelbiotop N-4521',
            color: ZONE_COLORS.nyckelbiotop,
            parcelName: parcel.name,
          },
          geometry: makePolygon(-0.005, 0.002, 0.008),
        },
        {
          type: 'Feature',
          properties: {
            id: 'rz-p1-2',
            type: 'avverkningsanmalan',
            name: 'Avverkningsanmälan krävs',
            color: ZONE_COLORS.avverkningsanmalan,
            parcelName: parcel.name,
          },
          geometry: makePolygon(-0.01, -0.005, 0.02),
        },
      );
    }

    if (parcel.id === 'p2') {
      features.push(
        {
          type: 'Feature',
          properties: {
            id: 'rz-p2-1',
            type: 'natura2000',
            name: 'Natura 2000 — Ekbackens lövskogsområde',
            color: ZONE_COLORS.natura2000,
            parcelName: parcel.name,
          },
          geometry: makePolygon(-0.003, -0.002, 0.01),
        },
        {
          type: 'Feature',
          properties: {
            id: 'rz-p2-2',
            type: 'strandskydd',
            name: 'Strandskydd — Gislaån',
            color: ZONE_COLORS.strandskydd,
            parcelName: parcel.name,
          },
          geometry: makePolygon(-0.008, 0.003, 0.016),
        },
      );
    }

    if (parcel.id === 'p3') {
      features.push({
        type: 'Feature',
        properties: {
          id: 'rz-p3-1',
          type: 'vattenskydd',
          name: 'Vattenskyddsområde — Jönköpings kommun',
          color: ZONE_COLORS.vattenskydd,
          parcelName: parcel.name,
        },
        geometry: makePolygon(-0.006, -0.004, 0.012),
      });
    }

    if (parcel.id === 'p4') {
      features.push(
        {
          type: 'Feature',
          properties: {
            id: 'rz-p4-1',
            type: 'nyckelbiotop',
            name: 'Nyckelbiotop N-4602',
            color: ZONE_COLORS.nyckelbiotop,
            parcelName: parcel.name,
          },
          geometry: makePolygon(0.002, 0.001, 0.006),
        },
        {
          type: 'Feature',
          properties: {
            id: 'rz-p4-2',
            type: 'avverkningsanmalan',
            name: 'Avverkningsanmälan krävs',
            color: ZONE_COLORS.avverkningsanmalan,
            parcelName: parcel.name,
          },
          geometry: makePolygon(-0.008, -0.005, 0.016),
        },
        {
          type: 'Feature',
          properties: {
            id: 'rz-p4-3',
            type: 'strandskydd',
            name: 'Strandskydd — Lagan',
            color: ZONE_COLORS.strandskydd,
            parcelName: parcel.name,
          },
          geometry: makePolygon(-0.01, 0.003, 0.012),
        },
      );
    }
  }

  return { type: 'FeatureCollection', features };
}

export function RegulatoryLayer({ map }: RegulatoryLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);
  const { t } = useTranslation();

  const loadRegulatory = useCallback(async () => {
    if (!map || loadedRef.current) return;

    try {
      let geojson: GeoJSON.FeatureCollection;

      if (isDemo() || !isSupabaseConfigured) {
        geojson = buildDemoGeoJSON();
      } else {
        const { data, error } = await supabase
          .from('regulatory_zones')
          .select('id, zone_type, name, geometry_wgs84, parcel_id, parcels(name)')
          .not('geometry_wgs84', 'is', null);

        if (error) {
          console.warn('Failed to load regulatory zones:', error.message);
          return;
        }

        if (!data || data.length === 0) return;

        geojson = {
          type: 'FeatureCollection',
          features: data.map((row: Record<string, unknown>) => ({
            type: 'Feature',
            properties: {
              id: row.id,
              type: row.zone_type,
              name: row.name,
              color: ZONE_COLORS[(row.zone_type as RegulatoryZoneType)] ?? '#888',
              parcelName: ((row.parcels as Record<string, unknown> | null)?.name as string) ?? '',
            },
            geometry: row.geometry_wgs84 as GeoJSON.Geometry,
          })),
        };
      }

      if (geojson.features.length === 0) return;

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: geojson,
          generateId: true,
        });

        // Semi-transparent fill layer — color varies by zone type
        map.addLayer({
          id: FILL_LAYER_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': [
              'match',
              ['get', 'type'],
              'nyckelbiotop', 0.2,
              'natura2000', 0.18,
              'strandskydd', 0.12,
              'vattenskydd', 0.15,
              'avverkningsanmalan', 0.08,
              0.12,
            ],
          },
        });

        // Stroke layer with dashing per type
        map.addLayer({
          id: STROKE_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': ['get', 'color'],
            'line-width': [
              'case',
              ['boolean', ['feature-state', 'hover'], false],
              3,
              2,
            ],
            'line-opacity': 0.85,
          },
          layout: {
            // Use dashed lines for nyckelbiotop and avverkningsanmälan
          },
        });

        // Additional patterned stroke for nyckelbiotop (hatched effect via extra dashed line)
        map.addLayer({
          id: PATTERN_LAYER_ID,
          type: 'line',
          source: SOURCE_ID,
          filter: ['in', ['get', 'type'], ['literal', ['nyckelbiotop', 'avverkningsanmalan']]],
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1,
            'line-opacity': 0.6,
            'line-dasharray': [4, 4],
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

        // Click popup with zone details
        (map as maplibregl.Map).on('click', FILL_LAYER_ID, (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const props = feature.properties;
            const zoneType = props?.type as RegulatoryZoneType;
            const zoneColor = ZONE_COLORS[zoneType] ?? '#888';
            const typeLabel = t(ZONE_TYPE_KEYS[zoneType] ?? 'regulatory.types.unknown');
            const coords = e.lngLat;

            new maplibregl.Popup({ closeButton: true, maxWidth: '300px' })
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family: 'DM Sans', sans-serif;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: ${zoneColor};"></span>
                    <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: ${zoneColor};">
                      ${typeLabel}
                    </span>
                  </div>
                  <p style="font-weight: 600; font-size: 13px; margin: 0 0 4px; color: #e8f5e9;">
                    ${props?.name ?? 'Regulatory Zone'}
                  </p>
                  <p style="font-size: 11px; margin: 0; color: #a3c9a8;">
                    ${t('regulatory.parcel')}: ${props?.parcelName ?? '—'}
                  </p>
                </div>`,
              )
              .addTo(map);
          }
        });

        loadedRef.current = true;
      }
    } catch (err) {
      console.error('RegulatoryLayer error:', err);
    }
  }, [map, t]);

  // Load zones when map is ready
  useEffect(() => {
    if (!map) return;

    if (map.loaded()) {
      loadRegulatory();
    } else {
      map.on('load', loadRegulatory);
      return () => {
        map.off('load', loadRegulatory);
      };
    }
  }, [map, loadRegulatory]);

  // Toggle visibility
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('regulatory');
    const vis = visible ? 'visible' : 'none';
    [FILL_LAYER_ID, STROKE_LAYER_ID, PATTERN_LAYER_ID].forEach((id) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, 'visibility', vis);
      }
    });
  }, [map, visibleLayers]);

  return null;
}
