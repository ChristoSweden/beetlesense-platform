import { useRef, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  type ArchiveEvent,

  EVENT_TYPE_COLORS,
} from '@/hooks/useForestArchive';

// Dark map style matching BeetleSense design
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Archive',
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

interface ArchiveMapProps {
  events: ArchiveEvent[];
  decadeFilter?: number | null;
  onEventClick?: (event: ArchiveEvent) => void;
}

export function ArchiveMap({ events, decadeFilter, onEventClick }: ArchiveMapProps) {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [selectedDecade, setSelectedDecade] = useState<number | null>(decadeFilter ?? null);

  // Filter events with coordinates
  const geoEvents = useMemo(() => {
    let filtered = events.filter((e) => e.lat && e.lng);
    if (selectedDecade !== null) {
      const start = selectedDecade;
      const end = selectedDecade + 10;
      filtered = filtered.filter((e) => {
        const year = new Date(e.date).getFullYear();
        return year >= start && year < end;
      });
    }
    return filtered;
  }, [events, selectedDecade]);

  // Available decades
  const decades = useMemo(() => {
    const set = new Set<number>();
    events.forEach((e) => {
      if (e.lat && e.lng) {
        const year = new Date(e.date).getFullYear();
        set.add(Math.floor(year / 10) * 10);
      }
    });
    return Array.from(set).sort();
  }, [events]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DARK_STYLE,
      center: [14.78, 56.88], // Kronoberg, Småland
      zoom: 12,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    geoEvents.forEach((event) => {
      if (!event.lat || !event.lng) return;

      const color = EVENT_TYPE_COLORS[event.type];

      // Create custom marker element
      const el = document.createElement('div');
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.background = color;
      el.style.border = '3px solid #030d05';
      el.style.cursor = 'pointer';
      el.style.boxShadow = `0 0 8px ${color}40`;
      el.style.transition = 'transform 0.15s';
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const year = new Date(event.date).getFullYear();

      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: true,
        maxWidth: '240px',
      }).setHTML(`
        <div style="font-family: system-ui; padding: 4px 0;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></span>
            <strong style="font-size:13px;color:#e8f5e9;">${event.title}</strong>
          </div>
          <p style="font-size:11px;color:#9ca3af;margin:0 0 4px 0;">${year} &middot; ${event.recordedBy}</p>
          <p style="font-size:11px;color:#d1d5db;margin:0;line-height:1.4;">${event.description.slice(0, 120)}${event.description.length > 120 ? '...' : ''}</p>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([event.lng, event.lat])
        .setPopup(popup)
        .addTo(map);

      if (onEventClick) {
        el.addEventListener('click', () => onEventClick(event));
      }

      markersRef.current.push(marker);
    });

    // Fit bounds if we have events
    if (geoEvents.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      geoEvents.forEach((e) => {
        if (e.lat && e.lng) bounds.extend([e.lng, e.lat]);
      });
      map.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    }
  }, [geoEvents, onEventClick]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden border border-[var(--border)]">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Time slider */}
      {decades.length > 0 && (
        <div
          className="absolute bottom-4 left-4 right-4 flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)]"
          style={{ background: 'var(--bg2)', opacity: 0.95 }}
        >
          <span className="text-[10px] font-mono text-[var(--text3)] uppercase flex-shrink-0">
            {t('archive.decade')}
          </span>
          <button
            onClick={() => setSelectedDecade(null)}
            className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
              selectedDecade === null
                ? 'bg-[var(--green)]/20 text-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text)]'
            }`}
          >
            {t('archive.allTime')}
          </button>
          {decades.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDecade(d === selectedDecade ? null : d)}
              className={`px-2 py-1 text-[10px] font-mono rounded transition-colors ${
                selectedDecade === d
                  ? 'bg-[var(--green)]/20 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text)]'
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      )}

      {/* Aerial photo overlay placeholder */}
      <div
        className="absolute top-4 left-4 px-3 py-1.5 rounded-lg border border-[var(--border)] text-[10px] font-mono text-[var(--text3)]"
        style={{ background: 'var(--bg2)', opacity: 0.9 }}
      >
        {t('archive.aerialOverlayPlaceholder')}
      </div>
    </div>
  );
}
