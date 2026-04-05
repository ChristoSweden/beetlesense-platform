import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Bug, Droplets, Flame, Wind, Leaf } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThreatNode {
  id: string;
  label: string;
  risk: number;       // 0-100 current risk level
  active: boolean;    // currently triggered?
}

interface ThreatInteraction {
  from: string;
  to: string;
  amplification: number;  // e.g. 1.35
  mechanism: string;      // e.g. "Reduced resin defense"
  active: boolean;        // currently cascading?
}

interface Props {
  nodes: ThreatNode[];
  interactions: ThreatInteraction[];
  onNodeClick?: (nodeId: string) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, typeof Bug> = {
  beetle: Bug,
  drought: Droplets,
  fire: Flame,
  storm: Wind,
  ndvi: Leaf,
};

const SVG_SIZE = 440;
const CENTER = SVG_SIZE / 2;
const ORBIT_R = 155;
const NODE_R = 28;
const RING_R = 42;
const RING_STROKE = 5;

function riskColor(risk: number): string {
  if (risk > 75) return '#dc2626';
  if (risk > 50) return 'var(--risk-high)';
  if (risk > 25) return 'var(--risk-mid)';
  return 'var(--risk-low)';
}

function edgeWidth(amp: number): number {
  return Math.max(1.5, Math.min(5.5, (amp - 1) * 18));
}

// Pentagon positions (top-center start, clockwise)
function pentagonPoint(index: number, total: number): { x: number; y: number } {
  const angle = (-Math.PI / 2) + (2 * Math.PI * index) / total;
  return {
    x: CENTER + ORBIT_R * Math.cos(angle),
    y: CENTER + ORBIT_R * Math.sin(angle),
  };
}

// Quadratic bezier control point offset perpendicular to the line between two points
function curvedPath(
  x1: number, y1: number,
  x2: number, y2: number,
  curvature = 30,
): string {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const cpx = mx + (dy / len) * curvature;
  const cpy = my - (dx / len) * curvature;
  return `M ${x1} ${y1} Q ${cpx} ${cpy} ${x2} ${y2}`;
}

function midpointOnCurve(
  x1: number, y1: number,
  x2: number, y2: number,
  curvature = 30,
): { x: number; y: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Point on the quadratic bezier at t=0.5
  const cpx = mx + (dy / len) * curvature;
  const cpy = my - (dx / len) * curvature;
  return {
    x: 0.25 * x1 + 0.5 * cpx + 0.25 * x2,
    y: 0.25 * y1 + 0.5 * cpy + 0.25 * y2,
  };
}

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
@keyframes ctg-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}
@keyframes ctg-flow {
  to { stroke-dashoffset: -40; }
}
@keyframes ctg-ring-pulse {
  0%, 100% { opacity: 0.25; }
  50% { opacity: 0.6; }
}
@keyframes ctg-fade-in {
  from { opacity: 0; transform: scale(0.85); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes ctg-edge-draw {
  from { stroke-dashoffset: 300; }
  to { stroke-dashoffset: 0; }
}
@keyframes ctg-tooltip-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ctg-score-count {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes ctg-ring-progress {
  from { stroke-dashoffset: 264; }
}
`;

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompoundThreatGraph({ nodes, interactions, onNodeClick }: Props) {
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [tappedEdge, setTappedEdge] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Build position map for nodes in pentagon layout
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      map.set(n.id, pentagonPoint(i, nodes.length));
    });
    return map;
  }, [nodes]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, ThreatNode>();
    nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [nodes]);

  // Compound risk score: weighted average of active node risks, boosted by active interactions
  const compoundScore = useMemo(() => {
    const activeNodes = nodes.filter((n) => n.active);
    if (activeNodes.length === 0) return 0;
    const baseAvg = activeNodes.reduce((sum, n) => sum + n.risk, 0) / activeNodes.length;
    const activeAmps = interactions.filter((i) => i.active);
    const ampBoost = activeAmps.reduce((sum, i) => sum + (i.amplification - 1), 0);
    return Math.min(100, Math.round(baseAvg * (1 + ampBoost * 0.3)));
  }, [nodes, interactions]);

  const activeEdgeIdx = hoveredEdge ?? tappedEdge;

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

  const scoreColor = riskColor(compoundScore);
  const circumference = 2 * Math.PI * RING_R;
  const scoreDashoffset = circumference - (circumference * compoundScore) / 100;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        background: 'var(--bg2)',
        border: '1px solid color-mix(in srgb, var(--text) 8%, transparent)',
        borderRadius: 16,
        fontFamily: 'var(--font-main)',
        overflow: 'hidden',
        maxWidth: 560,
      }}
    >
      <style>{KEYFRAMES}</style>

      {/* ── Header ── */}
      <div style={{ padding: '18px 20px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: scoreColor,
            boxShadow: `0 0 8px ${scoreColor}66`,
          }} />
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text)',
            margin: 0,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}>
            Compound Threat Interaction
          </h3>
        </div>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text3)',
          margin: '4px 0 0',
          lineHeight: 1.4,
          fontFamily: 'var(--font-mono)',
        }}>
          {interactions.filter((i) => i.active).length} active cascade{interactions.filter((i) => i.active).length !== 1 ? 's' : ''} &middot; {nodes.filter((n) => n.active).length}/{nodes.length} threats triggered
        </p>
      </div>

      {/* ── Diagram ── */}
      <div style={{ position: 'relative', padding: '0 8px 8px' }}>
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          width="100%"
          style={{ display: 'block' }}
          aria-label="Compound threat interaction graph showing how forest threats amplify each other"
        >
          <defs>
            {/* Glow filter for active edges */}
            <filter id="ctg-edge-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Glow filter for active nodes */}
            <filter id="ctg-node-glow">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Subtle background radial gradient */}
            <radialGradient id="ctg-bg-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--text)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--text)" stopOpacity="0" />
            </radialGradient>
            {/* Gradient definitions for active edges */}
            {interactions.map((inter, idx) => {
              const fromNode = nodeMap.get(inter.from);
              const toNode = nodeMap.get(inter.to);
              if (!fromNode || !toNode) return null;
              const fromPos = nodePositions.get(inter.from);
              const toPos = nodePositions.get(inter.to);
              if (!fromPos || !toPos) return null;
              return (
                <linearGradient
                  key={`grad-${idx}`}
                  id={`ctg-edge-grad-${idx}`}
                  x1={fromPos.x} y1={fromPos.y}
                  x2={toPos.x} y2={toPos.y}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={riskColor(fromNode.risk)} />
                  <stop offset="100%" stopColor={riskColor(toNode.risk)} />
                </linearGradient>
              );
            })}
            {/* Arrowhead marker */}
            <marker
              id="ctg-arrow"
              viewBox="0 0 10 8"
              refX="9"
              refY="4"
              markerWidth="8"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 4 L 0 8 Z" fill="currentColor" opacity="0.6" />
            </marker>
          </defs>

          {/* Background */}
          <rect x="0" y="0" width={SVG_SIZE} height={SVG_SIZE} fill="url(#ctg-bg-gradient)" />

          {/* Subtle concentric rings for depth */}
          <circle cx={CENTER} cy={CENTER} r={80} fill="none"
            stroke="var(--text3)" strokeWidth="0.4" strokeDasharray="2 4" opacity="0.2" />
          <circle cx={CENTER} cy={CENTER} r={ORBIT_R} fill="none"
            stroke="var(--text3)" strokeWidth="0.3" strokeDasharray="2 4" opacity="0.15" />

          {/* ── Edges ── */}
          {interactions.map((inter, idx) => {
            const fromPos = nodePositions.get(inter.from);
            const toPos = nodePositions.get(inter.to);
            if (!fromPos || !toPos) return null;

            const w = edgeWidth(inter.amplification);
            const isHovered = activeEdgeIdx === idx;
            const pathD = curvedPath(fromPos.x, fromPos.y, toPos.x, toPos.y);
            const dashSeg = Math.round(8 + (inter.amplification - 1) * 16);

            const entryDelay = mounted ? 0 : 0.4 + nodes.length * 0.08 + idx * 0.1;

            return (
              <g
                key={`edge-${idx}`}
                style={{
                  opacity: mounted ? 1 : 0,
                  animation: mounted ? 'none' : `ctg-fade-in 0.4s ease-out ${entryDelay}s forwards`,
                }}
              >
                {/* Hit area (invisible, wide) */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={22}
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
                  stroke={inter.active ? `url(#ctg-edge-grad-${idx})` : '#9ca3af'}
                  strokeWidth={w + 2}
                  strokeOpacity={inter.active ? 0.08 : 0.06}
                  strokeLinecap="round"
                  style={{ pointerEvents: 'none' }}
                />
                {/* Main line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={inter.active ? `url(#ctg-edge-grad-${idx})` : '#9ca3af'}
                  strokeWidth={isHovered ? w + 1.5 : w}
                  strokeLinecap="round"
                  strokeDasharray={inter.active ? `${dashSeg} ${dashSeg}` : '3 6'}
                  strokeOpacity={inter.active ? 0.85 : 0.25}
                  filter={isHovered ? 'url(#ctg-edge-glow)' : undefined}
                  style={{
                    pointerEvents: 'none',
                    animation: inter.active ? 'ctg-flow 1.5s linear infinite' : 'none',
                    transition: 'stroke-width 0.2s ease, stroke-opacity 0.2s ease',
                  }}
                />
                {/* Amplification label on edge midpoint */}
                {(() => {
                  const mid = midpointOnCurve(fromPos.x, fromPos.y, toPos.x, toPos.y);
                  const ampText = `${inter.amplification.toFixed(2)}\u00d7`;
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect
                        x={mid.x - 22} y={mid.y - 9}
                        width={44} height={18}
                        rx={9}
                        fill={inter.active ? 'var(--bg2)' : 'var(--bg2)'}
                        fillOpacity={0.92}
                        stroke={inter.active ? `url(#ctg-edge-grad-${idx})` : '#d1d5db'}
                        strokeWidth={0.8}
                        strokeOpacity={inter.active ? 0.5 : 0.3}
                      />
                      <text
                        x={mid.x} y={mid.y + 3.5}
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight={700}
                        fontFamily="var(--font-mono)"
                        fill={inter.active ? riskColor(
                          ((nodeMap.get(inter.from)?.risk ?? 0) + (nodeMap.get(inter.to)?.risk ?? 0)) / 2
                        ) : '#9ca3af'}
                      >
                        {ampText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })}

          {/* ── Nodes ── */}
          {nodes.map((node, i) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;
            const Icon = ICON_MAP[node.id] || Leaf;
            const color = riskColor(node.risk);
            const entryDelay = mounted ? 0 : i * 0.08;

            return (
              <g
                key={node.id}
                style={{
                  cursor: onNodeClick ? 'pointer' : 'default',
                  opacity: mounted ? 1 : 0,
                  animation: mounted ? 'none' : `ctg-fade-in 0.35s ease-out ${entryDelay}s forwards`,
                }}
                onClick={() => onNodeClick?.(node.id)}
              >
                {/* Active outer glow ring */}
                {node.active && (
                  <circle
                    cx={pos.x} cy={pos.y} r={NODE_R + 8}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.3}
                    style={{ animation: 'ctg-ring-pulse 2s ease-in-out infinite' }}
                  />
                )}

                {/* Node background circle */}
                <circle
                  cx={pos.x} cy={pos.y} r={NODE_R}
                  fill={node.active
                    ? `color-mix(in srgb, ${color} 8%, var(--bg2))`
                    : 'color-mix(in srgb, var(--text) 4%, var(--bg2))'}
                  stroke={node.active ? color : '#d1d5db'}
                  strokeWidth={node.active ? 2.5 : 1.5}
                  style={{
                    filter: node.active ? 'url(#ctg-node-glow)' : 'none',
                    transformOrigin: `${pos.x}px ${pos.y}px`,
                    animation: node.active ? 'ctg-pulse 2s ease-in-out infinite' : 'none',
                  }}
                />

                {/* Risk fill arc inside node (subtle progress ring) */}
                {node.active && (
                  <circle
                    cx={pos.x} cy={pos.y} r={NODE_R - 3}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={`${(2 * Math.PI * (NODE_R - 3) * node.risk) / 100} ${2 * Math.PI * (NODE_R - 3)}`}
                    strokeLinecap="round"
                    opacity={0.2}
                    transform={`rotate(-90 ${pos.x} ${pos.y})`}
                  />
                )}

                {/* Icon */}
                <foreignObject
                  x={pos.x - 11} y={pos.y - 11}
                  width={22} height={22}
                  style={{ pointerEvents: 'none' }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                    height: 22,
                    color: node.active ? color : '#9ca3af',
                    opacity: node.active ? 1 : 0.4,
                    transition: 'color 0.3s ease, opacity 0.3s ease',
                  }}>
                    <Icon size={18} strokeWidth={2.2} />
                  </div>
                </foreignObject>

                {/* Label below node */}
                <text
                  x={pos.x} y={pos.y + NODE_R + 16}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight={600}
                  fontFamily="var(--font-main)"
                  fill={node.active ? 'var(--text)' : 'var(--text3)'}
                  opacity={node.active ? 1 : 0.5}
                  style={{ letterSpacing: '0.02em' }}
                >
                  {node.label}
                </text>

                {/* Risk percentage badge */}
                {node.active && (
                  <g>
                    <rect
                      x={pos.x + NODE_R - 8} y={pos.y - NODE_R - 4}
                      width={28} height={16}
                      rx={8}
                      fill={color}
                      fillOpacity={0.15}
                      stroke={color}
                      strokeWidth={0.8}
                      strokeOpacity={0.4}
                    />
                    <text
                      x={pos.x + NODE_R + 6} y={pos.y - NODE_R + 8}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight={700}
                      fontFamily="var(--font-mono)"
                      fill={color}
                    >
                      {node.risk}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ── Center compound score ── */}
          <g style={{
            opacity: mounted ? 1 : 0,
            animation: mounted ? 'none' : `ctg-score-count 0.6s ease-out 0.6s forwards`,
          }}>
            {/* Background circle */}
            <circle
              cx={CENTER} cy={CENTER} r={RING_R + 4}
              fill="var(--bg2)"
              stroke="color-mix(in srgb, var(--text) 6%, transparent)"
              strokeWidth={1}
            />
            {/* Track ring */}
            <circle
              cx={CENTER} cy={CENTER} r={RING_R}
              fill="none"
              stroke="color-mix(in srgb, var(--text) 8%, transparent)"
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
            />
            {/* Progress ring */}
            <circle
              cx={CENTER} cy={CENTER} r={RING_R}
              fill="none"
              stroke={scoreColor}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={scoreDashoffset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              style={{
                transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease',
                animation: mounted ? 'none' : `ctg-ring-progress 1.2s ease-out 0.6s forwards`,
              }}
              opacity={0.85}
            />
            {/* Score number */}
            <text
              x={CENTER} y={CENTER + 1}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="22"
              fontWeight={800}
              fontFamily="var(--font-main)"
              fill={scoreColor}
              style={{ letterSpacing: '-0.02em' }}
            >
              {compoundScore}
            </text>
            {/* Label */}
            <text
              x={CENTER} y={CENTER + 18}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight={500}
              fontFamily="var(--font-mono)"
              fill="var(--text3)"
              style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              COMPOUND
            </text>
          </g>
        </svg>

        {/* ── Edge tooltip (HTML overlay) ── */}
        {activeEdgeIdx !== null && interactions[activeEdgeIdx] && (() => {
          const inter = interactions[activeEdgeIdx];
          const fromNode = nodeMap.get(inter.from);
          const toNode = nodeMap.get(inter.to);
          const avgRisk = ((fromNode?.risk ?? 0) + (toNode?.risk ?? 0)) / 2;
          const color = riskColor(avgRisk);

          // Clamp tooltip within container
          const tx = Math.min(Math.max(tooltipPos.x, 16), 320);
          const ty = tooltipPos.y + 18;

          return (
            <div
              style={{
                position: 'absolute',
                left: tx,
                top: ty,
                background: 'var(--bg2)',
                border: `1px solid color-mix(in srgb, ${color} 25%, var(--border))`,
                borderRadius: 12,
                padding: '12px 14px',
                maxWidth: 240,
                boxShadow: `0 8px 28px rgba(0,0,0,0.10), 0 0 0 1px color-mix(in srgb, ${color} 6%, transparent)`,
                zIndex: 50,
                pointerEvents: 'none',
                fontFamily: 'var(--font-main)',
                animation: 'ctg-tooltip-in 0.15s ease-out',
              }}
            >
              {/* Amplification header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 6,
              }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)',
                  color,
                }}>
                  {inter.amplification.toFixed(2)}&times;
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'var(--text2)',
                }}>
                  amplification
                </span>
              </div>
              {/* Mechanism text */}
              <p style={{
                fontSize: '0.73rem',
                color: 'var(--text2)',
                margin: 0,
                lineHeight: 1.55,
              }}>
                {inter.mechanism}
              </p>
              {/* Source/target labels */}
              <div style={{
                marginTop: 8,
                fontSize: '0.65rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text3)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                <span style={{ fontWeight: 600, color: riskColor(fromNode?.risk ?? 0) }}>
                  {fromNode?.label}
                </span>
                <span>&rarr;</span>
                <span style={{ fontWeight: 600, color: riskColor(toNode?.risk ?? 0) }}>
                  {toNode?.label}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Legend bar ── */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '8px 14px',
        padding: '10px 20px 14px',
        borderTop: '1px solid color-mix(in srgb, var(--text) 6%, transparent)',
        fontSize: '0.67rem',
        color: 'var(--text3)',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.4,
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-low)', display: 'inline-block' }} />
          &lt;25
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-mid)', display: 'inline-block' }} />
          25-50
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-high)', display: 'inline-block' }} />
          50-75
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
          &gt;75
        </span>
        <span style={{ marginLeft: 'auto', fontStyle: 'italic', opacity: 0.7 }}>
          Hover edges for details
        </span>
      </div>
    </div>
  );
}
