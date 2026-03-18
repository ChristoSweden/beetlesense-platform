/**
 * MillMap — Interactive MapLibre map showing mill locations, user parcels, and demand signals.
 */

import { useRef, useEffect, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MillWithDistance, DemandLevel } from '@/hooks/useMillDemand';
import { DEMO_PARCELS } from '@/lib/demoData';

const DEMAND_HEX: Record<DemandLevel, string> = {
  high: '#4ade80',
  normal: '#fbbf24',
  low: '#ef4444',
};

// Dark map style matching BeetleSense design
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Mills',
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
      id: 'osm-layer',
      type: 'raster',
      source: 'osm-raster',
      paint: {
        'raster-brightness-max': 0.4,
        'raster-brightness-min': 0.0,
        'raster-contrast': 0.3,
        'raster-saturation': -0.6,
      },
    },
  ],
};

interface MillMapProps {
  mills: MillWithDistance[];
  onSelectMill?: (millId: string) => void;
  selectedMillId?: string | null;
  filterDemand?: DemandLevel | 'all';
  filterType?: string;
  filterMaxDistance?: number;
}

export function MillMap({
  mills,
  onSelectMill,
  selectedMillId,
  filterDemand = 'all',
  filterType = 'all',
  filterMaxDistance = 9999,
}: MillMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const [_filtersOpen, _setFiltersOpen] = useState(false);

  // Filter mills
  const filteredMills = mills.filter((m) => {
    if (filterDemand !== 'all' && m.demandLevel !== filterDemand) return false;
    if (filterType !== 'all' && !m.type.includes(filterType as any)) return false;
    if (m.distanceKm > filterMaxDistance) return false;
    return true;
  });

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [15.5, 59.5], // Center of Sweden
      zoom: 4.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add parcel markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Wait for map load
    const addParcels = () => {
      for (const p of DEMO_PARCELS) {
        const el = document.createElement('div');
        el.className = 'mill-map-parcel-marker';
        el.style.cssText = `
          width: 12px; height: 12px; border-radius: 50%;
          background: #4ade80; border: 2px solid #030d05;
          box-shadow: 0 0 8px rgba(74, 222, 128, 0.4);
          cursor: pointer;
        `;
        el.title = p.name;

        new maplibregl.Marker({ element: el })
          .setLngLat([p.center[0], p.center[1]])
          .setPopup(
            new maplibregl.Popup({ offset: 8, closeButton: false })
              .setHTML(`
                <div style="background:#0a1f0d;color:#e8f5e9;padding:8px 12px;border-radius:8px;font-size:12px;border:1px solid #1a3a1e;">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                    <span style="color:#4ade80;">&#x1F332;</span>
                    <strong>${p.name}</strong>
                  </div>
                  <div style="color:#9ca3af;font-size:10px;">${p.area_hectares} ha &middot; ${p.municipality}</div>
                </div>
              `)
          )
          .addTo(map);
      }
    };

    if (map.isStyleLoaded()) addParcels();
    else map.on('load', addParcels);
  }, []);

  // Add mill markers (reactive to filters)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    for (const m of markersRef.current) m.remove();
    markersRef.current = [];
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

    const addMarkers = () => {
      for (const mill of filteredMills) {
        const color = DEMAND_HEX[mill.demandLevel];
        const isSelected = mill.id === selectedMillId;
        const size = isSelected ? 22 : 16;

        const el = document.createElement('div');
        el.style.cssText = `
          width: ${size}px; height: ${size}px; border-radius: 4px;
          background: ${color}; border: 2px solid ${isSelected ? '#fff' : '#030d05'};
          box-shadow: 0 0 ${isSelected ? 16 : 8}px ${color}80;
          cursor: pointer; transform: rotate(45deg);
          transition: all 0.2s;
        `;
        el.title = `${mill.company} ${mill.name}`;

        el.addEventListener('mouseenter', () => {
          el.style.transform = 'rotate(45deg) scale(1.3)';
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = 'rotate(45deg) scale(1)';
        });

        const popup = new maplibregl.Popup({ offset: 12, closeButton: false, maxWidth: '280px' })
          .setHTML(`
            <div style="background:#0a1f0d;color:#e8f5e9;padding:12px 16px;border-radius:10px;font-size:12px;border:1px solid #1a3a1e;min-width:220px;">
              <div style="font-weight:600;margin-bottom:2px;">${mill.company} ${mill.name}</div>
              <div style="color:#9ca3af;font-size:10px;margin-bottom:8px;">${mill.municipality} &middot; ${mill.type.join(', ')}</div>
              <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <span style="color:#9ca3af;">Beläggning</span>
                <span style="color:${color};font-weight:600;">${mill.utilization}%</span>
              </div>
              <div style="background:#030d05;height:6px;border-radius:3px;overflow:hidden;margin-bottom:8px;">
                <div style="height:100%;width:${mill.utilization}%;background:${color};border-radius:3px;"></div>
              </div>
              ${mill.assortments.map((a) => `
                <div style="display:flex;justify-content:space-between;margin-bottom:2px;">
                  <span style="color:#9ca3af;font-size:10px;">${a.name}</span>
                  <span style="font-family:monospace;font-size:11px;color:#e8f5e9;">${a.currentPrice} SEK/${a.unit}</span>
                </div>
              `).join('')}
              <div style="margin-top:8px;padding-top:8px;border-top:1px solid #1a3a1e;display:flex;justify-content:space-between;">
                <span style="color:#9ca3af;font-size:10px;">${mill.distanceKm} km</span>
                <span style="color:#fbbf24;font-size:10px;">~${mill.transportCostSEK} SEK/m\u00b3 transport</span>
              </div>
            </div>
          `);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([mill.location.lng, mill.location.lat])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', () => {
          onSelectMill?.(mill.id);
        });

        markersRef.current.push(marker);
      }
    };

    if (map.isStyleLoaded()) addMarkers();
    else map.on('load', addMarkers);
  }, [filteredMills, selectedMillId, onSelectMill]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-[var(--border)]">
      <div ref={containerRef} className="w-full h-full" />

      {/* Legend */}
      <div
        className="absolute bottom-4 left-4 z-10 rounded-lg border border-[var(--border)] p-3"
        style={{ background: 'var(--surface)' }}
      >
        <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-2">Efterfrågan</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm rotate-45" style={{ background: '#4ade80' }} />
            <span className="text-[10px] text-[var(--text)]">Hög (bra för säljare)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm rotate-45" style={{ background: '#fbbf24' }} />
            <span className="text-[10px] text-[var(--text)]">Normal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm rotate-45" style={{ background: '#ef4444' }} />
            <span className="text-[10px] text-[var(--text)]">Låg</span>
          </div>
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-[var(--border)]">
            <div className="w-3 h-3 rounded-full" style={{ background: '#4ade80' }} />
            <span className="text-[10px] text-[var(--text)]">Dina skiften</span>
          </div>
        </div>
      </div>

      {/* Mill count */}
      <div
        className="absolute top-4 left-4 z-10 rounded-lg border border-[var(--border)] px-3 py-2"
        style={{ background: 'var(--surface)' }}
      >
        <span className="text-xs text-[var(--text)]">
          <span className="font-mono font-semibold text-[var(--green)]">{filteredMills.length}</span> bruk/sågverk visas
        </span>
      </div>
    </div>
  );
}
