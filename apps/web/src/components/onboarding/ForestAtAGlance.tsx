import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  TreePine,
  Leaf,
  ShieldAlert,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import type { OnboardingParcelData } from '@/services/fastighetsLookup';

// Dark map style matching BeetleSense design system
const MINI_MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Mini',
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap',
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

interface ForestAtAGlanceProps {
  data: OnboardingParcelData;
  className?: string;
  /** When true, stats animate in sequentially */
  animate?: boolean;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delay: number;
  animate: boolean;
}

function StatItem({ icon, label, value, color, delay, animate }: StatItemProps) {
  const [visible, setVisible] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [animate, delay]);

  return (
    <div
      className={`rounded-xl border border-[var(--border)] p-4 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ background: 'var(--bg2)' }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <p className="text-lg font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-xs text-[var(--text3)] mt-0.5">{label}</p>
    </div>
  );
}

export function ForestAtAGlance({ data, className = '', animate = true }: ForestAtAGlanceProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [headerVisible, setHeaderVisible] = useState(!animate);
  const [summaryVisible, setSummaryVisible] = useState(!animate);

  // Animate header
  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setHeaderVisible(true), 200);
    return () => clearTimeout(timer);
  }, [animate]);

  // Animate summary
  useEffect(() => {
    if (!animate) return;
    const timer = setTimeout(() => setSummaryVisible(true), 1800);
    return () => clearTimeout(timer);
  }, [animate]);

  // Mini map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const customStyle = import.meta.env.VITE_MAPLIBRE_STYLE;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: customStyle || MINI_MAP_STYLE,
      center: data.lookup.centroid,
      zoom: 13,
      interactive: false,
      attributionControl: false,
    });

    map.on('load', () => {
      // Add parcel boundary
      map.addSource('parcel-boundary', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: data.lookup.boundaryGeoJSON as GeoJSON.Geometry,
          properties: {},
        },
      });

      map.addLayer({
        id: 'parcel-fill',
        type: 'fill',
        source: 'parcel-boundary',
        paint: {
          'fill-color': '#4ade80',
          'fill-opacity': 0.12,
        },
      });

      map.addLayer({
        id: 'parcel-outline',
        type: 'line',
        source: 'parcel-boundary',
        paint: {
          'line-color': '#4ade80',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      });

      // Fit to boundary
      const coords = (data.lookup.boundaryGeoJSON.coordinates as number[][][])[0];
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(
          coords[0] as [number, number],
          coords[0] as [number, number],
        ),
      );
      map.fitBounds(bounds, { padding: 40, duration: 0 });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };

  }, []);

  const ndviColor =
    data.analysis.ndviStatus === 'healthy'
      ? '#4ade80'
      : data.analysis.ndviStatus === 'moderate'
        ? '#fbbf24'
        : '#ef4444';

  const ndviLabel =
    data.analysis.ndviStatus === 'healthy'
      ? t('owner.parcels.healthy')
      : data.analysis.ndviStatus === 'moderate'
        ? t('owner.parcels.atRisk')
        : t('owner.parcels.infested');

  const riskColor =
    data.analysis.riskLevel === 'low'
      ? '#4ade80'
      : data.analysis.riskLevel === 'medium'
        ? '#fbbf24'
        : '#ef4444';

  const riskLabel =
    data.analysis.riskLevel === 'low'
      ? t('onboarding.riskLow', { defaultValue: 'Low' })
      : data.analysis.riskLevel === 'medium'
        ? t('onboarding.riskMedium', { defaultValue: 'Medium' })
        : t('onboarding.riskHigh', { defaultValue: 'High' });

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div
        className={`text-center mb-6 transition-all duration-500 ${
          headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <h2 className="text-xl font-serif font-bold text-[var(--text)]">
          {t('onboarding.forestAtAGlance')}
        </h2>
        <p className="text-sm text-[var(--text3)] mt-1">
          {data.lookup.fastighetId} &middot; {data.lookup.municipality}, {data.lookup.county}
        </p>
      </div>

      {/* Mini map */}
      <div className="relative rounded-xl overflow-hidden border border-[var(--border)] mb-6 h-48 sm:h-56">
        <div ref={mapContainer} className="absolute inset-0" />
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--bg)]/80 to-transparent" />
        {/* Area badge */}
        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-lg bg-[var(--bg)]/80 border border-[var(--border)] flex items-center gap-2">
          <Maximize2 size={14} className="text-[var(--green)]" />
          <span className="text-xs font-mono text-[var(--text)]">
            {data.lookup.areaHa} ha
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatItem
          icon={<Maximize2 size={16} />}
          label={t('owner.parcelDetail.area')}
          value={`${data.lookup.areaHa} ha`}
          color="#4ade80"
          delay={400}
          animate={animate}
        />
        <StatItem
          icon={<TreePine size={16} />}
          label={t('onboarding.dominantSpecies', { defaultValue: 'Dominant Species' })}
          value={data.analysis.dominantSpecies}
          color="#86efac"
          delay={600}
          animate={animate}
        />
        <StatItem
          icon={<Leaf size={16} />}
          label={t('onboarding.ndviHealth', { defaultValue: 'NDVI Health' })}
          value={`${(data.analysis.ndvi * 100).toFixed(0)}% ${ndviLabel}`}
          color={ndviColor}
          delay={800}
          animate={animate}
        />
        <StatItem
          icon={<ShieldAlert size={16} />}
          label={t('onboarding.barkBeetleRisk', { defaultValue: 'Bark Beetle Risk' })}
          value={riskLabel}
          color={riskColor}
          delay={1000}
          animate={animate}
        />
      </div>

      {/* Species mix bar */}
      <div
        className={`rounded-xl border border-[var(--border)] p-4 mb-6 transition-all duration-500 ${
          summaryVisible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'var(--bg2)' }}
      >
        <p className="text-xs font-medium text-[var(--text2)] mb-3">
          {t('owner.parcelDetail.speciesMix')}
        </p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {data.analysis.speciesMix.map((s, i) => (
            <div
              key={s.species}
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${s.pct}%`,
                backgroundColor:
                  i === 0 ? '#4ade80' : i === 1 ? '#86efac' : '#bbf7d0',
                opacity: summaryVisible ? 1 : 0,
              }}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2">
          {data.analysis.speciesMix.map((s, i) => (
            <div key={s.species} className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor:
                    i === 0 ? '#4ade80' : i === 1 ? '#86efac' : '#bbf7d0',
                }}
              />
              <span className="text-xs text-[var(--text3)]">
                {s.species} {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      <div
        className={`rounded-xl border border-[var(--border)] p-4 transition-all duration-500 ${
          summaryVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[var(--green)]" />
          <span className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            AI Analysis
          </span>
        </div>
        <p className="text-sm text-[var(--text)] leading-relaxed">
          {data.analysis.aiSummary}
        </p>
      </div>
    </div>
  );
}
