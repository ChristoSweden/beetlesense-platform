import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useMapStore } from '@/stores/mapStore';

interface SatelliteLayerProps {
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'satellite-tiles-source';
const RASTER_LAYER_ID = 'satellite-tiles-raster';

// Sentinel-2 Cloudless by EOX — free satellite basemap
const SENTINEL2_TILES = [
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
];

export function SatelliteLayer({ map }: SatelliteLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);

  // Add satellite source and layer when map is ready
  useEffect(() => {
    if (!map) return;

    const addSatelliteLayer = () => {
      if (loadedRef.current) return;

      try {
        if (!map.getSource(SOURCE_ID)) {
          map.addSource(SOURCE_ID, {
            type: 'raster',
            tiles: SENTINEL2_TILES,
            tileSize: 256,
            attribution:
              '&copy; <a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX</a>',
            maxzoom: 15,
          });

          // Insert satellite raster below all other overlay layers (but above the base tiles)
          // Find the first non-background, non-raster layer to insert before
          const layers = map.getStyle().layers;
          let beforeId: string | undefined;
          for (const layer of layers) {
            if (layer.id !== 'background' && layer.id !== 'osm-raster') {
              beforeId = layer.id;
              break;
            }
          }

          map.addLayer(
            {
              id: RASTER_LAYER_ID,
              type: 'raster',
              source: SOURCE_ID,
              paint: {
                'raster-opacity': 1,
              },
            },
            beforeId,
          );

          loadedRef.current = true;
        }
      } catch (err) {
        console.error('SatelliteLayer error:', err);
      }
    };

    if (map.loaded()) {
      addSatelliteLayer();
    } else {
      map.on('load', addSatelliteLayer);
      return () => {
        map.off('load', addSatelliteLayer);
      };
    }
  }, [map]);

  // Toggle visibility — when satellite is active, show satellite tiles; when off, show default OSM dark base
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('satellite');
    const vis = visible ? 'visible' : 'none';

    if (map.getLayer(RASTER_LAYER_ID)) {
      map.setLayoutProperty(RASTER_LAYER_ID, 'visibility', vis);
    }

    // When satellite is active, dim the dark OSM base so satellite shows through
    if (map.getLayer('osm-raster')) {
      map.setPaintProperty(
        'osm-raster',
        'raster-opacity',
        visible ? 0 : 1,
      );
    }
  }, [map, visibleLayers]);

  return null;
}
