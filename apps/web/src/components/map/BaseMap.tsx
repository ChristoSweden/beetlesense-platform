import { useRef, useEffect, useCallback, type ReactNode } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapStore, type MapLayer } from '@/stores/mapStore';
import { useTranslation } from 'react-i18next';
import { Layers, Minus, Plus, Locate } from 'lucide-react';
import { useState } from 'react';
import { ParcelLayer } from './ParcelLayer';
import { NDVILayer } from './NDVILayer';
import { RiskLayer } from './RiskLayer';
import { DronePathsLayer } from './DronePathsLayer';
import { AlertsLayer } from './AlertsLayer';
import { SatelliteLayer } from './SatelliteLayer';

// Dark map style matching BeetleSense design system
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Dark',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#030d05',
      },
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

interface BaseMapProps {
  children?: ReactNode;
  className?: string;
  onMapReady?: (map: maplibregl.Map) => void;
}

const LAYER_OPTIONS: { id: MapLayer; labelKey: string }[] = [
  { id: 'parcels', labelKey: 'map.parcels' },
  { id: 'ndvi', labelKey: 'map.ndvi' },
  { id: 'risk', labelKey: 'map.riskZones' },
  { id: 'drone-paths', labelKey: 'map.dronePaths' },
  { id: 'alerts', labelKey: 'map.alerts' },
  { id: 'satellite', labelKey: 'map.satellite' },
];

export function BaseMap({ children, className = '', onMapReady }: BaseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { center, zoom, bearing, pitch, setCenter, setZoom, setBearing, setPitch, visibleLayers, toggleLayer } =
    useMapStore();
  const { t } = useTranslation();
  const [showLayers, setShowLayers] = useState(false);
  const [mapReady, setMapReady] = useState<maplibregl.Map | null>(null);

  const customStyle = import.meta.env.VITE_MAPLIBRE_STYLE;

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: customStyle || DARK_STYLE,
      center: center,
      zoom: zoom,
      bearing: bearing,
      pitch: pitch,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 3,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('moveend', () => {
      const c = map.getCenter();
      setCenter([c.lng, c.lat]);
      setZoom(map.getZoom());
      setBearing(map.getBearing());
      setPitch(map.getPitch());
    });

    map.on('load', () => {
      setMapReady(map);
      onMapReady?.(map);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 300 });
  }, []);

  const handleLocate = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
      },
      (err) => console.warn('Geolocation error:', err),
      { enableHighAccuracy: true },
    );
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        {/* Zoom controls */}
        <div className="flex flex-col rounded-lg overflow-hidden border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
          <button
            onClick={handleZoomIn}
            className="p-2 text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            title={t('map.zoomIn')}
          >
            <Plus size={18} />
          </button>
          <div className="h-px bg-[var(--border)]" />
          <button
            onClick={handleZoomOut}
            className="p-2 text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            title={t('map.zoomOut')}
          >
            <Minus size={18} />
          </button>
        </div>

        {/* Locate */}
        <button
          onClick={handleLocate}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
          style={{ background: 'var(--surface)' }}
          title={t('map.locateMe')}
        >
          <Locate size={18} />
        </button>

        {/* Layer toggle */}
        <div className="relative">
          <button
            onClick={() => setShowLayers(!showLayers)}
            className={`p-2 rounded-lg border transition-colors ${
              showLayers
                ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                : 'border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)]'
            }`}
            style={showLayers ? {} : { background: 'var(--surface)' }}
            title={t('map.layers')}
          >
            <Layers size={18} />
          </button>

          {showLayers && (
            <div
              className="absolute right-full mr-2 top-0 w-48 rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden"
              style={{ background: 'var(--surface)' }}
            >
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <span className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
                  {t('map.layers')}
                </span>
              </div>
              {LAYER_OPTIONS.map((layer) => (
                <label
                  key={layer.id}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[var(--bg3)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={visibleLayers.includes(layer.id)}
                    onChange={() => toggleLayer(layer.id)}
                    className="w-3.5 h-3.5 rounded border-[var(--border)] bg-[var(--bg)] text-[var(--green)] accent-[var(--green)] cursor-pointer"
                  />
                  <span className="text-xs text-[var(--text2)]">{t(layer.labelKey)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map overlay layers */}
      <ParcelLayer map={mapReady} />
      <NDVILayer map={mapReady} />
      <RiskLayer map={mapReady} />
      <DronePathsLayer map={mapReady} />
      <AlertsLayer map={mapReady} />
      <SatelliteLayer map={mapReady} />

      {/* Additional overlays from parent */}
      {children}
    </div>
  );
}

