import { useEffect, useRef, useCallback, useState } from 'react';
import type maplibregl from 'maplibre-gl';

// ─── Types ───

export type GlowEffect = 'beetle' | 'highValue' | 'storm' | 'growth';

interface GlowConfig {
  beetle: boolean;
  highValue: boolean;
  storm: boolean;
  growth: boolean;
}

interface GlowOverlayProps {
  map: maplibregl.Map | null;
  effects?: Partial<GlowConfig>;
  onEffectsChange?: (effects: GlowConfig) => void;
}

// ─── Demo hotspot data (WGS84 coordinates around Värnamo) ───

interface Hotspot {
  lng: number;
  lat: number;
  radius: number; // pixels at zoom 12
  intensity: number; // 0-1
}

const BEETLE_HOTSPOTS: Hotspot[] = [
  { lng: 14.10, lat: 57.22, radius: 60, intensity: 0.9 },   // Granudden area (infested)
  { lng: 14.06, lat: 57.195, radius: 40, intensity: 0.6 },  // Near Norra Skogen
];

const HIGH_VALUE_STANDS: Hotspot[] = [
  { lng: 13.53, lat: 57.30, radius: 50, intensity: 0.7 },   // Ekbacken
  { lng: 14.16, lat: 57.78, radius: 55, intensity: 0.8 },   // Tallmon
  { lng: 14.04, lat: 57.19, radius: 35, intensity: 0.5 },   // Norra Skogen
];

interface StormCorridor {
  start: { lng: number; lat: number };
  end: { lng: number; lat: number };
  width: number;
}

const STORM_CORRIDORS: StormCorridor[] = [
  {
    start: { lng: 13.85, lat: 57.15 },
    end: { lng: 14.25, lat: 57.25 },
    width: 30,
  },
];

// ─── Canvas overlay rendering ───

function drawBeetleHotspots(
  ctx: CanvasRenderingContext2D,
  map: maplibregl.Map,
  hotspots: Hotspot[],
  time: number,
) {
  for (const spot of hotspots) {
    const point = map.project([spot.lng, spot.lat]);
    const zoom = map.getZoom();
    const scaledRadius = spot.radius * (zoom / 12);

    // Pulsing sine wave
    const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + spot.lng * 10);
    const alpha = spot.intensity * pulse * 0.4;

    // Outer glow
    const gradient = ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, scaledRadius,
    );
    gradient.addColorStop(0, `rgba(239, 68, 68, ${alpha})`);
    gradient.addColorStop(0.4, `rgba(239, 68, 68, ${alpha * 0.6})`);
    gradient.addColorStop(0.7, `rgba(220, 38, 38, ${alpha * 0.2})`);
    gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, scaledRadius, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    const coreGrad = ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, scaledRadius * 0.3,
    );
    coreGrad.addColorStop(0, `rgba(255, 100, 100, ${alpha * 1.2})`);
    coreGrad.addColorStop(1, 'rgba(255, 100, 100, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(point.x, point.y, scaledRadius * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHighValueStands(
  ctx: CanvasRenderingContext2D,
  map: maplibregl.Map,
  stands: Hotspot[],
  time: number,
) {
  for (const stand of stands) {
    const point = map.project([stand.lng, stand.lat]);
    const zoom = map.getZoom();
    const scaledRadius = stand.radius * (zoom / 12);

    // Golden shimmer with multi-frequency oscillation
    const shimmer = 0.6 + 0.2 * Math.sin(time * 0.002 + stand.lat * 20)
                        + 0.2 * Math.sin(time * 0.005 + stand.lng * 15);
    const alpha = stand.intensity * shimmer * 0.35;

    const gradient = ctx.createRadialGradient(
      point.x, point.y, 0,
      point.x, point.y, scaledRadius,
    );
    gradient.addColorStop(0, `rgba(251, 191, 36, ${alpha})`);
    gradient.addColorStop(0.3, `rgba(245, 158, 11, ${alpha * 0.7})`);
    gradient.addColorStop(0.6, `rgba(217, 119, 6, ${alpha * 0.3})`);
    gradient.addColorStop(1, 'rgba(217, 119, 6, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, scaledRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStormCorridors(
  ctx: CanvasRenderingContext2D,
  map: maplibregl.Map,
  corridors: StormCorridor[],
  time: number,
) {
  for (const corridor of corridors) {
    const startPt = map.project([corridor.start.lng, corridor.start.lat]);
    const endPt = map.project([corridor.end.lng, corridor.end.lat]);
    const zoom = map.getZoom();
    const scaledWidth = corridor.width * (zoom / 12);

    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    // Perpendicular direction for width
    const nx = -dy / len;
    const ny = dx / len;

    // Animated streaking effect — particles moving along corridor
    const numStreaks = 8;
    for (let i = 0; i < numStreaks; i++) {
      const phase = (time * 0.001 + i / numStreaks) % 1;
      const px = startPt.x + dx * phase;
      const py = startPt.y + dy * phase;

      // Streak trail
      const trailLen = len * 0.15;
      const tx = px - (dx / len) * trailLen;
      const ty = py - (dy / len) * trailLen;

      // Oscillate perpendicular position
      const offset = Math.sin(phase * Math.PI * 4 + time * 0.003) * scaledWidth * 0.5;

      const streakGrad = ctx.createLinearGradient(tx, ty, px, py);
      const alpha = 0.15 + 0.1 * Math.sin(time * 0.004 + i);
      streakGrad.addColorStop(0, 'rgba(147, 197, 253, 0)');
      streakGrad.addColorStop(0.5, `rgba(147, 197, 253, ${alpha})`);
      streakGrad.addColorStop(1, `rgba(219, 234, 254, ${alpha * 1.5})`);

      ctx.strokeStyle = streakGrad;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(tx + nx * offset, ty + ny * offset);
      ctx.lineTo(px + nx * offset, py + ny * offset);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Corridor glow background
    const corridorGrad = ctx.createLinearGradient(
      startPt.x + nx * scaledWidth, startPt.y + ny * scaledWidth,
      startPt.x - nx * scaledWidth, startPt.y - ny * scaledWidth,
    );
    const bgAlpha = 0.06 + 0.03 * Math.sin(time * 0.002);
    corridorGrad.addColorStop(0, 'rgba(96, 165, 250, 0)');
    corridorGrad.addColorStop(0.3, `rgba(96, 165, 250, ${bgAlpha})`);
    corridorGrad.addColorStop(0.7, `rgba(96, 165, 250, ${bgAlpha})`);
    corridorGrad.addColorStop(1, 'rgba(96, 165, 250, 0)');

    ctx.fillStyle = corridorGrad;
    ctx.beginPath();
    ctx.moveTo(startPt.x + nx * scaledWidth, startPt.y + ny * scaledWidth);
    ctx.lineTo(endPt.x + nx * scaledWidth, endPt.y + ny * scaledWidth);
    ctx.lineTo(endPt.x - nx * scaledWidth, endPt.y - ny * scaledWidth);
    ctx.lineTo(startPt.x - nx * scaledWidth, startPt.y - ny * scaledWidth);
    ctx.closePath();
    ctx.fill();
  }
}

function drawGrowthZones(
  ctx: CanvasRenderingContext2D,
  map: maplibregl.Map,
  time: number,
) {
  // Gentle green breathing across the whole viewport area
  const canvas = ctx.canvas;
  const breathe = 0.5 + 0.5 * Math.sin(time * 0.0015); // slow breathing
  const alpha = 0.04 + 0.03 * breathe;

  // Create a soft green wash with variation
  const center = map.project([14.04, 57.19]);
  const zoom = map.getZoom();
  const spreadRadius = 200 * (zoom / 12);

  const gradient = ctx.createRadialGradient(
    center.x, center.y, 0,
    center.x, center.y, spreadRadius,
  );
  gradient.addColorStop(0, `rgba(74, 222, 128, ${alpha * 1.5})`);
  gradient.addColorStop(0.4, `rgba(34, 197, 94, ${alpha})`);
  gradient.addColorStop(0.8, `rgba(22, 163, 74, ${alpha * 0.5})`);
  gradient.addColorStop(1, 'rgba(22, 163, 74, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add subtle dappled light spots
  const numSpots = 6;
  for (let i = 0; i < numSpots; i++) {
    const angle = (i / numSpots) * Math.PI * 2 + time * 0.0005;
    const dist = spreadRadius * 0.5 + spreadRadius * 0.3 * Math.sin(time * 0.001 + i * 2);
    const sx = center.x + Math.cos(angle) * dist;
    const sy = center.y + Math.sin(angle) * dist;
    const spotRadius = 30 + 20 * Math.sin(time * 0.002 + i);

    const spotGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, spotRadius);
    spotGrad.addColorStop(0, `rgba(74, 222, 128, ${alpha * 0.8})`);
    spotGrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
    ctx.fillStyle = spotGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, spotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Component ───

export function GlowOverlay({ map, effects, onEffectsChange }: GlowOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number>(0);
  const [config, setConfig] = useState<GlowConfig>({
    beetle: true,
    highValue: true,
    storm: true,
    growth: true,
    ...effects,
  });

  // Sync external effects prop
  useEffect(() => {
    if (effects) {
      setConfig((prev) => ({ ...prev, ...effects }));
    }
  }, [effects]);

  const toggleEffect = useCallback((effect: GlowEffect) => {
    setConfig((prev) => {
      const next = { ...prev, [effect]: !prev[effect] };
      onEffectsChange?.(next);
      return next;
    });
  }, [onEffectsChange]);

  // Resize canvas to match map container
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current || !map) return;
    const container = map.getContainer();
    const dpr = window.devicePixelRatio || 1;
    canvasRef.current.width = container.clientWidth * dpr;
    canvasRef.current.height = container.clientHeight * dpr;
    canvasRef.current.style.width = `${container.clientWidth}px`;
    canvasRef.current.style.height = `${container.clientHeight}px`;
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);
  }, [map]);

  // Animation loop
  const animate = useCallback((time: number) => {
    if (!canvasRef.current || !map) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    const container = map.getContainer();
    ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

    // Draw enabled effects
    if (config.growth) {
      drawGrowthZones(ctx, map, time);
    }
    if (config.storm) {
      drawStormCorridors(ctx, map, STORM_CORRIDORS, time);
    }
    if (config.highValue) {
      drawHighValueStands(ctx, map, HIGH_VALUE_STANDS, time);
    }
    if (config.beetle) {
      drawBeetleHotspots(ctx, map, BEETLE_HOTSPOTS, time);
    }

    ctx.restore();

    animRef.current = requestAnimationFrame(animate);
  }, [map, config]);

  // Setup canvas and animation
  useEffect(() => {
    if (!map) return;

    // Create canvas if not exists
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '5';
      canvas.setAttribute('aria-hidden', 'true');
      map.getContainer().appendChild(canvas);
      canvasRef.current = canvas;
    }

    resizeCanvas();

    // Re-render on map events
    const onMove = () => {}; // animation loop handles this
    const onResize = () => resizeCanvas();

    map.on('move', onMove);
    map.on('resize', onResize);
    window.addEventListener('resize', onResize);

    // Start animation
    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      map.off('move', onMove);
      map.off('resize', onResize);
      window.removeEventListener('resize', onResize);
      if (canvasRef.current && canvasRef.current.parentNode) {
        canvasRef.current.parentNode.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, [map, animate, resizeCanvas]);

  // Render toggle controls
  const anyActive = config.beetle || config.highValue || config.storm || config.growth;

  return (
    <div
      className="absolute top-4 left-4 z-20 rounded-xl border border-[var(--border)] overflow-hidden shadow-lg"
      style={{ background: 'rgba(var(--bg-rgb, 3,13,5), 0.88)' }}
      role="group"
      aria-label="Glow overlay effect toggles"
    >
      <div className="px-3 py-1.5 border-b border-[var(--border)] flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${anyActive ? 'bg-[var(--green)] animate-pulse' : 'bg-[var(--text3)]'}`}
        />
        <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
          Effekter
        </span>
      </div>
      <div className="px-2 py-1.5 space-y-0.5">
        {([
          { key: 'beetle' as const, label: 'Barkborre', color: '#ef4444', desc: 'Beetle hotspots' },
          { key: 'highValue' as const, label: 'Högt värde', color: '#fbbf24', desc: 'High-value stands' },
          { key: 'storm' as const, label: 'Stormkorridor', color: '#60a5fa', desc: 'Storm corridors' },
          { key: 'growth' as const, label: 'Tillväxtzon', color: '#4ade80', desc: 'Growth zones' },
        ]).map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-2 px-1 py-0.5 rounded cursor-pointer
                       hover:bg-[var(--bg3)] transition-colors group"
          >
            <input
              type="checkbox"
              checked={config[item.key]}
              onChange={() => toggleEffect(item.key)}
              className="w-2.5 h-2.5 rounded-sm border-[var(--border)] bg-[var(--bg)]
                         accent-[var(--green)] cursor-pointer"
              aria-label={`Toggle ${item.desc}`}
            />
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color, opacity: config[item.key] ? 1 : 0.3 }}
            />
            <span className={`text-[10px] ${config[item.key] ? 'text-[var(--text2)]' : 'text-[var(--text3)]'}
                             group-hover:text-[var(--text)]`}>
              {item.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
