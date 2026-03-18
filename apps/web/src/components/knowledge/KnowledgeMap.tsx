import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import { useTranslation } from 'react-i18next';
import { Locate } from 'lucide-react';
import {
  CATEGORY_CONFIG,
  type KnowledgeNote,
  type KnowledgeCategory,
} from '@/hooks/useKnowledgeCapture';

// Dark map style matching BeetleSense design system
const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  name: 'BeetleSense Knowledge',
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

interface KnowledgeMapProps {
  notes: KnowledgeNote[];
  enabledCategories: Set<KnowledgeCategory>;
  onNoteClick?: (note: KnowledgeNote) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export function KnowledgeMap({
  notes,
  enabledCategories,
  onNoteClick,
  onMapClick,
  className = '',
}: KnowledgeMapProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [14.165, 57.783],
      zoom: 13,
      attributionControl: false,
      maxZoom: 18,
      minZoom: 3,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    map.on('load', () => {
      setMapReady(true);
    });

    if (onMapClick) {
      map.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };

  }, []);

  // Update markers when notes/filters change
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    // Clear existing
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filteredNotes = notes.filter((n) => enabledCategories.has(n.category));

    // Cluster logic: if zoomed out (< 12), group nearby markers
    const map = mapRef.current;
    const zoom = map.getZoom();

    if (zoom < 12 && filteredNotes.length > 10) {
      // Simple grid clustering
      const clusters = new Map<string, { lat: number; lng: number; count: number; notes: KnowledgeNote[] }>();
      const gridSize = 0.02;

      filteredNotes.forEach((note) => {
        const key = `${Math.floor(note.lat / gridSize)},${Math.floor(note.lng / gridSize)}`;
        const existing = clusters.get(key);
        if (existing) {
          existing.count++;
          existing.notes.push(note);
          existing.lat = (existing.lat * (existing.count - 1) + note.lat) / existing.count;
          existing.lng = (existing.lng * (existing.count - 1) + note.lng) / existing.count;
        } else {
          clusters.set(key, { lat: note.lat, lng: note.lng, count: 1, notes: [note] });
        }
      });

      clusters.forEach((cluster) => {
        if (cluster.count > 1) {
          const el = document.createElement('div');
          el.className = 'knowledge-cluster';
          el.style.cssText = `
            width: 32px; height: 32px; border-radius: 50%;
            background: rgba(74, 222, 128, 0.2); border: 2px solid #4ade80;
            display: flex; align-items: center; justify-content: center;
            font-size: 11px; font-weight: 600; color: #4ade80;
            cursor: pointer; font-family: monospace;
          `;
          el.textContent = String(cluster.count);
          el.addEventListener('click', () => {
            map.flyTo({ center: [cluster.lng, cluster.lat], zoom: 14, duration: 800 });
          });

          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([cluster.lng, cluster.lat])
            .addTo(map);
          markersRef.current.push(marker);
        } else {
          addNoteMarker(cluster.notes[0], map);
        }
      });
    } else {
      filteredNotes.forEach((note) => addNoteMarker(note, map));
    }

  }, [mapReady, notes, enabledCategories]);

  const addNoteMarker = useCallback(
    (note: KnowledgeNote, map: maplibregl.Map) => {
      const cat = CATEGORY_CONFIG[note.category];
      const catLabel = lang === 'sv' ? cat.labelSv : cat.labelEn;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: ${cat.colorBg}; border: 2px solid ${cat.color};
        cursor: pointer; transition: transform 0.15s;
      `;
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.3)';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: false,
        maxWidth: '260px',
      }).setHTML(`
        <div style="padding: 8px; font-family: system-ui; background: #0a1a0d; border-radius: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 600; color: ${cat.color}; background: ${cat.colorBg}; padding: 2px 6px; border-radius: 4px;">${catLabel}</span>
          </div>
          <p style="font-size: 12px; color: #d4d4d8; line-height: 1.4; margin: 0 0 4px;">${note.text.length > 120 ? note.text.slice(0, 120) + '...' : note.text}</p>
          <p style="font-size: 10px; color: #71717a; margin: 0;">${note.standName ?? ''} &middot; ${note.recordedBy}</p>
        </div>
      `);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onNoteClick?.(note);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([note.lng, note.lat])
        .setPopup(popup)
        .addTo(map);
      markersRef.current.push(marker);
    },
    [lang, onNoteClick],
  );

  const handleLocate = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        mapRef.current?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 14,
          duration: 1500,
        });
      },
      () => {},
      { enableHighAccuracy: true },
    );
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />

      {/* My location button */}
      <button
        onClick={handleLocate}
        className="absolute top-4 right-4 z-10 p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
        style={{ background: 'var(--surface)' }}
        aria-label={t('map.locateMe')}
      >
        <Locate size={18} />
      </button>
    </div>
  );
}
