import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import { useMapStore } from '@/stores/mapStore';

interface SatelliteLayerProps {
  map: maplibregl.Map | null;
}

const SOURCE_ID = 'sentinel2-cloudless-source';
const RASTER_LAYER_ID = 'sentinel2-cloudless-raster';

// Sentinel-2 Cloudless by EOX — free, high-quality satellite basemap
const SENTINEL2_TILES = [
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg',
];

/**
 * SatelliteLayer — controls satellite imagery visibility on the map.
 *
 * The base style already includes ESRI World Imagery as a dim satellite base.
 * This layer adds the Sentinel-2 cloudless overlay for higher-quality imagery
 * and controls the visibility of both satellite sources based on the toggle.
 *
 * When satellite is ON (default): full satellite imagery visible
 * When satellite is OFF: dim satellite base, brighter OSM labels
 */
export function SatelliteLayer({ map }: SatelliteLayerProps) {
  const { visibleLayers } = useMapStore();
  const loadedRef = useRef(false);

  // Add Sentinel-2 cloudless source/layer on map load
  useEffect(() => {
    if (!map) return;

    const addLayer = () => {
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

          const isVisible = useMapStore.getState().visibleLayers.includes('satellite');

          // Insert after satellite-layer but before osm-raster
          map.addLayer(
            {
              id: RASTER_LAYER_ID,
              type: 'raster',
              source: SOURCE_ID,
              layout: {
                visibility: isVisible ? 'visible' : 'none',
              },
              paint: {
                'raster-opacity': 0.7,
              },
            },
            'osm-raster', // insert before OSM overlay
          );

          // Set initial satellite base visibility
          if (map.getLayer('satellite-layer')) {
            map.setLayoutProperty('satellite-layer', 'visibility', isVisible ? 'visible' : 'none');
          }

          // Adjust OSM label overlay opacity
          if (map.getLayer('osm-raster')) {
            map.setPaintProperty('osm-raster', 'raster-opacity', isVisible ? 0.2 : 0.7);
          }

          loadedRef.current = true;
        }
      } catch (err) {
        console.error('SatelliteLayer error:', err);
      }
    };

    if (map.loaded()) {
      addLayer();
    } else {
      map.on('load', addLayer);
      return () => { map.off('load', addLayer); };
    }
  }, [map]);

  // Toggle satellite imagery on/off
  useEffect(() => {
    if (!map || !loadedRef.current) return;
    const visible = visibleLayers.includes('satellite');

    // Sentinel-2 overlay
    if (map.getLayer(RASTER_LAYER_ID)) {
      map.setLayoutProperty(RASTER_LAYER_ID, 'visibility', visible ? 'visible' : 'none');
    }

    // ESRI satellite base
    if (map.getLayer('satellite-layer')) {
      map.setLayoutProperty('satellite-layer', 'visibility', visible ? 'visible' : 'none');
    }

    // OSM labels — more visible when satellite is off, subtle when on
    if (map.getLayer('osm-raster')) {
      map.setPaintProperty('osm-raster', 'raster-opacity', visible ? 0.2 : 0.7);
    }
  }, [map, visibleLayers]);

  return null;
}
