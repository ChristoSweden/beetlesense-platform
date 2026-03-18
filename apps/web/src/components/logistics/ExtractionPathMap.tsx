import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Layers } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { ExtractionPlan, StandInfo } from '@/services/harvestLogisticsService';

interface ExtractionPathMapProps {
  stand: StandInfo;
  extraction: ExtractionPlan;
}

const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Logistics',
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

const SOIL_RISK_COLORS = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#ef4444',
};

const SENSITIVE_AREA_COLORS = {
  wetland: '#60a5fa',
  cultural_site: '#c084fc',
  steep_slope: '#f97316',
};

export function ExtractionPathMap({ stand, extraction }: ExtractionPathMapProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [showLegend, setShowLegend] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: stand.center,
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      // Stand boundary
      map.addSource('stand-boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [stand.boundary],
          },
        },
      });

      map.addLayer({
        id: 'stand-boundary-fill',
        type: 'fill',
        source: 'stand-boundary',
        paint: {
          'fill-color': '#4ade80',
          'fill-opacity': 0.08,
        },
      });

      map.addLayer({
        id: 'stand-boundary-line',
        type: 'line',
        source: 'stand-boundary',
        paint: {
          'line-color': '#4ade80',
          'line-width': 2,
          'line-dasharray': [4, 2],
        },
      });

      // Sensitive areas
      extraction.sensitiveAreas.forEach((area) => {
        const color = SENSITIVE_AREA_COLORS[area.type];
        map.addSource(`sensitive-${area.id}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [area.coordinates],
            },
          },
        });

        map.addLayer({
          id: `sensitive-fill-${area.id}`,
          type: 'fill',
          source: `sensitive-${area.id}`,
          paint: {
            'fill-color': color,
            'fill-opacity': 0.2,
          },
        });

        map.addLayer({
          id: `sensitive-line-${area.id}`,
          type: 'line',
          source: `sensitive-${area.id}`,
          paint: {
            'line-color': color,
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });
      });

      // Extraction paths
      const pathFeatures = extraction.paths.map((path) => ({
        type: 'Feature' as const,
        properties: {
          type: path.type,
          risk: path.soilDamageRisk,
          length: path.lengthM,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates: path.coordinates,
        },
      }));

      map.addSource('extraction-paths', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: pathFeatures },
      });

      // Basvägar (main roads) — thicker
      map.addLayer({
        id: 'paths-basväg',
        type: 'line',
        source: 'extraction-paths',
        filter: ['==', ['get', 'type'], 'basväg'],
        paint: {
          'line-color': [
            'match', ['get', 'risk'],
            'low', SOIL_RISK_COLORS.low,
            'medium', SOIL_RISK_COLORS.medium,
            'high', SOIL_RISK_COLORS.high,
            '#ffffff',
          ],
          'line-width': 4,
          'line-opacity': 0.8,
        },
      });

      // Stickvägar (branch roads) — thinner, dashed
      map.addLayer({
        id: 'paths-stickväg',
        type: 'line',
        source: 'extraction-paths',
        filter: ['==', ['get', 'type'], 'stickväg'],
        paint: {
          'line-color': [
            'match', ['get', 'risk'],
            'low', SOIL_RISK_COLORS.low,
            'medium', SOIL_RISK_COLORS.medium,
            'high', SOIL_RISK_COLORS.high,
            '#ffffff',
          ],
          'line-width': 2,
          'line-dasharray': [4, 3],
          'line-opacity': 0.7,
        },
      });

      // Landing points
      extraction.landings.forEach((landing) => {
        const el = document.createElement('div');
        el.className = 'flex items-center justify-center w-6 h-6 rounded-full border-2 border-white bg-[#fbbf24] text-[10px] font-bold text-[#030d05]';
        el.textContent = 'A';
        el.title = `${landing.name} (${landing.capacityM3} m\u00B3)`;

        new maplibregl.Marker({ element: el })
          .setLngLat(landing.coordinate)
          .setPopup(
            new maplibregl.Popup({ offset: 12, closeButton: false })
              .setHTML(`
                <div style="color:#030d05;font-size:12px;padding:4px">
                  <strong>${landing.name}</strong><br/>
                  ${t('logistics.extraction.capacity')}: ${landing.capacityM3} m\u00B3
                </div>
              `)
          )
          .addTo(map);
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [stand, extraction, t]);

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <MapIcon size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('logistics.extraction.title')}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--text3)] font-mono">
          <span>{t('logistics.extraction.totalLength')}: {(extraction.totalStripRoadLengthM / 1000).toFixed(1)} km</span>
          <span>{t('logistics.extraction.soilRisk')}: {extraction.estimatedSoilDamageScore}%</span>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[400px]">
        <div ref={mapContainer} className="absolute inset-0" />

        {/* Legend */}
        {showLegend && (
          <div
            className="absolute bottom-4 left-4 rounded-lg border border-[var(--border)] p-3 z-10"
            style={{ background: 'var(--surface)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
                {t('logistics.extraction.legend')}
              </span>
              <button
                onClick={() => setShowLegend(false)}
                className="text-[var(--text3)] hover:text-[var(--text2)] ml-3"
                aria-label={t('common.close')}
              >
                &times;
              </button>
            </div>
            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-0.5 bg-[#4ade80]" style={{ height: 3 }} />
                <span className="text-[var(--text3)]">{t('logistics.extraction.basväg')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 border-t-2 border-dashed border-[#4ade80]" />
                <span className="text-[var(--text3)]">{t('logistics.extraction.stickväg')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#4ade80]/30" />
                <span className="text-[var(--text3)]">{t('logistics.extraction.riskLow')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#fbbf24]/30" />
                <span className="text-[var(--text3)]">{t('logistics.extraction.riskMedium')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#ef4444]/30" />
                <span className="text-[var(--text3)]">{t('logistics.extraction.riskHigh')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#60a5fa]/30" />
                <span className="text-[var(--text3)]">{t('logistics.extraction.wetland')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-[#c084fc]/30" />
                <span className="text-[var(--text3)]">{t('logistics.extraction.culturalSite')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full border-2 border-white bg-[#fbbf24] text-[7px] font-bold text-center leading-[10px]">A</div>
                <span className="text-[var(--text3)]">{t('logistics.extraction.landing')}</span>
              </div>
            </div>
          </div>
        )}

        {!showLegend && (
          <button
            onClick={() => setShowLegend(true)}
            className="absolute bottom-4 left-4 p-2 rounded-lg border border-[var(--border)] z-10 text-[var(--text3)] hover:text-[var(--green)] transition-colors"
            style={{ background: 'var(--surface)' }}
            aria-label={t('logistics.extraction.showLegend')}
          >
            <Layers size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
