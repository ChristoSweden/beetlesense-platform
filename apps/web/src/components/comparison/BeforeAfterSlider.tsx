import { useRef, useState, useCallback, useEffect, type PointerEvent as ReactPointerEvent } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

/* ── Sentinel-2 tile URLs for comparison ── */
const SENTINEL_TILE_URL =
  'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg';

// In production, dated tiles from Sentinel Hub or a WMS time-param would be used.
// For demo, we simulate visual difference via raster-hue-rotate.

interface BeforeAfterSliderProps {
  center: [number, number];
  zoom: number;
  beforeDate: string;
  afterDate: string;
  className?: string;
}

export function BeforeAfterSlider({
  center,
  zoom,
  beforeDate,
  afterDate,
  className = '',
}: BeforeAfterSliderProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const afterContainerRef = useRef<HTMLDivElement>(null);
  const beforeContainerRef = useRef<HTMLDivElement>(null);
  const beforeMapRef = useRef<maplibregl.Map | null>(null);
  const afterMapRef = useRef<maplibregl.Map | null>(null);
  const [sliderPos, setSliderPos] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const [beforeLoaded, setBeforeLoaded] = useState(false);
  const [afterLoaded, setAfterLoaded] = useState(false);
  const syncingRef = useRef(false);

  /* ── Satellite map style with different hue to simulate dates ── */
  const makeStyle = (hueRotate: number, saturation: number): maplibregl.StyleSpecification => ({
    version: 8,
    name: 'BeetleSense Satellite',
    sources: {
      'satellite-source': {
        type: 'raster',
        tiles: [SENTINEL_TILE_URL],
        tileSize: 256,
        maxzoom: 15,
        attribution: '&copy; Sentinel-2 cloudless by EOX',
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': '#030d05' },
      },
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite-source',
        paint: {
          'raster-hue-rotate': hueRotate,
          'raster-saturation': saturation,
          'raster-brightness-max': hueRotate === 0 ? 1.0 : 0.85,
        },
      },
    ],
  });

  /* ── Initialize both maps ── */
  useEffect(() => {
    const afterEl = afterContainerRef.current;
    const beforeEl = beforeContainerRef.current;
    if (!afterEl || !beforeEl) return;

    // "After" map: the base interactive map (full size, z-index lower)
    const afterMap = new maplibregl.Map({
      container: afterEl,
      style: makeStyle(0, 0),
      center,
      zoom,
      attributionControl: false,
    });

    // "Before" map: overlaid on top, clipped by the slider
    const beforeMap = new maplibregl.Map({
      container: beforeEl,
      style: makeStyle(30, -0.2), // shifted hue to simulate older imagery
      center,
      zoom,
      attributionControl: false,
      interactive: false, // only the after map handles interaction
    });

    beforeMap.on('load', () => setBeforeLoaded(true));
    afterMap.on('load', () => setAfterLoaded(true));

    // Sync: mirror after-map movements onto before-map
    const syncBefore = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      beforeMap.jumpTo({
        center: afterMap.getCenter(),
        zoom: afterMap.getZoom(),
        bearing: afterMap.getBearing(),
        pitch: afterMap.getPitch(),
      });
      syncingRef.current = false;
    };

    afterMap.on('move', syncBefore);

    beforeMapRef.current = beforeMap;
    afterMapRef.current = afterMap;

    return () => {
      afterMap.off('move', syncBefore);
      beforeMap.remove();
      afterMap.remove();
      beforeMapRef.current = null;
      afterMapRef.current = null;
      setBeforeLoaded(false);
      setAfterLoaded(false);
    };

  }, [center[0], center[1], zoom]);

  /* ── Pointer-based drag ── */
  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      updateSlider(e.clientX);
    },
    [updateSlider],
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!isDragging) return;
      updateSlider(e.clientX);
    },
    [isDragging, updateSlider],
  );

  const onPointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden rounded-xl border border-[var(--border)] ${className}`}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* After map — base layer, full size, interactive */}
      <div className="absolute inset-0 z-0">
        <div ref={afterContainerRef} className="w-full h-full" />
      </div>

      {/* Before map — overlay, clipped to left portion, non-interactive */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <div ref={beforeContainerRef} className="w-full h-full" />
      </div>

      {/* Date labels */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur-sm">
          {t('comparison.before')}: {formatDate(beforeDate)}
        </span>
      </div>
      <div className="absolute top-3 right-3 z-20 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-xs font-medium backdrop-blur-sm">
          {t('comparison.after')}: {formatDate(afterDate)}
        </span>
      </div>

      {/* Slider divider line + handle */}
      <div
        className="absolute top-0 bottom-0 z-30 flex items-center"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        {/* Vertical line */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-lg" />

        {/* Drag handle */}
        <div
          className={`relative w-10 h-10 rounded-full border-2 border-white bg-[var(--green)] shadow-xl flex items-center justify-center cursor-ew-resize transition-transform ${
            isDragging ? 'scale-110' : 'hover:scale-105'
          }`}
          onPointerDown={onPointerDown}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 10 : 2;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault();
              setSliderPos((prev) => Math.max(2, prev - step));
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault();
              setSliderPos((prev) => Math.min(98, prev + step));
            } else if (e.key === 'Home') {
              e.preventDefault();
              setSliderPos(2);
            } else if (e.key === 'End') {
              e.preventDefault();
              setSliderPos(98);
            }
          }}
          role="slider"
          aria-label={t('comparison.dragToCompare')}
          aria-valuenow={Math.round(sliderPos)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`Showing ${Math.round(sliderPos)}% before, ${Math.round(100 - sliderPos)}% after`}
          tabIndex={0}
        >
          {/* Double-arrow icon */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-white">
            <path
              d="M5 9L2 6M2 6L5 3M2 6H8M13 9L16 12M16 12L13 15M16 12H10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Drag hint */}
      {!isDragging && beforeLoaded && afterLoaded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse">
          <span className="px-3 py-1.5 rounded-full bg-black/60 text-white text-[11px] backdrop-blur-sm">
            {t('comparison.dragToCompare')}
          </span>
        </div>
      )}

      {/* Loading overlays */}
      {!beforeLoaded && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--bg)]/80"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
        </div>
      )}
      {!afterLoaded && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center bg-[var(--bg)]/80"
          style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}
        >
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
        </div>
      )}
    </div>
  );
}
