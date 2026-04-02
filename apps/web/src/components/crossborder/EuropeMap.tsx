/**
 * EuropeMap — MapLibre map of Northern Europe showing bark beetle outbreak zones,
 * propagation fronts, wind corridors, and Swedish risk regions.
 */

import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type {
  CountryOutbreak,
  PropagationFront,
  WindCorridor,
  SwedishRegionRisk,
  TimelineSnapshot,
  OutbreakSeverity,
} from '@/hooks/useCrossBorderAlert';

// ─── Severity color mapping ───

const SEVERITY_COLORS: Record<OutbreakSeverity, string> = {
  critical: '#ef4444',
  severe: '#f97316',
  moderate: '#eab308',
  low: '#4ade80',
  minimal: '#6b7280',
};

const _SEVERITY_OPACITY: Record<OutbreakSeverity, number> = {
  critical: 0.55,
  severe: 0.45,
  moderate: 0.35,
  low: 0.25,
  minimal: 0.15,
};

// Dark style for the Europe-scale map
const EUROPE_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Europe Dark',
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
        'raster-saturation': -0.95,
        'raster-brightness-max': 0.3,
        'raster-brightness-min': 0.0,
        'raster-contrast': 0.4,
        'raster-opacity': 0.5,
      },
    },
  ],
};

interface EuropeMapProps {
  countries: CountryOutbreak[];
  propagationFronts: PropagationFront[];
  windCorridors: WindCorridor[];
  swedishRegionRisks: SwedishRegionRisk[];
  timeline: TimelineSnapshot[];
  selectedYear: number;
  onSelectYear: (year: number) => void;
  className?: string;
}

export function EuropeMap({
  countries,
  propagationFronts,
  windCorridors,
  swedishRegionRisks,
  timeline,
  selectedYear,
  onSelectYear,
  className = '',
}: EuropeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const animFrameRef = useRef<number>(0);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: EUROPE_DARK_STYLE,
      center: [15, 56],
      zoom: 4,
      minZoom: 3,
      maxZoom: 10,
      attributionControl: false,
      pitch: 0,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add outbreak layers when map is ready or data changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Clear previous markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Get the current year's snapshot for filtering
    const snapshot = timeline.find((s) => s.year === selectedYear);

    // ─── Outbreak hotspot circles (pulsing markers via DOM) ───
    countries.forEach((c) => {
      const snapshotCountry = snapshot?.countries.find(
        (sc) => sc.country === c.country,
      );
      if (!snapshotCountry) return;

      // Country-level pulsing dot
      const el = document.createElement('div');
      el.className = 'outbreak-marker';
      const color = SEVERITY_COLORS[snapshotCountry.severity];
      const size = Math.min(60, 20 + (snapshotCountry.affectedHa / 10000));

      el.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${color};
        opacity: 0.7;
        cursor: pointer;
        box-shadow: 0 0 ${size / 2}px ${color}80;
        animation: pulse-outbreak 2s ease-in-out infinite;
        position: relative;
      `;

      // Inner label
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: white;
        font-size: 10px;
        font-weight: 700;
        font-family: monospace;
        text-shadow: 0 1px 3px rgba(0,0,0,0.8);
        white-space: nowrap;
        pointer-events: none;
      `;
      label.textContent = c.countryCode;
      el.appendChild(label);

      el.addEventListener('click', () => {
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '320px',
        })
          .setLngLat(c.center)
          .setHTML(`
            <div style="background: #0a1a0d; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px; border: 1px solid #1a3a20;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 20px;">${c.flag}</span>
                <div>
                  <div style="font-weight: 700; font-size: 14px;">${c.country}</div>
                  <span style="background: ${color}30; color: ${color}; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${snapshotCountry.severity}</span>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
                <div style="background: #0d220f; padding: 6px; border-radius: 6px;">
                  <div style="color: #94a3b8; font-size: 10px;">Drabbad areal</div>
                  <div style="font-weight: 700; font-family: monospace;">${(snapshotCountry.affectedHa / 1000).toFixed(0)}k ha</div>
                </div>
                <div style="background: #0d220f; padding: 6px; border-radius: 6px;">
                  <div style="color: #94a3b8; font-size: 10px;">Förlust m3</div>
                  <div style="font-weight: 700; font-family: monospace;">${(c.cubicMetersLost / 1000000).toFixed(0)}M</div>
                </div>
                <div style="background: #0d220f; padding: 6px; border-radius: 6px;">
                  <div style="color: #94a3b8; font-size: 10px;">Avstånd till SE</div>
                  <div style="font-weight: 700; font-family: monospace;">${c.distanceToSwedenKm} km</div>
                </div>
                <div style="background: #0d220f; padding: 6px; border-radius: 6px;">
                  <div style="color: #94a3b8; font-size: 10px;">Relevans</div>
                  <div style="font-weight: 700; font-family: monospace; color: ${c.relevanceForSweden > 80 ? '#ef4444' : c.relevanceForSweden > 60 ? '#f97316' : '#4ade80'};">${c.relevanceForSweden}%</div>
                </div>
              </div>
              <p style="color: #94a3b8; font-size: 11px; line-height: 1.4; margin: 0;">${c.summary}</p>
            </div>
          `);
        popup.addTo(map);
        popupRef.current = popup;
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(c.center)
        .addTo(map);

      markersRef.current.push(marker);

      // Region-level smaller dots
      c.regions.forEach((r) => {
        if (!r.active) return;
        const regionEl = document.createElement('div');
        const regionColor = SEVERITY_COLORS[r.severity];
        const regionSize = Math.min(30, 8 + (r.affectedHa / 5000));
        regionEl.style.cssText = `
          width: ${regionSize}px;
          height: ${regionSize}px;
          border-radius: 50%;
          background: ${regionColor};
          opacity: 0.5;
          box-shadow: 0 0 ${regionSize / 2}px ${regionColor}60;
          animation: pulse-outbreak 2.5s ease-in-out infinite;
        `;

        const regionMarker = new maplibregl.Marker({ element: regionEl })
          .setLngLat([r.lng, r.lat])
          .addTo(map);

        markersRef.current.push(regionMarker);
      });
    });

    // ─── Propagation front lines ───
    propagationFronts.forEach((front) => {
      const sourceId = `front-${front.id}`;
      const layerId = `front-line-${front.id}`;

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: front.coordinates,
          },
        });
      } else {
        map.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: front.coordinates,
            },
          },
        });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ef4444',
            'line-width': 3,
            'line-dasharray': [3, 2],
            'line-opacity': 0.8,
          },
        });

        // Glow line
        map.addLayer({
          id: `${layerId}-glow`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#ef4444',
            'line-width': 10,
            'line-opacity': 0.15,
            'line-blur': 8,
          },
        });
      }
    });

    // ─── Wind corridors as dashed arrows ───
    windCorridors.forEach((wc) => {
      const sourceId = `wind-${wc.id}`;
      const layerId = `wind-line-${wc.id}`;

      const data: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [wc.from, wc.to],
        },
      };

      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(data);
      } else {
        map.addSource(sourceId, { type: 'geojson', data });

        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': '#60a5fa',
            'line-width': 2,
            'line-dasharray': [6, 4],
            'line-opacity': 0.5,
          },
        });
      }
    });

    // ─── Swedish region risk dots ───
    swedishRegionRisks.forEach((sr) => {
      const el = document.createElement('div');
      const riskColor =
        sr.riskScore >= 75
          ? '#ef4444'
          : sr.riskScore >= 50
            ? '#f97316'
            : sr.riskScore >= 30
              ? '#eab308'
              : '#4ade80';
      el.style.cssText = `
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${riskColor};
        border: 2px solid #4ade80;
        opacity: 0.9;
        cursor: pointer;
        box-shadow: 0 0 8px ${riskColor}80;
      `;

      el.addEventListener('click', () => {
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: true,
          maxWidth: '260px',
        })
          .setLngLat([sr.lng, sr.lat])
          .setHTML(`
            <div style="background: #0a1a0d; color: #e2e8f0; padding: 10px; border-radius: 8px; font-size: 12px; border: 1px solid #4ade8040;">
              <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">
                <span style="color: #4ade80;">SE</span> ${sr.region}
              </div>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <span style="font-size: 20px; font-weight: 700; font-family: monospace; color: ${riskColor};">${sr.riskScore}</span>
                <span style="color: #94a3b8; font-size: 10px;">risknivå / 100</span>
              </div>
              <div style="color: #94a3b8; font-size: 11px; line-height: 1.3;">
                <div>Hot: ${sr.primaryThreatFrom}</div>
                <div>Ankomst: ${sr.estimatedArrivalYear}</div>
                <div>Status: ${sr.currentLocalStatus}</div>
              </div>
            </div>
          `);
        popup.addTo(map);
        popupRef.current = popup;
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([sr.lng, sr.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [mapReady, countries, propagationFronts, windCorridors, swedishRegionRisks, timeline, selectedYear]);

  // Timeline years
  const years = timeline.map((t) => t.year);
  const currentSnapshot = timeline.find((t) => t.year === selectedYear);

  return (
    <div className={`relative ${className}`}>
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes pulse-outbreak {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 0.4; }
        }
      `}</style>

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full rounded-xl overflow-hidden" />

      {/* Legend overlay */}
      <div
        className="absolute top-3 left-3 rounded-lg border border-[var(--border)] p-3 text-[10px] space-y-1.5 z-10"
        style={{ background: 'var(--bg2)e6' }}
      >
        <div className="text-[var(--text2)] font-semibold uppercase tracking-wider mb-1">Utbrottsnivå</div>
        {(['critical', 'severe', 'moderate', 'low', 'minimal'] as OutbreakSeverity[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: SEVERITY_COLORS[s] }} />
            <span className="text-[var(--text3)] capitalize">{s}</span>
          </div>
        ))}
        <div className="border-t border-[var(--border)] pt-1.5 mt-1.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-red-500" />
            <span className="text-[var(--text3)]">Spridningsfront</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-0.5 border-t-2 border-dashed border-blue-400" />
            <span className="text-[var(--text3)]">Vindkorridor</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded-full border-2 border-[var(--green)]" style={{ background: '#eab308' }} />
            <span className="text-[var(--text3)]">Svensk region</span>
          </div>
        </div>
      </div>

      {/* Front distance badge */}
      <div
        className="absolute top-3 right-14 rounded-lg border border-red-500/30 px-3 py-2 z-10"
        style={{ background: 'rgba(127, 29, 29, 0.6)' }}
      >
        <div className="text-[10px] text-red-300 uppercase font-semibold tracking-wider">Barkborrefront</div>
        <div className="text-lg font-mono font-bold text-red-400">
          {currentSnapshot ? (currentSnapshot.frontLineKmFromSweden <= 0 ? 'I SVERIGE' : `${currentSnapshot.frontLineKmFromSweden} km`) : '...'}
        </div>
        <div className="text-[10px] text-red-300/70">
          {currentSnapshot && currentSnapshot.frontLineKmFromSweden > 0
            ? 'söder om gränsen'
            : currentSnapshot && currentSnapshot.frontLineKmFromSweden <= 0
              ? 'innanför gränsen'
              : ''}
        </div>
      </div>

      {/* Timeline slider */}
      <div
        className="absolute bottom-4 left-4 right-4 rounded-xl border border-[var(--border)] px-4 py-3 z-10"
        style={{ background: 'var(--bg2)e6' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[var(--text)]">Tidslinje: Europeisk barkborrespridning</span>
          <span className="text-xs font-mono text-[var(--green)]">{selectedYear}</span>
        </div>
        <input
          type="range"
          min={years[0]}
          max={years[years.length - 1]}
          value={selectedYear}
          onChange={(e) => onSelectYear(Number(e.target.value))}
          step={1}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--green) ${((selectedYear - years[0]) / (years[years.length - 1] - years[0])) * 100}%, var(--border) ${((selectedYear - years[0]) / (years[years.length - 1] - years[0])) * 100}%)`,
          }}
        />
        <div className="flex justify-between mt-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => onSelectYear(y)}
              className={`text-[9px] font-mono px-1 rounded transition-colors ${
                y === selectedYear
                  ? 'text-[var(--green)] font-bold'
                  : y > 2026
                    ? 'text-red-400/60 italic'
                    : 'text-[var(--text3)] hover:text-[var(--text)]'
              }`}
            >
              {y}
              {y > 2026 ? '*' : ''}
            </button>
          ))}
        </div>
        {selectedYear > 2026 && (
          <div className="text-[9px] text-red-400/70 italic mt-1 text-right">* Prognos baserad på historisk spridningshastighet</div>
        )}
      </div>
    </div>
  );
}
