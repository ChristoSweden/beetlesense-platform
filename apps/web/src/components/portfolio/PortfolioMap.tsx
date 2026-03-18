import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'react-i18next';
import type { PortfolioParcel } from '@/hooks/usePortfolio';

// Dark map style matching BeetleSense design system
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Portfolio',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

function healthToColor(score: number): string {
  if (score >= 80) return '#4ade80'; // green
  if (score >= 60) return '#facc15'; // yellow
  if (score >= 40) return '#fb923c'; // orange
  return '#ef4444'; // red
}

interface Props {
  parcels: PortfolioParcel[];
  onParcelClick?: (parcelId: string) => void;
}

export function PortfolioMap({ parcels, onParcelClick }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [15.0, 57.5], // Centered on Småland
      zoom: 6,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setMapLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update parcel layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || parcels.length === 0) return;

    // Build GeoJSON
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: parcels.map((p) => ({
        type: 'Feature',
        properties: {
          id: p.id,
          name: p.name,
          municipality: p.municipality,
          area_hectares: p.area_hectares,
          health_score: p.health_score,
          timber_value_kr: p.timber_value_kr,
          warnings: p.warnings,
          color: healthToColor(p.health_score),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [p.boundary],
        },
      })),
    };

    // Remove existing layers/source if present
    if (map.getLayer('portfolio-parcels-fill')) map.removeLayer('portfolio-parcels-fill');
    if (map.getLayer('portfolio-parcels-line')) map.removeLayer('portfolio-parcels-line');
    if (map.getLayer('portfolio-parcels-labels')) map.removeLayer('portfolio-parcels-labels');
    if (map.getSource('portfolio-parcels')) map.removeSource('portfolio-parcels');

    map.addSource('portfolio-parcels', {
      type: 'geojson',
      data: geojson,
    });

    map.addLayer({
      id: 'portfolio-parcels-fill',
      type: 'fill',
      source: 'portfolio-parcels',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': 0.25,
      },
    });

    map.addLayer({
      id: 'portfolio-parcels-line',
      type: 'line',
      source: 'portfolio-parcels',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 2,
        'line-opacity': 0.8,
      },
    });

    // Fit bounds to all parcels
    const bounds = new maplibregl.LngLatBounds();
    parcels.forEach((p) => {
      p.boundary.forEach(([lng, lat]) => bounds.extend([lng, lat]));
    });
    map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 1000 });

    // Click handler for popups
    map.on('click', 'portfolio-parcels-fill', (e) => {
      if (!e.features || e.features.length === 0) return;
      const feature = e.features[0];
      const props = feature.properties;
      if (!props) return;

      const healthColor = healthToColor(props.health_score);
      const valueFormatted = props.timber_value_kr >= 1_000_000
        ? `${(props.timber_value_kr / 1_000_000).toFixed(1)}M kr`
        : `${(props.timber_value_kr / 1_000).toFixed(0)}k kr`;

      new maplibregl.Popup({
        closeButton: true,
        maxWidth: '240px',
        className: 'portfolio-popup',
      })
        .setLngLat(e.lngLat)
        .setHTML(
          `<div style="font-family: system-ui, sans-serif; color: #e2e8f0; padding: 4px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">${props.name}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">${props.municipality}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-size: 11px;">
              <div>${t('portfolio.table.area')}: <strong>${props.area_hectares} ha</strong></div>
              <div>${t('portfolio.table.value')}: <strong>${valueFormatted}</strong></div>
              <div>${t('portfolio.table.health')}: <strong style="color: ${healthColor}">${props.health_score}</strong></div>
              <div>${t('portfolio.table.warnings')}: <strong>${props.warnings}</strong></div>
            </div>
          </div>`,
        )
        .addTo(map);

      onParcelClick?.(props.id);
    });

    // Cursor change on hover
    map.on('mouseenter', 'portfolio-parcels-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'portfolio-parcels-fill', () => {
      map.getCanvas().style.cursor = '';
    });
  }, [parcels, mapLoaded, t, onParcelClick]);

  return (
    <div className="relative rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div ref={containerRef} className="w-full h-[400px] lg:h-[500px]" />
      {/* Custom popup styles */}
      <style>{`
        .portfolio-popup .maplibregl-popup-content {
          background: #0a1f0e;
          border: 1px solid rgba(74, 222, 128, 0.2);
          border-radius: 12px;
          padding: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        .portfolio-popup .maplibregl-popup-close-button {
          color: #94a3b8;
          font-size: 16px;
          padding: 4px 8px;
        }
        .portfolio-popup .maplibregl-popup-tip {
          border-top-color: #0a1f0e;
        }
      `}</style>
    </div>
  );
}
