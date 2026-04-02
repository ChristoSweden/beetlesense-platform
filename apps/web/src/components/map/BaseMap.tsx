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
import { RegulatoryLayer } from './RegulatoryLayer';
import { ForestPulseLayer } from './ForestPulseLayer';
import { RiskFlowField } from './RiskFlowField';
import { TemporalRings } from './TemporalRings';
import { CompositeScore } from './CompositeScore';
import { FusionControls } from './FusionControls';
import ThermalLayer from './ThermalLayer';
import MultispectralLayer from './MultispectralLayer';
import CrownHealthLayer from './CrownHealthLayer';
import SensorComparisonView from './SensorComparisonView';
import { VisuallyHidden } from '@/components/a11y/VisuallyHidden';

// Dark map style matching BeetleSense design system
// Uses ESRI World Imagery as satellite base + OSM overlay for labels
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Dark',
  sources: {
    'satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 18,
      attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    },
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
      id: 'satellite-layer',
      type: 'raster',
      source: 'satellite',
      paint: {
        'raster-brightness-max': 0.85,
        'raster-brightness-min': 0.05,
        'raster-contrast': 0.15,
        'raster-saturation': -0.1,
      },
    },
    {
      id: 'osm-raster',
      type: 'raster',
      source: 'osm-raster',
      paint: {
        'raster-saturation': -0.9,
        'raster-brightness-max': 0.4,
        'raster-brightness-min': 0.0,
        'raster-contrast': 0.3,
        'raster-opacity': 0.3,
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
  { id: 'regulatory', labelKey: 'map.regulatory' },
];

export function BaseMap({ children, className = '', onMapReady }: BaseMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const { center, zoom, bearing, pitch, setCenter, setZoom, setBearing, setPitch, visibleLayers, toggleLayer } =
    useMapStore();
  const { t } = useTranslation();
  const [showLayers, setShowLayers] = useState(false);
  const [mapReady, setMapReady] = useState<maplibregl.Map | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [locateError, setLocateError] = useState<string | null>(null);

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

    // Ensure keyboard navigation works on the map canvas
    map.getCanvas().setAttribute('tabindex', '0');

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

    map.on('error', (e) => {
      console.warn('[BaseMap] Map error:', e.error?.message || e);
      if (e.error?.message?.includes('tile') || e.error?.message?.includes('404') || e.error?.message?.includes('fetch')) {
        setMapError(t('map.tileLoadError', 'Map tiles could not be loaded. Check your connection.'));
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run on mount

  }, []);

  // Close layers panel on Escape
  useEffect(() => {
    if (!showLayers) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowLayers(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showLayers]);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.zoomIn({ duration: 300 });
  }, []);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.zoomOut({ duration: 300 });
  }, []);

  const handleLocate = useCallback(() => {
    setLocateError(null);
    if (!navigator.geolocation) {
      setLocateError(t('map.geolocationUnavailable', 'Location not available on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
      },
      (err) => {
        console.warn('Geolocation error:', err);
        const msg = err.code === 1
          ? t('map.geolocationDenied', 'Location access denied. Allow in browser settings.')
          : t('map.geolocationUnavailable', 'Could not determine your location.');
        setLocateError(msg);
        setTimeout(() => setLocateError(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [t]);

  return (
    <div
      className={`relative w-full h-full ${className}`}
      role="region"
      aria-label="Interactive forest map showing parcels, health data, and alert zones"
    >
      <div
        ref={mapContainer}
        className="absolute inset-0"
        aria-label="Map view"
      />

      {/* Screen reader description of the map */}
      <VisuallyHidden>
        Interactive map displaying forest parcels and survey data.
        Use keyboard arrow keys to pan, plus and minus keys to zoom.
        Map controls are available in the toolbar to the right.
      </VisuallyHidden>

      {/* Map controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10" role="toolbar" aria-label="Map controls">
        {/* Zoom controls */}
        <div className="flex flex-col rounded-lg overflow-hidden border border-[var(--border)]" style={{ background: 'var(--surface)' }}>
          <button
            onClick={handleZoomIn}
            className="p-2 text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('map.zoomIn')}
            title={t('map.zoomIn')}
          >
            <Plus size={18} aria-hidden="true" />
          </button>
          <div className="h-px bg-[var(--border)]" />
          <button
            onClick={handleZoomOut}
            className="p-2 text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('map.zoomOut')}
            title={t('map.zoomOut')}
          >
            <Minus size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Locate */}
        <button
          onClick={handleLocate}
          className="p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
          style={{ background: 'var(--surface)' }}
          aria-label={t('map.locateMe')}
          title={t('map.locateMe')}
        >
          <Locate size={18} aria-hidden="true" />
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
            aria-label={t('map.layers')}
            aria-expanded={showLayers}
            aria-haspopup="true"
            title={t('map.layers')}
          >
            <Layers size={18} aria-hidden="true" />
          </button>

          {showLayers && (
            <div
              className="absolute right-full mr-2 top-0 w-48 rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden"
              style={{ background: 'var(--surface)' }}
              role="group"
              aria-label="Map layer toggles"
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
                    aria-label={`Toggle ${t(layer.labelKey)} layer`}
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
      <RegulatoryLayer map={mapReady} />

      {/* Multi-sensor drone data layers */}
      <ThermalLayer map={mapReady} />
      <MultispectralLayer map={mapReady} />
      <CrownHealthLayer map={mapReady} />
      <SensorComparisonView />

      {/* Forest Pulse fusion visualization layers */}
      <ForestPulseLayer map={mapReady} />
      <RiskFlowField map={mapReady} />
      <TemporalRings map={mapReady} />
      <CompositeScore map={mapReady} />
      <FusionControls />

      {/* Error notifications */}
      {mapError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-xs text-red-300 max-w-xs text-center">
          {mapError}
        </div>
      )}
      {locateError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-lg bg-[var(--amber)]/15 border border-[var(--amber)]/30 text-xs text-[var(--amber)] max-w-xs text-center animate-fade-in">
          {locateError}
        </div>
      )}

      {/* Additional overlays from parent */}
      {children}
    </div>
  );
}
