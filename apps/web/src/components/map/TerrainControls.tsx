import { useState, useCallback } from 'react';
import {
  TreePine,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  RotateCcw,
  Eye,
  EyeOff,
  Mountain,
  Maximize2,
} from 'lucide-react';
import type { TerrainMode } from './ValueTerrain';

// ─── Types ───

interface TerrainControlsProps {
  mode: TerrainMode;
  onModeChange: (mode: TerrainMode) => void;
  pitch: number;
  onPitchChange: (pitch: number) => void;
  bearing: number;
  onBearingChange: (bearing: number) => void;
  extrusionScale: number;
  onExtrusionScaleChange: (scale: number) => void;
  showBorders: boolean;
  onShowBordersChange: (show: boolean) => void;
  onResetView: () => void;
}

// ─── Mode definitions ───

interface ModeOption {
  id: TerrainMode;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  legend: LegendItem[];
}

interface LegendItem {
  color: string;
  label: string;
}

const MODES: ModeOption[] = [
  {
    id: 'canopy',
    label: 'Kronhöjd',
    sublabel: 'Canopy Height',
    icon: <TreePine size={14} aria-hidden="true" />,
    legend: [
      { color: '#1a7a3a', label: 'Gran (Spruce)' },
      { color: '#2d8f4e', label: 'Tall (Pine)' },
      { color: '#7ac47a', label: 'Björk (Birch)' },
      { color: '#8b6914', label: 'Ek (Oak)' },
      { color: '#5b9b5b', label: 'Al (Alder)' },
    ],
  },
  {
    id: 'value',
    label: 'Värde',
    sublabel: 'Timber Value',
    icon: <DollarSign size={14} aria-hidden="true" />,
    legend: [
      { color: '#ef4444', label: '< 500 SEK' },
      { color: '#eab308', label: '500-700 SEK' },
      { color: '#4ade80', label: '> 700 SEK' },
    ],
  },
  {
    id: 'risk',
    label: 'Risk',
    sublabel: 'Risk Score',
    icon: <AlertTriangle size={14} aria-hidden="true" />,
    legend: [
      { color: '#ef4444', label: 'Barkborre (Beetle)' },
      { color: '#60a5fa', label: 'Storm' },
      { color: '#f59e0b', label: 'Torka (Drought)' },
      { color: '#f97316', label: 'Brand (Fire)' },
    ],
  },
  {
    id: 'growth',
    label: 'Tillväxt',
    sublabel: 'Annual Growth',
    icon: <TrendingUp size={14} aria-hidden="true" />,
    legend: [
      { color: '#14b8a6', label: 'Ung (< 40 år)' },
      { color: '#22c55e', label: 'Medelålder (40-70)' },
      { color: '#b48c14', label: 'Gammal (> 70 år)' },
    ],
  },
];

// ─── Altitude reference scale ───

function AltitudeScale({ mode, scale }: { mode: TerrainMode; scale: number }) {
  const ranges: Record<TerrainMode, { min: number; max: number; unit: string }> = {
    canopy: { min: 8, max: 32, unit: 'm' },
    value: { min: 400, max: 900, unit: 'SEK' },
    risk: { min: 0, max: 100, unit: '' },
    growth: { min: 3, max: 12, unit: 'm³/ha' },
  };
  const r = ranges[mode];
  const steps = 4;

  return (
    <div className="flex items-end gap-1 h-12">
      {Array.from({ length: steps }).map((_, i) => {
        const frac = (i + 1) / steps;
        const value = Math.round(r.min + (r.max - r.min) * frac);
        return (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-[var(--text3)] font-mono leading-none">
              {value}
            </span>
            <div
              className="w-3 rounded-sm"
              style={{
                height: `${frac * 28 * scale}px`,
                minHeight: '4px',
                maxHeight: '40px',
                background: 'linear-gradient(to top, var(--green), rgba(74,222,128,0.3))',
              }}
            />
          </div>
        );
      })}
      <span className="text-[8px] text-[var(--text3)] ml-0.5 mb-0.5">{r.unit}</span>
    </div>
  );
}

// ─── Component ───

export function TerrainControls({
  mode,
  onModeChange,
  pitch,
  onPitchChange,
  bearing,
  onBearingChange,
  extrusionScale,
  onExtrusionScaleChange,
  showBorders,
  onShowBordersChange,
  onResetView,
}: TerrainControlsProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  const handleResetView = useCallback(() => {
    onPitchChange(60);
    onBearingChange(-30);
    onExtrusionScaleChange(1);
    onResetView();
  }, [onPitchChange, onBearingChange, onExtrusionScaleChange, onResetView]);

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="absolute bottom-4 left-4 z-20 p-2.5 rounded-xl border border-[var(--border)]
                   text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30
                   transition-all duration-200"
        style={{ background: 'var(--surface)' }}
        aria-label="Show 3D terrain controls"
        title="3D Terrain Controls"
      >
        <Mountain size={18} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div
      className="absolute bottom-4 left-4 z-20 w-64 rounded-2xl border border-[var(--border)]
                 shadow-2xl overflow-hidden"
      style={{ background: 'rgba(var(--bg-rgb, 3,13,5), 0.92)' }}
      role="region"
      aria-label="3D terrain visualization controls"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Mountain size={14} className="text-[var(--green)]" aria-hidden="true" />
          <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            3D Terrain
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleResetView}
            className="p-1 rounded text-[var(--text3)] hover:text-[var(--green)] transition-colors"
            aria-label="Reset view"
            title="Återställ vy"
          >
            <RotateCcw size={13} aria-hidden="true" />
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            aria-label="Minimize controls"
          >
            <Maximize2 size={13} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="px-3 py-2.5 border-b border-[var(--border)]">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold">
          Visningsläge
        </span>
        <div className="grid grid-cols-4 gap-1 mt-1.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onModeChange(m.id)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg text-center
                         transition-all duration-200 ${
                mode === m.id
                  ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                  : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] border border-transparent'
              }`}
              aria-label={`${m.label} (${m.sublabel})`}
              aria-pressed={mode === m.id}
            >
              {m.icon}
              <span className="text-[9px] font-medium leading-none">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div className="px-3 py-2.5 space-y-2.5 border-b border-[var(--border)]">
        {/* Pitch */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="terrain-pitch" className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-semibold">
              Lutning
            </label>
            <span className="text-[10px] text-[var(--text2)] font-mono">{Math.round(pitch)}°</span>
          </div>
          <input
            id="terrain-pitch"
            type="range"
            min={0}
            max={85}
            step={1}
            value={pitch}
            onChange={(e) => onPitchChange(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer
                       bg-[var(--bg3)] accent-[var(--green)]
                       [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--green)]
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
            aria-label="Camera pitch angle"
          />
        </div>

        {/* Bearing */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="terrain-bearing" className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-semibold">
              Rotation
            </label>
            <span className="text-[10px] text-[var(--text2)] font-mono">{Math.round(bearing)}°</span>
          </div>
          <input
            id="terrain-bearing"
            type="range"
            min={-180}
            max={180}
            step={1}
            value={bearing}
            onChange={(e) => onBearingChange(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer
                       bg-[var(--bg3)] accent-[var(--green)]
                       [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--green)]
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
            aria-label="Camera bearing rotation"
          />
        </div>

        {/* Extrusion scale */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="terrain-scale" className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-semibold">
              Förstoring
            </label>
            <span className="text-[10px] text-[var(--text2)] font-mono">{extrusionScale.toFixed(1)}x</span>
          </div>
          <input
            id="terrain-scale"
            type="range"
            min={0.5}
            max={5}
            step={0.1}
            value={extrusionScale}
            onChange={(e) => onExtrusionScaleChange(Number(e.target.value))}
            className="w-full h-1 rounded-full appearance-none cursor-pointer
                       bg-[var(--bg3)] accent-[var(--green)]
                       [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--green)]
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-md"
            aria-label="Extrusion scale multiplier"
          />
        </div>
      </div>

      {/* Toggle + Legend */}
      <div className="px-3 py-2.5 space-y-2">
        {/* Border toggle */}
        <button
          onClick={() => onShowBordersChange(!showBorders)}
          className="flex items-center gap-2 w-full text-left group"
          aria-label={showBorders ? 'Hide cell borders' : 'Show cell borders'}
        >
          {showBorders ? (
            <Eye size={12} className="text-[var(--green)]" aria-hidden="true" />
          ) : (
            <EyeOff size={12} className="text-[var(--text3)]" aria-hidden="true" />
          )}
          <span className={`text-[10px] ${showBorders ? 'text-[var(--text2)]' : 'text-[var(--text3)]'} group-hover:text-[var(--text)]`}>
            Cellgränser
          </span>
        </button>

        {/* Legend */}
        <div>
          <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider font-semibold">
            Färgskala
          </span>
          <div className="mt-1 space-y-0.5">
            {currentMode.legend.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[10px] text-[var(--text3)]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Altitude reference */}
        <div>
          <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider font-semibold">
            Höjdreferens
          </span>
          <div className="mt-1">
            <AltitudeScale mode={mode} scale={extrusionScale} />
          </div>
        </div>
      </div>
    </div>
  );
}
