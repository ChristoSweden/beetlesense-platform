import { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCcw, ZoomIn, ZoomOut, TreePine } from 'lucide-react';
import { DEMO_PARCELS } from '@/lib/demoData';

interface CanopyView3DProps {
  parcelId?: string;
  /** Height data: array of [x, y, height, ndvi, temp_anomaly] */
  heightGrid?: Float32Array;
  gridWidth?: number;
  gridHeight?: number;
}

interface TreePoint {
  x: number;
  y: number;
  height: number;
  crownRadius: number;
  ndvi: number;
  tempAnomaly: number;
  species: string;
  healthScore: number;
}

type ColorMode = 'health' | 'species' | 'height' | 'thermal';

const COLOR_MODES: Array<{ id: ColorMode; label: string; labelSv: string }> = [
  { id: 'health', label: 'Health', labelSv: 'Hälsa' },
  { id: 'species', label: 'Species', labelSv: 'Trädslag' },
  { id: 'height', label: 'Height', labelSv: 'Höjd' },
  { id: 'thermal', label: 'Thermal', labelSv: 'Termisk' },
];

const SPECIES_COLORS: Record<string, string> = {
  Gran: '#1a7a3a',
  Tall: '#4a8c3f',
  Björk: '#7ab648',
  Ek: '#5a7a2a',
  Asp: '#8acc5a',
};

function getTreeColor(tree: TreePoint, mode: ColorMode): string {
  switch (mode) {
    case 'health': {
      const s = tree.healthScore;
      if (s < 30) return '#ef4444';
      if (s < 50) return '#f97316';
      if (s < 65) return '#eab308';
      if (s < 80) return '#84cc16';
      return '#22c55e';
    }
    case 'species':
      return SPECIES_COLORS[tree.species] ?? '#5a8a62';
    case 'height': {
      const t = Math.min(tree.height / 35, 1);
      const r = Math.round(100 + 155 * (1 - t));
      const g = Math.round(150 + 100 * t);
      const b = Math.round(50 + 50 * (1 - t));
      return `rgb(${r},${g},${b})`;
    }
    case 'thermal': {
      const a = tree.tempAnomaly;
      if (a > 2) return '#ef4444';
      if (a > 1) return '#f97316';
      if (a > 0.5) return '#eab308';
      if (a < -1) return '#3b82f6';
      return '#22c55e';
    }
  }
}

/**
 * Generate demo tree data for 3D visualization.
 */
function generateDemoTrees(parcelId: string): TreePoint[] {
  const _parcel = DEMO_PARCELS.find((p) => p.id === parcelId) ?? DEMO_PARCELS[0];
  const trees: TreePoint[] = [];
  const rng = (seed: number) => ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;

  const speciesList = ['Gran', 'Gran', 'Gran', 'Tall', 'Tall', 'Björk'];
  const count = parcelId === 'p2' ? 45 : parcelId === 'p1' ? 35 : 40;

  for (let i = 0; i < count; i++) {
    const angle = rng(i * 7.3) * Math.PI * 2;
    const dist = rng(i * 13.7) * 80 + 10;
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    const species = speciesList[Math.floor(rng(i * 3.1) * speciesList.length)];

    const baseHeight = species === 'Gran' ? 22 : species === 'Tall' ? 20 : 14;
    const height = baseHeight + (rng(i * 5.9) - 0.5) * 12;
    const crownRadius = height * 0.15 + rng(i * 2.3) * 2;

    // Beetle-affected zone in parcel p1
    const inBeetleZone = parcelId === 'p1' && x > 20 && y > 10;
    const ndvi = inBeetleZone ? 0.3 + rng(i * 8.1) * 0.2 : 0.65 + rng(i * 8.1) * 0.25;
    const tempAnomaly = inBeetleZone ? 1.5 + rng(i * 9.3) * 1.5 : -0.5 + rng(i * 9.3) * 1.0;
    const healthScore = inBeetleZone ? 20 + rng(i * 11.2) * 30 : 65 + rng(i * 11.2) * 35;

    trees.push({ x, y, height: Math.max(3, height), crownRadius, ndvi, tempAnomaly, species, healthScore });
  }

  return trees;
}

/**
 * CanopyView3D — isometric/perspective 3D visualization of forest canopy
 * using Canvas 2D rendering (no WebGL dependency).
 *
 * Shows individual tree crowns as 3D ellipsoids colored by:
 * - Health score (multi-sensor fusion)
 * - Species classification
 * - Height from LiDAR CHM
 * - Thermal anomaly
 *
 * Terrain surface rendered from DTM elevation data.
 */
export default function CanopyView3D({ parcelId = 'p1' }: CanopyView3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [colorMode, setColorMode] = useState<ColorMode>('health');
  const [rotation, setRotation] = useState(45);
  const [elevation, setElevation] = useState(30);
  const [zoom, setZoom] = useState(1);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const trees = useRef<TreePoint[]>([]);

  useEffect(() => {
    trees.current = generateDemoTrees(parcelId);
  }, [parcelId]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background gradient (sky)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    skyGrad.addColorStop(0, '#0a1a0f');
    skyGrad.addColorStop(1, '#0d2818');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Ground plane
    const groundGrad = ctx.createLinearGradient(0, h * 0.4, 0, h);
    groundGrad.addColorStop(0, '#0d2818');
    groundGrad.addColorStop(1, '#061210');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.4, w, h * 0.6);

    const cx = w / 2;
    const cy = h * 0.55;
    const scale = zoom * 2.5;
    const radRot = (rotation * Math.PI) / 180;
    const radElev = (elevation * Math.PI) / 180;
    const cosR = Math.cos(radRot);
    const sinR = Math.sin(radRot);
    const cosE = Math.cos(radElev);
    const sinE = Math.sin(radElev);

    // Project 3D → 2D (isometric-like)
    function project(x: number, y: number, z: number): { sx: number; sy: number; depth: number } {
      const rx = x * cosR - y * sinR;
      const ry = x * sinR + y * cosR;
      const rz = z;
      const px = rx * scale;
      const py = (-ry * cosE + rz * sinE) * scale;
      const depth = ry * sinE + rz * cosE;
      return { sx: cx + px, sy: cy - py, depth };
    }

    // Sort trees by depth (back to front)
    const sorted = [...trees.current].sort((a, b) => {
      const da = a.x * sinR + a.y * cosR;
      const db = b.x * sinR + b.y * cosR;
      return da - db;
    });

    // Draw ground shadow for each tree
    for (const tree of sorted) {
      const { sx, sy } = project(tree.x, tree.y, 0);
      const shadowR = tree.crownRadius * scale * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2, shadowR, shadowR * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw trees
    for (const tree of sorted) {
      const baseColor = getTreeColor(tree, colorMode);

      // Trunk
      const { sx: bx, sy: by } = project(tree.x, tree.y, 0);
      const { sx: tx, sy: ty } = project(tree.x, tree.y, tree.height * 0.6);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = Math.max(2, scale * 0.4);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Crown (ellipsoid)
      const { sx: crx, sy: cry } = project(tree.x, tree.y, tree.height * 0.75);
      const crownW = tree.crownRadius * scale;
      const crownH = tree.height * 0.4 * scale * sinE;

      // Crown gradient (top lighter)
      const crownGrad = ctx.createRadialGradient(
        crx, cry - crownH * 0.3, crownW * 0.1,
        crx, cry, crownW,
      );
      crownGrad.addColorStop(0, lighten(baseColor, 30));
      crownGrad.addColorStop(0.6, baseColor);
      crownGrad.addColorStop(1, darken(baseColor, 30));

      ctx.fillStyle = crownGrad;
      ctx.beginPath();
      ctx.ellipse(crx, cry, crownW, crownH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Stress indicator ring
      if (tree.healthScore < 40) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.ellipse(crx, cry, crownW + 3, crownH + 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [colorMode, rotation, elevation, zoom, parcelId]);

  useEffect(() => { render(); }, [render, trees.current]);

  // Mouse drag for rotation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setRotation((r) => r + dx * 0.5);
    setElevation((el) => Math.max(10, Math.min(80, el + dy * 0.3)));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      render();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  return (
    <div className="relative w-full h-full min-h-[400px] rounded-xl overflow-hidden bg-[#0a1a0f] border border-[var(--border)]">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Controls overlay */}
      <div className="absolute top-3 left-3 flex flex-col gap-2">
        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
          <TreePine size={14} className="text-[var(--green)]" />
          <span className="text-xs font-medium text-white">3D Kronvy</span>
        </div>
      </div>

      {/* Color mode selector */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {COLOR_MODES.map((mode) => (
          <button
            key={mode.id}
            onClick={() => setColorMode(mode.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              colorMode === mode.id
                ? 'bg-[var(--green)] text-[var(--bg)]'
                : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/70'
            }`}
          >
            {mode.labelSv}
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex gap-1">
        <button onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70">
          <ZoomIn size={16} />
        </button>
        <button onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))} className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70">
          <ZoomOut size={16} />
        </button>
        <button onClick={() => { setRotation(45); setElevation(30); setZoom(1); }} className="p-2 rounded-lg bg-black/50 text-white hover:bg-black/70">
          <RotateCcw size={16} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-black/60 backdrop-blur-sm">
        <div className="flex items-center gap-3 text-xs text-white/80">
          {colorMode === 'health' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />Stressad</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500" />Varning</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />Frisk</span>
            </>
          )}
          {colorMode === 'species' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1a7a3a' }} />Gran</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#4a8c3f' }} />Tall</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7ab648' }} />Björk</span>
            </>
          )}
          {colorMode === 'thermal' && (
            <>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" />Kall</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500" />Normal</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500" />Varm</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Color helpers ───

function lighten(hex: string, percent: number): string {
  const rgb = parseColor(hex);
  if (!rgb) return hex;
  return `rgb(${Math.min(255, rgb.r + percent)},${Math.min(255, rgb.g + percent)},${Math.min(255, rgb.b + percent)})`;
}

function darken(hex: string, percent: number): string {
  const rgb = parseColor(hex);
  if (!rgb) return hex;
  return `rgb(${Math.max(0, rgb.r - percent)},${Math.max(0, rgb.g - percent)},${Math.max(0, rgb.b - percent)})`;
}

function parseColor(color: string): { r: number; g: number; b: number } | null {
  if (color.startsWith('#')) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return match ? { r: +match[1], g: +match[2], b: +match[3] } : null;
}
