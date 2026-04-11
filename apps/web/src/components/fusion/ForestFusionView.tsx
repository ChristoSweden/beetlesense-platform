import { useState, useCallback } from 'react';
import { Layers, TreePine, Bug, Thermometer, Satellite, Wind, Sparkles, FileText, X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   ForestFusionView — The hero "brain scan" for forests.
   One visual, multiple fused data layers, instant understanding.
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───

export interface Hotspot {
  id: string;
  cx: number;         // % x position within the parcel SVG viewBox
  cy: number;         // % y position
  riskLevel: 'high' | 'moderate' | 'low';
  label: string;
  locationName: string;
  riskType: string;
  severity: string;
  financialImpact: string;
  action: string;
}

export interface ParcelData {
  id: string;
  name: string;
  healthPercent: number;
  timberValueKr: string;
  hotspots: Hotspot[];
  healthProfile: 'healthy' | 'moderate' | 'critical';
  fusionSentence: string;
  actionState: 'healthy' | 'at-risk';
}

interface ForestFusionViewProps {
  parcel: ParcelData;
}

// ─── Parcel SVG paths (irregular organic shapes like real Swedish forest parcels) ───

const PARCEL_PATH = 'M 80 30 C 120 15, 220 10, 310 28 C 370 40, 420 75, 440 140 C 455 200, 430 280, 390 340 C 350 390, 280 420, 200 410 C 130 400, 80 370, 55 310 C 30 250, 25 170, 40 110 C 50 70, 60 42, 80 30 Z';

// ─── Layer toggle config ───

interface LayerConfig {
  id: string;
  label: string;
  icon: typeof TreePine;
  emoji: string;
  defaultOn: boolean;
  extra?: string;
}

const LAYERS: LayerConfig[] = [
  { id: 'health',  label: 'Health (NDVI)',  icon: TreePine,     emoji: '\uD83C\uDF3F', defaultOn: true },
  { id: 'beetle',  label: 'Beetle Risk',    icon: Bug,          emoji: '\uD83E\uDEB2', defaultOn: true },
  { id: 'timber',  label: 'Timber Value',   icon: TreePine,     emoji: '\uD83C\uDF32', defaultOn: false },
  { id: 'weather', label: 'Weather',        icon: Thermometer,  emoji: '\uD83C\uDF21\uFE0F', defaultOn: false },
  { id: 'satellite', label: 'Satellite Date', icon: Satellite,  emoji: '\uD83D\uDCE1', defaultOn: false, extra: 'Sentinel-2: 2026-04-05' },
];

// ─── Component ───

export function ForestFusionView({ parcel }: ForestFusionViewProps) {
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const l of LAYERS) init[l.id] = l.defaultOn;
    return init;
  });

  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);

  const toggleLayer = useCallback((id: string) => {
    setActiveLayers(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const isOn = (id: string) => activeLayers[id] ?? false;

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ background: '#0a1f0d' }}>
      {/* ─── Layer Controls Bar ─── */}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto" style={{ background: 'rgba(10, 31, 13, 0.95)', borderBottom: '1px solid rgba(74, 222, 128, 0.1)' }}>
        <Layers size={16} className="text-emerald-400 shrink-0 mr-1" />
        <span className="text-[11px] font-mono uppercase tracking-widest text-emerald-500/60 shrink-0 mr-2">Layers</span>
        {LAYERS.map(layer => (
          <button
            key={layer.id}
            onClick={() => toggleLayer(layer.id)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border press-effect"
            style={{
              background: isOn(layer.id) ? 'rgba(74, 222, 128, 0.15)' : 'rgba(255,255,255,0.04)',
              borderColor: isOn(layer.id) ? 'rgba(74, 222, 128, 0.3)' : 'rgba(255,255,255,0.08)',
              color: isOn(layer.id) ? '#4ade80' : 'rgba(255,255,255,0.4)',
            }}
          >
            <span className="text-sm">{layer.emoji}</span>
            <span>{layer.label}</span>
            {layer.extra && isOn(layer.id) && (
              <span className="text-[10px] text-emerald-400/60 ml-1">{layer.extra}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Fusion Canvas ─── */}
      <div className="relative" style={{ minHeight: 520 }}>
        <svg
          viewBox="0 0 500 450"
          className="w-full h-auto"
          style={{ minHeight: 520 }}
          aria-label={`Forest fusion view for ${parcel.name}`}
        >
          <defs>
            {/* Base forest texture gradient */}
            <linearGradient id="forest-base" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a4d1a" />
              <stop offset="40%" stopColor="#1e5a1e" />
              <stop offset="100%" stopColor="#0f3d0f" />
            </linearGradient>

            {/* Health layer gradients per profile */}
            <radialGradient id="health-stress-1" cx="30%" cy="70%" r="25%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="health-stress-2" cx="65%" cy="40%" r="18%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="health-damage" cx="25%" cy="75%" r="12%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Timber density gradient */}
            <radialGradient id="timber-dense-1" cx="55%" cy="35%" r="30%">
              <stop offset="0%" stopColor="#064e06" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#064e06" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="timber-dense-2" cx="35%" cy="55%" r="25%">
              <stop offset="0%" stopColor="#064e06" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#064e06" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="timber-light" cx="75%" cy="70%" r="22%">
              <stop offset="0%" stopColor="#a3e635" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#a3e635" stopOpacity="0" />
            </radialGradient>

            {/* Clip path for parcel shape */}
            <clipPath id="parcel-clip">
              <path d={PARCEL_PATH} />
            </clipPath>
          </defs>

          {/* Base parcel shape */}
          <path
            d={PARCEL_PATH}
            fill="url(#forest-base)"
            stroke="rgba(74, 222, 128, 0.3)"
            strokeWidth="1.5"
          />

          {/* ─── Health Layer (NDVI) ─── */}
          <g
            className="fusion-layer"
            style={{ opacity: isOn('health') ? 0.6 : 0, transition: 'opacity 0.5s ease-in-out' }}
            clipPath="url(#parcel-clip)"
          >
            {/* Healthy green base wash */}
            <path d={PARCEL_PATH} fill="rgba(34, 197, 94, 0.2)" />
            {/* Amber stress patches */}
            {parcel.healthProfile !== 'healthy' && (
              <>
                <path d={PARCEL_PATH} fill="url(#health-stress-1)" />
                {parcel.healthProfile === 'moderate' && (
                  <path d={PARCEL_PATH} fill="url(#health-stress-2)" />
                )}
              </>
            )}
            {/* Red damage zone for critical parcels */}
            {parcel.healthProfile === 'critical' && (
              <path d={PARCEL_PATH} fill="url(#health-damage)" />
            )}
          </g>

          {/* ─── Timber Value Layer ─── */}
          <g
            className="fusion-layer"
            style={{ opacity: isOn('timber') ? 0.5 : 0, transition: 'opacity 0.5s ease-in-out' }}
            clipPath="url(#parcel-clip)"
          >
            <path d={PARCEL_PATH} fill="url(#timber-dense-1)" />
            <path d={PARCEL_PATH} fill="url(#timber-dense-2)" />
            <path d={PARCEL_PATH} fill="url(#timber-light)" />
            {/* Contour lines */}
            <ellipse cx="250" cy="180" rx="100" ry="70" fill="none" stroke="rgba(74, 222, 128, 0.12)" strokeWidth="0.8" strokeDasharray="4 3" />
            <ellipse cx="250" cy="180" rx="65" ry="45" fill="none" stroke="rgba(74, 222, 128, 0.18)" strokeWidth="0.8" strokeDasharray="4 3" />
            <ellipse cx="250" cy="180" rx="35" ry="22" fill="none" stroke="rgba(74, 222, 128, 0.25)" strokeWidth="0.8" strokeDasharray="4 3" />
          </g>

          {/* ─── Weather Layer ─── */}
          <g
            className="fusion-layer"
            style={{ opacity: isOn('weather') ? 0.9 : 0, transition: 'opacity 0.5s ease-in-out' }}
          >
            {/* Temperature badge */}
            <rect x="360" y="20" width="60" height="26" rx="6" fill="rgba(10, 31, 13, 0.85)" stroke="rgba(74, 222, 128, 0.2)" strokeWidth="0.8" />
            <text x="390" y="38" textAnchor="middle" fill="#4ade80" fontSize="12" fontFamily="monospace">14°C</text>

            {/* Wind arrows */}
            <g transform="translate(310, 28)">
              <line x1="0" y1="5" x2="18" y2="5" stroke="rgba(96, 165, 250, 0.6)" strokeWidth="1.2" />
              <polygon points="18,5 13,2 13,8" fill="rgba(96, 165, 250, 0.6)" />
            </g>
            <g transform="translate(315, 45)">
              <line x1="0" y1="5" x2="14" y2="5" stroke="rgba(96, 165, 250, 0.4)" strokeWidth="1" />
              <polygon points="14,5 10,2.5 10,7.5" fill="rgba(96, 165, 250, 0.4)" />
            </g>
            <text x="340" y="62" textAnchor="middle" fill="rgba(96, 165, 250, 0.5)" fontSize="9" fontFamily="monospace">SSW 8 m/s</text>
          </g>

          {/* ─── Satellite Date overlay ─── */}
          <g
            className="fusion-layer"
            style={{ opacity: isOn('satellite') ? 0.9 : 0, transition: 'opacity 0.5s ease-in-out' }}
          >
            <rect x="20" y="20" width="145" height="24" rx="5" fill="rgba(10, 31, 13, 0.85)" stroke="rgba(96, 165, 250, 0.25)" strokeWidth="0.8" />
            <text x="30" y="36" fill="rgba(96, 165, 250, 0.8)" fontSize="10" fontFamily="monospace">
              <tspan fill="rgba(96, 165, 250, 0.5)">SAT</tspan> Sentinel-2 2026-04-05
            </text>
          </g>

          {/* ─── Beetle Risk Hotspots ─── */}
          <g
            className="fusion-layer"
            style={{ opacity: isOn('beetle') ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}
          >
            {parcel.hotspots.map(hs => {
              const colors = {
                high: { fill: 'rgba(239, 68, 68, 0.5)', pulse: 'rgba(239, 68, 68, 0.2)', ring: 'rgba(239, 68, 68, 0.35)' },
                moderate: { fill: 'rgba(249, 115, 22, 0.5)', pulse: 'rgba(249, 115, 22, 0.15)', ring: 'rgba(249, 115, 22, 0.3)' },
                low: { fill: 'rgba(234, 179, 8, 0.4)', pulse: 'rgba(234, 179, 8, 0.1)', ring: 'rgba(234, 179, 8, 0.25)' },
              };
              const c = colors[hs.riskLevel];
              return (
                <g
                  key={hs.id}
                  className="cursor-pointer"
                  onClick={() => setActiveHotspot(activeHotspot?.id === hs.id ? null : hs)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${hs.locationName}: ${hs.riskType} - ${hs.severity}`}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveHotspot(activeHotspot?.id === hs.id ? null : hs); }}
                >
                  {/* Outer pulse ring */}
                  <circle cx={hs.cx} cy={hs.cy} r="22" fill="none" stroke={c.ring} strokeWidth="1.5">
                    <animate attributeName="r" values="16;28;16" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
                  </circle>
                  {/* Inner glow */}
                  <circle cx={hs.cx} cy={hs.cy} r="12" fill={c.pulse} />
                  {/* Core dot */}
                  <circle cx={hs.cx} cy={hs.cy} r="6" fill={c.fill} stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
                  {/* Label on the map */}
                  <text
                    x={hs.cx}
                    y={hs.cy - 18}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.8)"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {hs.riskLevel === 'high' ? 'HIGH' : hs.riskLevel === 'moderate' ? 'MED' : 'LOW'}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Parcel name label */}
          <text x="250" y="430" textAnchor="middle" fill="rgba(74, 222, 128, 0.5)" fontSize="11" fontFamily="monospace" letterSpacing="2">
            {parcel.name.toUpperCase()}
          </text>
        </svg>

        {/* ─── Hotspot Tooltip Card (HTML overlay) ─── */}
        {activeHotspot && (
          <div
            className="absolute z-20 animate-fade-in"
            style={{
              left: `clamp(16px, ${(activeHotspot.cx / 500) * 100}% - 120px, calc(100% - 280px))`,
              top: `clamp(16px, ${(activeHotspot.cy / 450) * 100}% - 80px, calc(100% - 220px))`,
              width: 260,
            }}
          >
            <div
              className="rounded-lg p-4 shadow-xl border"
              style={{
                background: 'rgba(10, 31, 13, 0.95)',
                borderColor: activeHotspot.riskLevel === 'high' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(249, 115, 22, 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-400/70">{activeHotspot.locationName}</span>
                <button onClick={() => setActiveHotspot(null)} className="text-white/40 hover:text-white/70 transition-colors" aria-label="Close tooltip">
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ background: activeHotspot.riskLevel === 'high' ? '#ef4444' : activeHotspot.riskLevel === 'moderate' ? '#f97316' : '#eab308' }}
                  />
                  <span className="text-sm text-white font-medium">{activeHotspot.riskType}</span>
                </div>
                <p className="text-xs text-white/60">Severity: <span className="text-white/90">{activeHotspot.severity}</span></p>
                <p className="text-xs text-white/60">At risk: <span className="text-amber-400 font-medium">{activeHotspot.financialImpact}</span></p>
                <p className="text-xs text-white/60">Action: <span className="text-white/80">{activeHotspot.action}</span></p>
              </div>
              <div className="flex gap-2 mt-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <a href="/owner/wingman" className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                  <Sparkles size={11} /> Ask Wingman
                </a>
                <a href="/owner/observations" className="text-[11px] text-amber-400/80 hover:text-amber-300 transition-colors flex items-center gap-1">
                  <FileText size={11} /> Report sighting
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ─── Legend ─── */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3 px-3 py-1.5 rounded-md" style={{ background: 'rgba(10, 31, 13, 0.85)', border: '1px solid rgba(74, 222, 128, 0.08)' }}>
          <span className="flex items-center gap-1 text-[10px] text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e' }} /> Healthy
          </span>
          <span className="flex items-center gap-1 text-[10px] text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} /> Stressed
          </span>
          <span className="flex items-center gap-1 text-[10px] text-white/50">
            <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} /> Damaged
          </span>
        </div>
      </div>
    </div>
  );
}

export default ForestFusionView;
