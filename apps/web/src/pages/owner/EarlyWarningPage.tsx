import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Radar,
  RefreshCw,
  Satellite,
  ChevronRight,
  X,
  Crosshair,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEarlyWarning, type EarlyWarning, type WarningSeverity } from '@/hooks/useEarlyWarning';
import { WarningCard } from '@/components/earlywarning/WarningCard';
import { AnomalyTimeline } from '@/components/earlywarning/AnomalyTimeline';

// ─── Severity colors ───

const SEVERITY_COLORS: Record<WarningSeverity, string> = {
  green: '#4ade80',
  yellow: '#fbbf24',
  orange: '#f97316',
  red: '#ef4444',
};

const HEATMAP_COLORS: Record<WarningSeverity, string> = {
  green: 'rgba(74,222,128,0.15)',
  yellow: 'rgba(251,191,36,0.25)',
  orange: 'rgba(249,115,22,0.35)',
  red: 'rgba(239,68,68,0.45)',
};

// ─── Dark map style ───

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

// ─── Generate GeoJSON circles for anomaly zones ───

function generateAnomalyZoneGeoJSON(warnings: EarlyWarning[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: warnings.map((w) => {
      // Generate a rough polygon circle around the center
      const radiusKm = Math.sqrt(w.areaHectares / Math.PI) * 0.1; // rough radius
      const points = 32;
      const coords: [number, number][] = [];

      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const lng = w.center[0] + (radiusKm / 111.32) * Math.cos(angle);
        const lat = w.center[1] + (radiusKm / (111.32 * Math.cos((w.center[1] * Math.PI) / 180))) * Math.sin(angle);
        coords.push([lng, lat]);
      }

      return {
        type: 'Feature' as const,
        properties: {
          id: w.id,
          severity: w.severity,
          parcelName: w.parcelName,
          standNumber: w.standNumber,
          ndviDeviation: w.ndviDeviation,
          areaHectares: w.areaHectares,
          color: SEVERITY_COLORS[w.severity],
          fillColor: HEATMAP_COLORS[w.severity],
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coords],
        },
      };
    }),
  };
}

// ─── Timeline slider week labels ───

function generateWeekLabels(): string[] {
  const labels: string[] = [];
  const start = new Date('2026-01-12');
  for (let i = 0; i < 12; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i * 7);
    labels.push(
      d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' }),
    );
  }
  return labels;
}

// ─── Page Component ───

export default function EarlyWarningPage() {
  const { t } = useTranslation();
  const { warnings, loading, error, severityCounts, refresh } = useEarlyWarning();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedWarning, setSelectedWarning] = useState<EarlyWarning | null>(null);
  const [timelineIndex, setTimelineIndex] = useState<number>(11); // default to latest
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const weekLabels = generateWeekLabels();

  // ─── Initialize map ───
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const customStyle = import.meta.env.VITE_MAPLIBRE_STYLE;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: customStyle || DARK_STYLE,
      center: [14.08, 57.2],
      zoom: 10,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 5,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ─── Add anomaly zones to map ───
  useEffect(() => {
    const map = mapRef.current;
    if (!map || warnings.length === 0) return;

    const addLayers = () => {
      // Clean up old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const geojson = generateAnomalyZoneGeoJSON(warnings);

      // Add or update source
      const source = map.getSource('anomaly-zones') as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(geojson);
      } else {
        map.addSource('anomaly-zones', {
          type: 'geojson',
          data: geojson,
        });

        // Fill layer
        map.addLayer({
          id: 'anomaly-zones-fill',
          type: 'fill',
          source: 'anomaly-zones',
          paint: {
            'fill-color': ['get', 'fillColor'],
            'fill-opacity': 0.6,
          },
        });

        // Outline layer
        map.addLayer({
          id: 'anomaly-zones-outline',
          type: 'line',
          source: 'anomaly-zones',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
            'line-opacity': 0.8,
          },
        });

        // Click handler
        map.on('click', 'anomaly-zones-fill', (e) => {
          if (e.features && e.features.length > 0) {
            const props = e.features[0].properties;
            const found = warnings.find((w) => w.id === props?.id);
            if (found) setSelectedWarning(found);
          }
        });

        // Cursor
        map.on('mouseenter', 'anomaly-zones-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'anomaly-zones-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }

      // Add center markers with severity dots
      warnings.forEach((w) => {
        const el = document.createElement('div');
        el.className = 'anomaly-marker';
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = SEVERITY_COLORS[w.severity];
        el.style.border = '2px solid rgba(0,0,0,0.3)';
        el.style.boxShadow = `0 0 8px ${SEVERITY_COLORS[w.severity]}40`;
        el.style.cursor = 'pointer';

        el.addEventListener('click', () => setSelectedWarning(w));

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(w.center)
          .addTo(map);

        markersRef.current.push(marker);
      });
    };

    if (map.isStyleLoaded()) {
      addLayers();
    } else {
      map.on('load', addLayers);
    }
  }, [warnings]);

  // ─── Fly to selected warning ───
  const flyToWarning = useCallback((warning: EarlyWarning) => {
    setSelectedWarning(warning);
    mapRef.current?.flyTo({
      center: warning.center,
      zoom: 14,
      duration: 1200,
    });
  }, []);

  const totalActive = severityCounts.red + severityCounts.orange + severityCounts.yellow;

  return (
    <div className="flex h-full relative">
      {/* Left sidebar: warnings list */}
      <div
        className={`absolute top-0 left-0 bottom-0 z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 xl:w-96 border-r border-[var(--border)] overflow-y-auto`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('earlyWarning.pageTitle')}
              </h1>
            </div>
            <button
              onClick={() => refresh()}
              className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>
          <p className="text-xs text-[var(--text3)] mb-4">
            {t('earlyWarning.pageSubtitle')}
          </p>

          {/* Summary chips */}
          {!loading && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold"
                style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                {severityCounts.red} {t('earlyWarning.severity.confirmedDamage')}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold"
                style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316' }}>
                {severityCounts.orange} {t('earlyWarning.severity.likelyInfestation')}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold"
                style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                {severityCounts.yellow} {t('earlyWarning.severity.stressDetected')}
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
                  <div className="h-3 w-1/3 rounded bg-[var(--bg3)] mb-3" />
                  <div className="h-3 w-2/3 rounded bg-[var(--bg3)] mb-2" />
                  <div className="h-3 w-1/2 rounded bg-[var(--bg3)]" />
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-lg border border-red-500/20 bg-red-500/5">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Warnings list */}
          {!loading && (
            <div className="space-y-3">
              {warnings.map((warning) => (
                <WarningCard
                  key={warning.id}
                  warning={warning}
                  onViewOnMap={flyToWarning}
                  onOrderDrone={() => {}}
                  onAskAi={() => {}}
                />
              ))}

              {warnings.length === 0 && (
                <div className="text-center py-8">
                  <Satellite size={32} className="mx-auto mb-3 text-[var(--green)]/40" />
                  <p className="text-sm font-medium text-[var(--green)]">
                    {t('earlyWarning.noWarnings')}
                  </p>
                  <p className="text-xs text-[var(--text3)] mt-1">
                    {t('earlyWarning.noWarningsDesc')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Sidebar toggle */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 px-3 py-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors flex items-center gap-2"
            style={{ background: 'var(--bg2)' }}
          >
            <AlertTriangle size={14} />
            <span className="text-xs font-medium">
              {totalActive} {t('earlyWarning.activeWarnings')}
            </span>
          </button>
        )}

        {/* Timeline slider at bottom of map */}
        <div className="absolute bottom-4 left-4 right-4 z-10" style={{ marginLeft: sidebarOpen ? '20rem' : '0' }}>
          {/* Week timeline slider */}
          <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Satellite size={13} className="text-[var(--text3)]" />
                <span className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
                  {t('earlyWarning.timelineSlider.title')}
                </span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {weekLabels[timelineIndex]}
              </span>
            </div>
            <div className="px-4 py-3">
              <input
                type="range"
                min={0}
                max={weekLabels.length - 1}
                value={timelineIndex}
                onChange={(e) => setTimelineIndex(Number(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #4ade80 0%, #fbbf24 50%, #ef4444 100%)`,
                }}
                aria-label={t('earlyWarning.timelineSlider.label')}
              />
              <div className="flex justify-between mt-1">
                <span className="text-[8px] font-mono text-[var(--text3)]">{weekLabels[0]}</span>
                <span className="text-[8px] font-mono text-[var(--text3)]">{weekLabels[weekLabels.length - 1]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected warning detail panel */}
        {selectedWarning && (
          <div
            className="absolute top-4 right-4 z-20 w-80 max-h-[calc(100vh-120px)] overflow-y-auto rounded-xl border border-[var(--border)] shadow-xl"
            style={{ background: 'var(--bg2)' }}
          >
            {/* Close button */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <Crosshair size={14} className="text-[var(--text3)]" />
                <span className="text-xs font-semibold text-[var(--text)]">
                  {t('earlyWarning.zoneDetail')}
                </span>
              </div>
              <button
                onClick={() => setSelectedWarning(null)}
                className="p-1 rounded hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Zone info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[selectedWarning.severity] }}
                  />
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {selectedWarning.parcelName} — {selectedWarning.standNumber}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider mb-0.5">
                      {t('earlyWarning.detail.area')}
                    </p>
                    <p className="text-sm font-mono font-semibold text-[var(--text)]">
                      {selectedWarning.areaHectares} ha
                    </p>
                  </div>
                  <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider mb-0.5">
                      {t('earlyWarning.detail.ndviDeviation')}
                    </p>
                    <p
                      className="text-sm font-mono font-semibold"
                      style={{ color: SEVERITY_COLORS[selectedWarning.severity] }}
                    >
                      -{selectedWarning.ndviDeviation}%
                    </p>
                  </div>
                  <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider mb-0.5">
                      {t('earlyWarning.detail.spreadRate')}
                    </p>
                    <p className="text-sm font-mono font-semibold text-[var(--text)]">
                      {selectedWarning.estimatedSpreadRate} ha/{t('earlyWarning.week')}
                    </p>
                  </div>
                  <div className="rounded-lg p-2.5 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                    <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider mb-0.5">
                      {t('earlyWarning.detail.currentNdvi')}
                    </p>
                    <p className="text-sm font-mono font-semibold text-[var(--text)]">
                      {selectedWarning.currentNdvi.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommended action */}
              <div className="rounded-lg p-3 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
                <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider mb-1">
                  {t('earlyWarning.detail.recommendedAction')}
                </p>
                <p className="text-xs text-[var(--text)]">
                  {t(`earlyWarning.actions.${selectedWarning.recommendedAction}`)}
                </p>
              </div>

              {/* NDVI Timeline for this zone */}
              <AnomalyTimeline
                dataPoints={selectedWarning.ndviTimeSeries}
                selectedIndex={timelineIndex}
                onSelectIndex={setTimelineIndex}
              />

              {/* CTA */}
              <Link
                to="/owner/surveys"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: SEVERITY_COLORS[selectedWarning.severity],
                  color: selectedWarning.severity === 'yellow' ? '#000' : '#fff',
                }}
              >
                <Radar size={14} />
                {t('earlyWarning.orderDroneSurvey')}
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
