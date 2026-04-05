import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Bug,
  Sun,
  Flame,
  Wind,
  TreePine,
  Droplets,
  Zap,
  Shield,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreatNode {
  id: string;
  name: string;
  icon: string;
  riskScore: number; // 0-100
  active: boolean;
}

interface ThreatInteraction {
  from: string;
  to: string;
  amplification: number;
  active: boolean;
  mechanism: string;
}

interface CompoundThreatDiagramProps {
  threats: ThreatNode[];
  interactions: ThreatInteraction[];
}

// ─── Icon Map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Bug> = {
  bug: Bug,
  sun: Sun,
  flame: Flame,
  wind: Wind,
  'tree-pine': TreePine,
  droplets: Droplets,
  zap: Zap,
  shield: Shield,
};

function getIcon(name: string) {
  return ICON_MAP[name.toLowerCase()] ?? Bug;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map riskScore 0-100 to a color from green through amber to red */
function riskColor(score: number): string {
  if (score >= 70) return 'var(--risk-high)';
  if (score >= 40) return 'var(--risk-mid)';
  return 'var(--risk-low)';
}

function edgeWidth(amp: number): number {
  // 1.0 -> 1px, 2.0 -> 4px (linear interpolation)
  return Math.max(1, Math.min(6, 1 + (amp - 1) * 3));
}

function dashArray(amp: number): string {
  const seg = Math.round(6 + (amp - 1) * 16);
  return `${seg} ${seg}`;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

const SVG_W = 360;
const SVG_H = 320;
const CX = SVG_W / 2;
const CY = SVG_H / 2;
const RADIUS = 110;
const NODE_R_DESKTOP = 32;

/** Arrange nodes in a circle/diamond pattern */
function layoutNodes(count: number): Array<{ x: number; y: number }> {
  const angleOffset = -Math.PI / 2; // start at top
  return Array.from({ length: count }, (_, i) => {
    const angle = angleOffset + (2 * Math.PI * i) / count;
    return {
      x: CX + RADIUS * Math.cos(angle),
      y: CY + RADIUS * Math.sin(angle),
    };
  });
}

// ─── CSS Keyframes ────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes ctd-flow {
  to { stroke-dashoffset: -48; }
}
@keyframes ctd-glow-pulse {
  0%, 100% { box-shadow: 0 0 0 0 var(--glow-color); }
  50% { box-shadow: 0 0 18px 5px var(--glow-color); }
}
@keyframes ctd-ring {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes ctd-tooltip-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompoundThreatDiagram({
  threats,
  interactions,
}: CompoundThreatDiagramProps) {
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [tappedEdge, setTappedEdge] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Build positional data for each node
  const positions = useMemo(() => layoutNodes(threats.length), [threats.length]);

  const nodeById = useMemo(() => {
    const map = new Map<string, { node: ThreatNode; x: number; y: number }>();
    threats.forEach((t, i) => {
      map.set(t.id, { node: t, x: positions[i]?.x ?? CX, y: positions[i]?.y ?? CY });
    });
    return map;
  }, [threats, positions]);

  const activeEdgeIdx = hoveredEdge ?? tappedEdge;

  // Compute overall compound risk score (average of active threat scores)
  const overallRisk = useMemo(() => {
    const activeThreats = threats.filter((t) => t.active);
    if (activeThreats.length === 0) return 0;
    const sum = activeThreats.reduce((s, t) => s + t.riskScore, 0);
    return Math.round(sum / activeThreats.length);
  }, [threats]);

  const maxAmplification = useMemo(
    () => Math.max(1, ...interactions.filter((i) => i.active).map((i) => i.amplification)),
    [interactions],
  );

  const handleEdgeEnter = useCallback((idx: number, e: React.MouseEvent<SVGElement>) => {
    setHoveredEdge(idx);
    const svg = (e.target as SVGElement).closest('svg');
    if (svg) {
      const r = svg.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    }
  }, []);

  const handleEdgeMove = useCallback((_idx: number, e: React.MouseEvent<SVGElement>) => {
    const svg = (e.target as SVGElement).closest('svg');
    if (svg) {
      const r = svg.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    }
  }, []);

  const handleEdgeTap = useCallback((idx: number) => {
    setTappedEdge((prev) => (prev === idx ? null : idx));
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[560px]"
      style={{
        position: 'relative',
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        fontFamily: 'var(--font-main)',
        overflow: 'hidden',
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* Header */}
      <div className="px-5 pt-5 pb-1">
        <h3
          className="text-lg font-semibold leading-tight m-0"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}
        >
          Compound Threat Interactions
        </h3>
        <p
          className="text-xs mt-1 mb-2 leading-snug"
          style={{ color: 'var(--text3)' }}
        >
          {interactions.filter((i) => i.active).length} active cascade
          {interactions.filter((i) => i.active).length !== 1 ? 's' : ''} detected
          {maxAmplification > 1 && (
            <span className="font-bold ml-1" style={{ color: 'var(--risk-high)' }}>
              — up to {maxAmplification.toFixed(2)}&times; amplification
            </span>
          )}
        </p>
      </div>

      {/* Diagram */}
      <div className="relative px-2">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          className="block w-full"
          style={{ maxHeight: 320 }}
          aria-label="Force-directed diagram showing how forest threats amplify each other"
        >
          <defs>
            {/* Radial gradient background */}
            <radialGradient id="ctd-bg-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--banana)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--bg2)" stopOpacity="0" />
            </radialGradient>
            {/* Arrowhead marker */}
            <marker id="ctd-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill="var(--text3)" fillOpacity="0.5" />
            </marker>
            <marker id="ctd-arrow-active" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill="var(--risk-high)" fillOpacity="0.7" />
            </marker>
            <filter id="ctd-line-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background gradient */}
          <circle cx={CX} cy={CY} r={RADIUS + 40} fill="url(#ctd-bg-gradient)" />

          {/* Faint reference rings */}
          <circle cx={CX} cy={CY} r={RADIUS * 0.55} fill="none"
            stroke="var(--text3)" strokeWidth="0.3" strokeDasharray="3 3" opacity="0.2" />
          <circle cx={CX} cy={CY} r={RADIUS} fill="none"
            stroke="var(--text3)" strokeWidth="0.3" strokeDasharray="3 3" opacity="0.15" />

          {/* Connections */}
          {interactions.map((edge, idx) => {
            const fromNode = nodeById.get(edge.from);
            const toNode = nodeById.get(edge.to);
            if (!fromNode || !toNode) return null;

            const { x: fx, y: fy } = fromNode;
            const { x: tx, y: ty } = toNode;

            // Curved path with perpendicular offset
            const mx = (fx + tx) / 2;
            const my = (fy + ty) / 2;
            const dx = tx - fx;
            const dy = ty - fy;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const curvature = 22;
            const cpx = mx + (dy / len) * curvature;
            const cpy = my - (dx / len) * curvature;

            // Shorten path to stop at node edge
            const angleFrom = Math.atan2(cpy - fy, cpx - fx);
            const angleTo = Math.atan2(ty - cpy, tx - cpx);
            const startX = fx + NODE_R_DESKTOP * Math.cos(angleFrom);
            const startY = fy + NODE_R_DESKTOP * Math.sin(angleFrom);
            const endX = tx - NODE_R_DESKTOP * Math.cos(angleTo);
            const endY = ty - NODE_R_DESKTOP * Math.sin(angleTo);

            const pathD = `M ${startX} ${startY} Q ${cpx} ${cpy} ${endX} ${endY}`;

            const color = edge.active ? 'var(--risk-high)' : '#9ca3af';
            const w = edgeWidth(edge.amplification);
            const isHovered = activeEdgeIdx === idx;

            // Label position
            const lx = mx + (dy / len) * (curvature + 14);
            const ly = my - (dx / len) * (curvature + 14);

            return (
              <g key={`edge-${idx}`}>
                {/* Hit area */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={20}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handleEdgeEnter(idx, e)}
                  onMouseMove={(e) => handleEdgeMove(idx, e)}
                  onMouseLeave={() => setHoveredEdge(null)}
                  onClick={() => handleEdgeTap(idx)}
                />
                {/* Base shadow line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={w}
                  strokeOpacity={edge.active ? 0.15 : 0.3}
                  strokeLinecap="round"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Main animated/static line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={isHovered ? w + 1.5 : w}
                  strokeLinecap="round"
                  strokeDasharray={edge.active ? dashArray(edge.amplification) : '4 6'}
                  strokeOpacity={edge.active ? 0.85 : 0.3}
                  markerEnd={edge.active ? 'url(#ctd-arrow-active)' : 'url(#ctd-arrow)'}
                  filter={isHovered ? 'url(#ctd-line-glow)' : undefined}
                  style={{
                    pointerEvents: 'none',
                    animation: edge.active ? 'ctd-flow 1.5s linear infinite' : 'none',
                    transition: 'stroke-width 0.2s ease',
                  }}
                />
                {/* Amplification pill */}
                <g style={{ pointerEvents: 'none' }}>
                  <rect
                    x={lx - 22} y={ly - 9}
                    width={44} height={18}
                    rx={9}
                    fill={edge.active ? color : '#9ca3af'}
                    fillOpacity={0.1}
                    stroke={edge.active ? color : '#9ca3af'}
                    strokeWidth={0.5}
                    strokeOpacity={0.35}
                  />
                  <text
                    x={lx} y={ly + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={700}
                    fontFamily="var(--font-main)"
                    fill={edge.active ? color : '#9ca3af'}
                  >
                    &times;{edge.amplification.toFixed(2)}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Center compound risk score */}
          <circle cx={CX} cy={CY} r={28} fill="var(--bg2)" stroke="var(--border)" strokeWidth="1" />
          <text
            x={CX} y={CY + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="20"
            fontWeight={800}
            fontFamily="var(--font-main)"
            fill={riskColor(overallRisk)}
          >
            {overallRisk}
          </text>
          <text
            x={CX} y={CY + 16}
            textAnchor="middle"
            fontSize="7"
            fontWeight={500}
            fontFamily="var(--font-main)"
            fill="var(--text3)"
            letterSpacing="0.06em"
          >
            COMPOUND
          </text>
        </svg>

        {/* HTML node overlays */}
        {threats.map((threat, i) => {
          const pos = positions[i];
          if (!pos) return null;
          const Icon = getIcon(threat.icon);
          const color = riskColor(threat.riskScore);
          const size = NODE_R_DESKTOP * 2;
          const leftPct = (pos.x / SVG_W) * 100;
          const topPct = (pos.y / SVG_H) * 100;

          return (
            <div
              key={threat.id}
              className="absolute z-10"
              style={{
                left: `calc(${leftPct}% + 8px)`,
                top: `${topPct}%`,
                width: size,
                height: size,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {/* Pulsing ring for active nodes */}
              {threat.active && (
                <div
                  className="absolute"
                  style={{
                    inset: -4,
                    borderRadius: '50%',
                    border: `2px solid ${color}`,
                    animation: 'ctd-ring 2s ease-out infinite',
                  }}
                />
              )}
              {/* Node circle */}
              <div
                className="flex items-center justify-center"
                style={{
                  width: size,
                  height: size,
                  borderRadius: '50%',
                  background: threat.active
                    ? `radial-gradient(circle at 40% 35%, ${color}22, ${color}08)`
                    : 'color-mix(in srgb, var(--text) 5%, var(--bg2))',
                  border: `2px solid ${threat.active ? color : '#d1d5db'}`,
                  opacity: threat.active ? 1 : 0.4,
                  transition: 'box-shadow 0.3s ease, border-color 0.3s ease, opacity 0.3s ease',
                  ['--glow-color' as string]: `${color}44`,
                  animation: threat.active ? 'ctd-glow-pulse 2.5s ease-in-out infinite' : 'none',
                }}
              >
                <Icon
                  size={22}
                  strokeWidth={2.2}
                  color={threat.active ? color : '#9ca3af'}
                  style={{ transition: 'color 0.3s ease' }}
                />
              </div>
              {/* Label + score */}
              <div
                className="absolute text-center whitespace-nowrap"
                style={{
                  top: size + 3,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-main)',
                  color: threat.active ? 'var(--text)' : 'var(--text3)',
                  letterSpacing: '0.02em',
                  lineHeight: 1.3,
                }}
              >
                {threat.name}
                <br />
                <span
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    color: threat.active ? color : 'var(--text3)',
                  }}
                >
                  {threat.riskScore}%
                </span>
              </div>
            </div>
          );
        })}

        {/* Tooltip on hovered/tapped edge */}
        {activeEdgeIdx !== null && interactions[activeEdgeIdx] && (() => {
          const edge = interactions[activeEdgeIdx];
          const ampColor = edge.active ? 'var(--risk-high)' : 'var(--risk-mid)';
          const tx = Math.min(Math.max(tooltipPos.x, 20), 280);
          const ty = tooltipPos.y + 16;

          return (
            <div
              className="absolute z-50 pointer-events-none"
              style={{
                left: tx,
                top: ty,
                background: 'var(--bg2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '14px 16px',
                maxWidth: 260,
                boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
                fontFamily: 'var(--font-main)',
                animation: 'ctd-tooltip-in 0.15s ease-out',
              }}
            >
              {/* Amplification */}
              <div className="flex items-center gap-1.5 mb-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: ampColor }}
                />
                <span
                  className="text-sm font-bold"
                  style={{ color: ampColor }}
                >
                  &times;{edge.amplification.toFixed(2)}
                </span>
              </div>
              {/* Mechanism */}
              <p
                className="text-xs m-0 leading-relaxed"
                style={{ color: 'var(--text2)' }}
              >
                {edge.mechanism}
              </p>
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
        style={{
          borderTop: '1px solid var(--border)',
          fontSize: '0.68rem',
          color: 'var(--text3)',
          fontFamily: 'var(--font-main)',
        }}
      >
        <span className="flex items-center gap-1.5">
          <svg width="24" height="6">
            <line x1="0" y1="3" x2="24" y2="3" stroke="var(--risk-high)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Thick = strong
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="6">
            <line x1="0" y1="3" x2="24" y2="3" stroke="var(--risk-mid)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Thin = mild
        </span>
        <span className="flex items-center gap-1.5">
          <svg width="24" height="6">
            <line x1="0" y1="3" x2="24" y2="3" stroke="var(--text3)" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
          </svg>
          Inactive
        </span>
        <span className="italic ml-auto opacity-80">
          Dashed flow = active
        </span>
      </div>

      {/* Mobile responsive: shrink nodes */}
      <style>{`
        @media (max-width: 640px) {
          .ctd-node-circle { width: 48px !important; height: 48px !important; }
        }
      `}</style>
    </div>
  );
}
