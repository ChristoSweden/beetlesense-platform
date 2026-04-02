import { useRef, useEffect, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'react-i18next';
import { MapPin, Minus, Plus } from 'lucide-react';

interface AreaPickerProps {
  location: { lng: number; lat: number } | null;
  radius: number;
  onLocationChange: (location: { lng: number; lat: number }) => void;
  onRadiusChange: (radius: number) => void;
}

// Dark map style matching BeetleSense
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Satellite Check',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#030d05' },
    },
    {
      id: 'osm-raster',
      type: 'raster',
      source: 'osm-raster',
      paint: {
        'raster-saturation': -0.8,
        'raster-brightness-max': 0.35,
        'raster-brightness-min': 0.0,
        'raster-contrast': 0.2,
        'raster-hue-rotate': 90,
      },
    },
  ],
};

function createCircleGeoJSON(
  center: { lng: number; lat: number },
  radiusMeters: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const earthRadiusKm = 6371;
  const radiusKm = radiusMeters / 1000;

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const lat = Math.asin(
      Math.sin((center.lat * Math.PI) / 180) * Math.cos(radiusKm / earthRadiusKm) +
        Math.cos((center.lat * Math.PI) / 180) *
          Math.sin(radiusKm / earthRadiusKm) *
          Math.cos(angle),
    );
    const lng =
      ((center.lng * Math.PI) / 180 +
        Math.atan2(
          Math.sin(angle) * Math.sin(radiusKm / earthRadiusKm) * Math.cos((center.lat * Math.PI) / 180),
          Math.cos(radiusKm / earthRadiusKm) -
            Math.sin((center.lat * Math.PI) / 180) * Math.sin(lat),
        ));
    coords.push([(lng * 180) / Math.PI, (lat * 180) / Math.PI]);
  }

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

export function AreaPicker({ location, radius, onLocationChange, onRadiusChange }: AreaPickerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [15.42, 57.78], // Default: Småland, Sweden
      zoom: 12,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 5,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      // Add circle source/layer
      map.addSource('selection-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'selection-circle-fill',
        type: 'fill',
        source: 'selection-circle',
        paint: {
          'fill-color': '#4ade80',
          'fill-opacity': 0.12,
        },
      });

      map.addLayer({
        id: 'selection-circle-outline',
        type: 'line',
        source: 'selection-circle',
        paint: {
          'line-color': '#4ade80',
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });

      setMapReady(true);
      mapRef.current = map;
    });

    // Click to place point
    map.on('click', (e) => {
      onLocationChange({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    });

    // Change cursor
    map.getCanvas().style.cursor = 'crosshair';

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onLocationChange]);

  // Update marker and circle when location/radius changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Update marker
    if (location) {
      if (markerRef.current) {
        markerRef.current.setLngLat([location.lng, location.lat]);
      } else {
        const el = document.createElement('div');
        el.className = 'satellite-check-marker';
        el.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          background: rgba(74, 222, 128, 0.2);
          border: 2px solid #4ade80;
          display: flex; align-items: center; justify-content: center;
          cursor: grab;
        `;
        const inner = document.createElement('div');
        inner.style.cssText = 'width: 8px; height: 8px; border-radius: 50%; background: #4ade80;';
        el.appendChild(inner);

        markerRef.current = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat([location.lng, location.lat])
          .addTo(map);

        markerRef.current.on('dragend', () => {
          const pos = markerRef.current?.getLngLat();
          if (pos) onLocationChange({ lng: pos.lng, lat: pos.lat });
        });
      }

      // Update circle
      const src = map.getSource('selection-circle') as maplibregl.GeoJSONSource | undefined;
      if (src) {
        const circle = createCircleGeoJSON(location, radius);
        src.setData({ type: 'FeatureCollection', features: [circle] });
      }
    }
  }, [location, radius, mapReady, onLocationChange]);

  const handleRadiusSlider = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onRadiusChange(Number(e.target.value));
    },
    [onRadiusChange],
  );

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Map header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            {t('satelliteCheck.selectArea')}
          </span>
        </div>
        {location && (
          <span className="text-[10px] font-mono text-[var(--text3)]">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Map container */}
      <div ref={containerRef} className="w-full h-[320px] relative">
        {!location && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-[var(--bg)]/90 border border-[var(--border)] rounded-lg px-4 py-2">
              <p className="text-xs text-[var(--text2)]">
                {t('satelliteCheck.clickToPlace')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Radius slider */}
      <div className="px-4 py-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text2)]">{t('satelliteCheck.radius')}</span>
          <span className="text-xs font-mono font-semibold text-[var(--green)]">{radius}m</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onRadiusChange(Math.max(50, radius - 50))}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
            aria-label="Decrease radius"
          >
            <Minus size={14} className="text-[var(--text3)]" />
          </button>
          <input
            type="range"
            min={50}
            max={500}
            step={25}
            value={radius}
            onChange={handleRadiusSlider}
            className="flex-1 h-1.5 rounded-full appearance-none bg-[var(--bg3)] accent-[var(--green)] cursor-pointer"
            aria-label={t('satelliteCheck.radius')}
          />
          <button
            onClick={() => onRadiusChange(Math.min(500, radius + 50))}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
            aria-label="Increase radius"
          >
            <Plus size={14} className="text-[var(--text3)]" />
          </button>
        </div>
      </div>
    </div>
  );
}
