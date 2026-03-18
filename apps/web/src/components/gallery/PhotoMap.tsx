import { useRef, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { GalleryPhoto } from '@/hooks/usePhotoGallery';

// ─── Marker color by annotation ───

function getMarkerColor(photo: GalleryPhoto): string {
  if (!photo.annotation) return '#6b7280'; // gray
  switch (photo.annotation.primaryTag) {
    case 'beetle_damage':
    case 'exit_holes':
    case 'storm_damage':
      return '#ef4444'; // red
    case 'healthy_bark':
      return '#22c55e'; // green
    case 'resin_flow':
    case 'crown_discoloration':
      return '#f59e0b'; // amber
    default:
      return '#6b7280';
  }
}

// ─── Clustering logic ───

interface Cluster {
  id: string;
  latitude: number;
  longitude: number;
  photos: GalleryPhoto[];
  dominantColor: string;
}

function clusterPhotos(photos: GalleryPhoto[], zoomLevel: number): Cluster[] {
  const geoPhotos = photos.filter((p) => p.gps);
  if (geoPhotos.length === 0) return [];

  // Cluster radius in degrees scales with zoom level
  const radius = 0.5 / Math.pow(2, zoomLevel - 6);
  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const photo of geoPhotos) {
    if (assigned.has(photo.id)) continue;

    const cluster: GalleryPhoto[] = [photo];
    assigned.add(photo.id);

    for (const other of geoPhotos) {
      if (assigned.has(other.id)) continue;
      const dx = Math.abs(photo.gps!.longitude - other.gps!.longitude);
      const dy = Math.abs(photo.gps!.latitude - other.gps!.latitude);
      if (dx < radius && dy < radius) {
        cluster.push(other);
        assigned.add(other.id);
      }
    }

    const avgLat = cluster.reduce((s, p) => s + p.gps!.latitude, 0) / cluster.length;
    const avgLng = cluster.reduce((s, p) => s + p.gps!.longitude, 0) / cluster.length;

    // Dominant color is the most frequent marker color
    const colorCounts = new Map<string, number>();
    for (const p of cluster) {
      const c = getMarkerColor(p);
      colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
    }
    const dominantColor = [...colorCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

    clusters.push({
      id: `cluster_${photo.id}`,
      latitude: avgLat,
      longitude: avgLng,
      photos: cluster,
      dominantColor,
    });
  }

  return clusters;
}

// ─── Component ───

interface PhotoMapProps {
  photos: GalleryPhoto[];
  onPhotoClick: (photo: GalleryPhoto) => void;
  className?: string;
}

export function PhotoMap({ photos, onPhotoClick, className = '' }: PhotoMapProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [zoom, setZoom] = useState(8);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 57.25, lng: 14.0 });
  const [hoveredCluster, setHoveredCluster] = useState<Cluster | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, lat: 0, lng: 0 });

  const geoPhotos = photos.filter((p) => p.gps);

  // Auto-fit to photo bounds
  useEffect(() => {
    if (geoPhotos.length === 0) return;
    const lats = geoPhotos.map((p) => p.gps!.latitude);
    const lngs = geoPhotos.map((p) => p.gps!.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    setCenter({ lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 });
    const span = Math.max(maxLat - minLat, maxLng - minLng);
    if (span > 0) {
      const z = Math.max(6, Math.min(14, Math.floor(Math.log2(180 / span)) + 1));
      setZoom(z);
    }
  }, [geoPhotos.length]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Project lat/lng to canvas coordinates
  const project = useCallback(
    (lat: number, lng: number) => {
      const scale = Math.pow(2, zoom) * 2;
      const x = dimensions.width / 2 + (lng - center.lng) * scale;
      const y = dimensions.height / 2 - (lat - center.lat) * scale;
      return { x, y };
    },
    [center, zoom, dimensions],
  );

  // Unproject canvas coordinates to lat/lng
  const _unproject = useCallback(
    (x: number, y: number) => {
      const scale = Math.pow(2, zoom) * 2;
      const lng = (x - dimensions.width / 2) / scale + center.lng;
      const lat = -(y - dimensions.height / 2) / scale + center.lat;
      return { lat, lng };
    },
    [center, zoom, dimensions],
  );

  // Get clusters
  const clusters = clusterPhotos(geoPhotos, zoom);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width * window.devicePixelRatio;
    canvas.height = dimensions.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Background
    ctx.fillStyle = '#0a1f0c';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.06)';
    ctx.lineWidth = 0.5;
    const gridStep = Math.pow(2, zoom) * 2;
    const startLng = Math.floor(center.lng - dimensions.width / (2 * gridStep));
    const endLng = Math.ceil(center.lng + dimensions.width / (2 * gridStep));
    const startLat = Math.floor(center.lat - dimensions.height / (2 * gridStep));
    const endLat = Math.ceil(center.lat + dimensions.height / (2 * gridStep));

    for (let lng = startLng; lng <= endLng; lng++) {
      const { x } = project(0, lng);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }
    for (let lat = startLat; lat <= endLat; lat++) {
      const { y } = project(lat, 0);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }

    // Draw clusters/markers
    for (const cluster of clusters) {
      const { x, y } = project(cluster.latitude, cluster.longitude);

      if (x < -30 || x > dimensions.width + 30 || y < -30 || y > dimensions.height + 30) continue;

      if (cluster.photos.length === 1) {
        // Single marker
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = cluster.dominantColor;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Inner dot
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else {
        // Cluster marker
        const r = Math.min(24, 12 + cluster.photos.length * 1.5);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = cluster.dominantColor;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Count label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, 10 + cluster.photos.length * 0.5)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(cluster.photos.length), x, y);
      }
    }
  }, [clusters, dimensions, project, center, zoom]);

  // Mouse interactions
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY, lat: center.lat, lng: center.lng };
    },
    [center],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (isDragging.current) {
        const scale = Math.pow(2, zoom) * 2;
        const dx = (e.clientX - dragStart.current.x) / scale;
        const dy = (e.clientY - dragStart.current.y) / scale;
        setCenter({ lat: dragStart.current.lat + dy, lng: dragStart.current.lng - dx });
        setHoveredCluster(null);
        return;
      }

      // Check hover on clusters
      let found: Cluster | null = null;
      for (const cluster of clusters) {
        const { x, y } = project(cluster.latitude, cluster.longitude);
        const r = cluster.photos.length === 1 ? 8 : Math.min(24, 12 + cluster.photos.length * 1.5);
        const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
        if (dist <= r + 4) {
          found = cluster;
          setTooltipPos({ x: mx, y: my });
          break;
        }
      }
      setHoveredCluster(found);
    },
    [zoom, clusters, project],
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      for (const cluster of clusters) {
        const { x, y } = project(cluster.latitude, cluster.longitude);
        const r = cluster.photos.length === 1 ? 8 : Math.min(24, 12 + cluster.photos.length * 1.5);
        const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
        if (dist <= r + 4) {
          if (cluster.photos.length === 1) {
            onPhotoClick(cluster.photos[0]);
          } else {
            // Zoom into cluster
            setCenter({ lat: cluster.latitude, lng: cluster.longitude });
            setZoom((z) => Math.min(16, z + 2));
          }
          break;
        }
      }
    },
    [clusters, project, onPhotoClick],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(4, Math.min(16, z + (e.deltaY < 0 ? 0.5 : -0.5))));
  }, []);

  if (geoPhotos.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg2)] ${className}`}>
        <div className="text-center py-12">
          <MapPin size={24} className="mx-auto mb-2 text-[var(--text3)]" />
          <p className="text-sm text-[var(--text3)]">{t('gallery.noGpsPhotos')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-xl border border-[var(--border)] overflow-hidden ${className}`}>
      <div
        ref={containerRef}
        className="w-full h-full min-h-[300px] cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ width: dimensions.width, height: dimensions.height }}
        />
      </div>

      {/* Tooltip */}
      {hoveredCluster && !isDragging.current && (
        <div
          className="absolute z-20 pointer-events-none"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 40,
          }}
        >
          <div className="bg-black/90 border border-white/10 rounded-lg px-3 py-2 shadow-xl min-w-[140px]">
            {hoveredCluster.photos.length === 1 ? (
              <div className="flex items-center gap-2">
                <img
                  src={hoveredCluster.photos[0].thumbnailUrl}
                  alt=""
                  className="w-10 h-8 rounded object-cover"
                />
                <div>
                  <p className="text-[10px] text-white font-medium">
                    {hoveredCluster.photos[0].parcelName ?? hoveredCluster.photos[0].prompt.replace('_', ' ')}
                  </p>
                  {hoveredCluster.photos[0].annotation && (
                    <p className="text-[9px] text-white/50">
                      {hoveredCluster.photos[0].annotation.primaryLabel} — {hoveredCluster.photos[0].annotation.confidence}%
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {hoveredCluster.photos.slice(0, 3).map((p) => (
                    <img
                      key={p.id}
                      src={p.thumbnailUrl}
                      alt=""
                      className="w-8 h-6 rounded object-cover border border-black"
                    />
                  ))}
                </div>
                <p className="text-[10px] text-white font-medium">
                  {hoveredCluster.photos.length} {t('gallery.photos')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        <button
          onClick={() => setZoom((z) => Math.min(16, z + 1))}
          className="w-8 h-8 rounded-lg bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/90 transition-colors"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(4, z - 1))}
          className="w-8 h-8 rounded-lg bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/90 transition-colors"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => {
            if (geoPhotos.length > 0) {
              const lats = geoPhotos.map((p) => p.gps!.latitude);
              const lngs = geoPhotos.map((p) => p.gps!.longitude);
              setCenter({
                lat: (Math.min(...lats) + Math.max(...lats)) / 2,
                lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
              });
            }
          }}
          className="w-8 h-8 rounded-lg bg-black/70 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/90 transition-colors"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-black/70 border border-white/10 rounded-lg px-3 py-2">
        <div className="flex items-center gap-3 text-[9px]">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-white/60">{t('gallery.tags.damage')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-white/60">{t('gallery.tags.healthy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-white/60">{t('gallery.tags.unclear')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
