import { useEffect, useRef, useCallback } from 'react';
import type maplibregl from 'maplibre-gl';
import { useFusionStore } from '@/stores/fusionStore';

interface RiskFlowFieldProps {
  map: maplibregl.Map | null;
}

// ─── Risk source definitions ───

interface RiskSource {
  id: string;
  label: string;
  type: 'beetle' | 'storm' | 'drought';
  /** [lng, lat] of source */
  origin: [number, number];
  /** [lng, lat] flow target (user's parcels area) */
  target: [number, number];
  /** Number of particles from this source */
  particleCount: number;
  /** Speed multiplier (1 = normal) */
  speed: number;
  /** Confidence: 0-1, affects particle density variation */
  confidence: number;
}

const RISK_SOURCES: RiskSource[] = [
  {
    id: 'beetle-north',
    label: 'Barkborreutbrott (4 km N)',
    type: 'beetle',
    origin: [14.04, 57.215],
    target: [14.04, 57.185],
    particleCount: 120,
    speed: 1.2,
    confidence: 0.85,
  },
  {
    id: 'beetle-northeast',
    label: 'Barkborre spridning (NE)',
    type: 'beetle',
    origin: [14.10, 57.23],
    target: [14.06, 57.19],
    particleCount: 80,
    speed: 0.9,
    confidence: 0.7,
  },
  {
    id: 'storm-west',
    label: 'Stormfront (V)',
    type: 'storm',
    origin: [13.92, 57.18],
    target: [14.08, 57.18],
    particleCount: 100,
    speed: 2.0,
    confidence: 0.6,
  },
  {
    id: 'drought-southeast',
    label: 'Torkstress (SO)',
    type: 'drought',
    origin: [14.14, 57.155],
    target: [14.06, 57.175],
    particleCount: 40,
    speed: 0.4,
    confidence: 0.45,
  },
  {
    id: 'beetle-east',
    label: 'Granbarkborre (Ö)',
    type: 'beetle',
    origin: [14.16, 57.195],
    target: [14.08, 57.19],
    particleCount: 60,
    speed: 1.0,
    confidence: 0.55,
  },
];

const RISK_COLORS: Record<string, { r: number; g: number; b: number; label: string }> = {
  beetle: { r: 255, g: 60, b: 60, label: 'Barkborre' },
  storm: { r: 0, g: 220, b: 255, label: 'Storm' },
  drought: { r: 255, g: 180, b: 40, label: 'Torka' },
};

// ─── Particle system ───

interface Particle {
  x: number; // canvas x
  y: number; // canvas y
  lng: number;
  lat: number;
  vx: number; // velocity in lng/frame
  vy: number; // velocity in lat/frame
  life: number; // 0-1
  maxLife: number;
  type: string;
  size: number;
  sourceIdx: number;
}

export function RiskFlowField({ map }: RiskFlowFieldProps) {
  const { mode, opacity } = useFusionStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const activeRef = useRef(false);

  const initParticles = useCallback(() => {
    const particles: Particle[] = [];

    for (let si = 0; si < RISK_SOURCES.length; si++) {
      const src = RISK_SOURCES[si];
      for (let i = 0; i < src.particleCount; i++) {
        particles.push(createParticle(src, si));
      }
    }

    particlesRef.current = particles;
  }, []);

  const visible = mode === 'risk-flow' || mode === 'composite';

  // Create or reuse canvas
  useEffect(() => {
    if (!map) return;

    const container = map.getContainer();
    let canvas = canvasRef.current;

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '5';
      canvas.style.transition = 'opacity 0.4s ease';
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }

    const resize = () => {
      if (!canvas) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(container);

    return () => {
      resizeObs.disconnect();
    };
  }, [map]);

  // Show/hide canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.style.opacity = visible ? String(opacity) : '0';
  }, [visible, opacity]);

  // Animation loop
  useEffect(() => {
    if (!map || !visible) {
      activeRef.current = false;
      // Clear canvas when hidden
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    activeRef.current = true;
    initParticles();

    const animate = () => {
      if (!activeRef.current || !canvasRef.current || !map) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width;
      const h = canvas.height;

      // Semi-transparent clear for trail effect
      ctx.fillStyle = 'rgba(3, 13, 5, 0.12)';
      ctx.fillRect(0, 0, w, h);

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Update position in geo coords
        p.lng += p.vx;
        p.lat += p.vy;
        p.life -= 1 / (p.maxLife * 60); // ~60fps

        // Respawn when dead
        if (p.life <= 0) {
          const src = RISK_SOURCES[p.sourceIdx];
          const newP = createParticle(src, p.sourceIdx);
          particles[i] = newP;
          continue;
        }

        // Project to screen
        const point = map.project([p.lng, p.lat]);
        const sx = point.x * dpr;
        const sy = point.y * dpr;

        // Skip offscreen
        if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) {
          const src = RISK_SOURCES[p.sourceIdx];
          particles[i] = createParticle(src, p.sourceIdx);
          continue;
        }

        p.x = sx;
        p.y = sy;

        // Alpha: fade in first 10%, fade out last 20%
        let alpha: number;
        if (p.life > 0.9) alpha = (1 - p.life) / 0.1;
        else if (p.life < 0.2) alpha = p.life / 0.2;
        else alpha = 1;
        alpha *= 0.85;

        const color = RISK_COLORS[p.type];
        const size = p.size * dpr;

        // Draw particle glow
        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
        gradient.addColorStop(0, `rgba(${color.r},${color.g},${color.b},${alpha * 0.4})`);
        gradient.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Draw particle core
        ctx.fillStyle = `rgba(${color.r},${color.g},${color.b},${alpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw bright center
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    // Reinitialize on map move to keep projection correct
    const onMove = () => {
      // Particles auto-reproject each frame via map.project
    };
    map.on('move', onMove);

    return () => {
      activeRef.current = false;
      cancelAnimationFrame(animFrameRef.current);
      map.off('move', onMove);
    };
  }, [map, visible, initParticles]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.parentElement.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []);

  return null;
}

// ─── Helpers ───

function createParticle(src: RiskSource, sourceIdx: number): Particle {
  const spread = 0.015;
  const lng = src.origin[0] + (Math.random() - 0.5) * spread;
  const lat = src.origin[1] + (Math.random() - 0.5) * spread;

  const dLng = src.target[0] - src.origin[0];
  const dLat = src.target[1] - src.origin[1];
  const dist = Math.sqrt(dLng * dLng + dLat * dLat);

  const baseSpeed = 0.00004 * src.speed;
  const jitter = 0.3;

  const vx = (dLng / dist) * baseSpeed + (Math.random() - 0.5) * baseSpeed * jitter;
  const vy = (dLat / dist) * baseSpeed + (Math.random() - 0.5) * baseSpeed * jitter;

  const maxLife = 2 + Math.random() * 4; // 2-6 seconds of life

  return {
    x: 0,
    y: 0,
    lng,
    lat,
    vx,
    vy,
    life: 0.7 + Math.random() * 0.3, // start between 70-100%
    maxLife,
    type: src.type,
    size: 1.2 + Math.random() * 1.8,
    sourceIdx,
  };
}
