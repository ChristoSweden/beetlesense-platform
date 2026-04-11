import { useMemo } from 'react';
import {
  Satellite,
  Thermometer,
  Bug,
  TreePine,
  Radio,
  Check,
  X,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CascadeStep {
  source: string;
  signal: string;
  timestamp: string;
  corroborates: boolean;
}

interface Props {
  triggerSource: string;
  triggerSignal: string;
  steps: CascadeStep[];
  alertLevel: 'possible' | 'probable' | 'confirmed';
  threatType: string;
  isAnimating?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Source icon lookup                                                  */
/* ------------------------------------------------------------------ */

const SOURCE_ICONS: Record<string, typeof Satellite> = {
  'Sentinel-2': Satellite,
  'SMHI': Thermometer,
  'Trap sensors': Bug,
  'LiDAR': TreePine,
  'Community': Radio,
};

function getSourceIcon(name: string) {
  return SOURCE_ICONS[name] ?? Satellite;
}

/* ------------------------------------------------------------------ */
/*  Alert level config                                                 */
/* ------------------------------------------------------------------ */

const ALERT_CONFIG = {
  possible: {
    label: 'Possible',
    color: 'var(--banana)',
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.4)',
    Icon: AlertTriangle,
    scale: 0.9,
  },
  probable: {
    label: 'Probable',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.4)',
    Icon: ShieldAlert,
    scale: 1,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'var(--risk-high)',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.4)',
    Icon: ShieldCheck,
    scale: 1.1,
  },
} as const;

/* ------------------------------------------------------------------ */
/*  SVG Layout constants                                               */
/* ------------------------------------------------------------------ */

const SVG_W = 720;
const SVG_H = 320;
const TRIGGER_CX = 70;
const TRIGGER_CY = SVG_H / 2;
const TRIGGER_R = 32;
const FAN_X = 170;
const SOURCE_X = 420;
const SOURCE_START_Y = 40;
const ALERT_CX = 640;
const ALERT_CY = SVG_H / 2;

/* ------------------------------------------------------------------ */
/*  Inline keyframes (injected once via <style>)                       */
/* ------------------------------------------------------------------ */

const KEYFRAMES = `
@keyframes cav-pulse {
  0%, 100% { r: 32; opacity: 1; }
  50% { r: 38; opacity: 0.7; }
}
@keyframes cav-pulse-glow {
  0%, 100% { r: 44; opacity: 0.25; }
  50% { r: 54; opacity: 0.08; }
}
@keyframes cav-line-draw {
  from { stroke-dashoffset: 300; }
  to { stroke-dashoffset: 0; }
}
@keyframes cav-dot-travel {
  0% { offset-distance: 0%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}
@keyframes cav-node-appear {
  0% { transform: scale(0); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes cav-badge-bounce {
  0% { transform: scale(0.6); opacity: 0; }
  50% { transform: scale(1.12); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes cav-confirmed-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
@keyframes cav-counter-fade {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes cav-trigger-enter {
  0% { transform: scale(0); opacity: 0; }
  70% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CascadingAlertViz({
  triggerSource,
  triggerSignal,
  steps,
  alertLevel,
  threatType,
  isAnimating = true,
}: Props) {
  const corroboratingCount = useMemo(
    () => steps.filter((s) => s.corroborates).length,
    [steps],
  );

  const alertCfg = ALERT_CONFIG[alertLevel];
  const AlertIcon = alertCfg.Icon;
  const TriggerIcon = getSourceIcon(triggerSource);

  // Compute Y positions for source nodes evenly spread
  const stepCount = steps.length;
  const sourceSpacing = stepCount > 1
    ? (SVG_H - SOURCE_START_Y * 2) / (stepCount - 1)
    : 0;

  const paused = !isAnimating;
  const playState = paused ? 'paused' : 'running';

  // Build SVG path IDs and line data for each step
  const lines = useMemo(() => {
    return steps.map((step, i) => {
      const sy = stepCount === 1
        ? SVG_H / 2
        : SOURCE_START_Y + i * sourceSpacing;
      const pathId = `cav-path-${i}`;
      // Cubic bezier from fan-out point to source node
      const d = `M ${FAN_X} ${TRIGGER_CY} C ${(FAN_X + SOURCE_X) / 2} ${TRIGGER_CY}, ${(FAN_X + SOURCE_X) / 2} ${sy}, ${SOURCE_X} ${sy}`;
      return { step, sy, pathId, d, index: i };
    });
  }, [steps, stepCount, sourceSpacing]);

  // Timing: base delays
  const T_TRIGGER = 0; // trigger appears
  const T_LINE_BASE = 0.4; // first line starts drawing
  const T_LINE_GAP = 0.15; // gap between lines
  const T_DOT_BASE = 0.6; // first dot starts
  const T_DOT_GAP = 0.4; // gap between dots
  const T_NODE_BASE = 1.0; // first node appears
  const T_NODE_GAP = 0.4; // gap between nodes
  const T_COUNTER = T_NODE_BASE + stepCount * T_NODE_GAP * 0.6;
  const T_BADGE = T_NODE_BASE + stepCount * T_NODE_GAP + 0.2;

  return (
    <div className="w-full overflow-x-auto">
      <style>{KEYFRAMES}</style>
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="w-full"
        style={{ minWidth: 520, maxWidth: 820, fontFamily: 'var(--font-main, Outfit, sans-serif)' }}
      >
        <defs>
          {/* Path definitions for animateMotion */}
          {lines.map(({ pathId, d }) => (
            <path key={pathId} id={pathId} d={d} fill="none" />
          ))}

          {/* Glow filters */}
          <filter id="cav-glow-amber" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="1 0.7 0 0 0  0.7 0.5 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cav-glow-red" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="1 0 0 0 0  0 0.2 0 0 0  0 0 0.2 0 0  0 0 0 0.5 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="cav-glow-green" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" type="matrix"
              values="0 0.4 0 0 0  0.3 0.7 0.3 0 0  0 0.4 0 0 0  0 0 0 0.4 0" />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Trigger node ── */}
        <g style={{
          animation: `cav-trigger-enter 0.5s ease-out ${T_TRIGGER}s both`,
          animationPlayState: playState,
          transformOrigin: `${TRIGGER_CX}px ${TRIGGER_CY}px`,
        }}>
          {/* Outer glow ring */}
          <circle
            cx={TRIGGER_CX} cy={TRIGGER_CY}
            r={44}
            fill="none"
            stroke={alertLevel === 'confirmed' ? 'var(--risk-high)' : 'var(--banana)'}
            strokeWidth={2}
            opacity={0.25}
            style={{
              animation: `cav-pulse-glow 2s ease-in-out infinite`,
              animationPlayState: playState,
              transformOrigin: `${TRIGGER_CX}px ${TRIGGER_CY}px`,
            }}
          />
          {/* Pulsing circle */}
          <circle
            cx={TRIGGER_CX} cy={TRIGGER_CY}
            r={TRIGGER_R}
            fill={alertLevel === 'confirmed' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)'}
            stroke={alertLevel === 'confirmed' ? 'var(--risk-high)' : 'var(--banana)'}
            strokeWidth={2}
            filter={alertLevel === 'confirmed' ? 'url(#cav-glow-red)' : 'url(#cav-glow-amber)'}
            style={{
              animation: `cav-pulse 2s ease-in-out infinite`,
              animationPlayState: playState,
              transformOrigin: `${TRIGGER_CX}px ${TRIGGER_CY}px`,
            }}
          />
          {/* Icon */}
          <foreignObject
            x={TRIGGER_CX - 12} y={TRIGGER_CY - 12}
            width={24} height={24}
          >
            <TriggerIcon
              size={24}
              color={alertLevel === 'confirmed' ? 'var(--risk-high)' : 'var(--banana)'}
            />
          </foreignObject>
          {/* Label */}
          <text
            x={TRIGGER_CX} y={TRIGGER_CY + TRIGGER_R + 16}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="var(--text)"
          >
            {triggerSource}
          </text>
          <text
            x={TRIGGER_CX} y={TRIGGER_CY + TRIGGER_R + 30}
            textAnchor="middle"
            fontSize={9}
            fill="var(--text3)"
            style={{ maxWidth: 100 }}
          >
            {triggerSignal.length > 28 ? triggerSignal.slice(0, 26) + '...' : triggerSignal}
          </text>
        </g>

        {/* ── Fan-out lines + traveling dots ── */}
        {lines.map(({ step, pathId, d, index }) => {
          const lineDelay = T_LINE_BASE + index * T_LINE_GAP;
          const dotDelay = T_DOT_BASE + index * T_DOT_GAP;
          const lineColor = step.corroborates ? 'var(--risk-low)' : 'var(--border)';

          return (
            <g key={`line-${index}`}>
              {/* Animated line */}
              <path
                d={d}
                fill="none"
                stroke={lineColor}
                strokeWidth={1.5}
                strokeDasharray={300}
                strokeDashoffset={300}
                opacity={0.6}
                style={{
                  animation: `cav-line-draw 0.6s ease-out ${lineDelay}s both`,
                  animationPlayState: playState,
                }}
              />
              {/* Traveling dot */}
              <circle
                r={3.5}
                fill={step.corroborates ? 'var(--risk-low)' : 'var(--text3)'}
                opacity={0}
                style={{
                  offsetPath: `path("${d}")`,
                  animation: `cav-dot-travel 0.8s ease-in-out ${dotDelay}s both`,
                  animationPlayState: playState,
                } as React.CSSProperties}
              />
            </g>
          );
        })}

        {/* ── Source nodes ── */}
        {lines.map(({ step, sy, index }) => {
          const nodeDelay = T_NODE_BASE + index * T_NODE_GAP;
          const SourceIcon = getSourceIcon(step.source);
          const nodeR = 20;
          const fillColor = step.corroborates
            ? 'rgba(16, 185, 129, 0.15)'
            : 'rgba(128, 128, 128, 0.1)';
          const strokeColor = step.corroborates
            ? 'var(--risk-low)'
            : 'var(--border)';
          const StatusIcon = step.corroborates ? Check : X;
          const statusColor = step.corroborates ? 'var(--risk-low)' : 'var(--text3)';

          return (
            <g
              key={`node-${index}`}
              style={{
                animation: `cav-node-appear 0.45s ease-out ${nodeDelay}s both`,
                animationPlayState: playState,
                transformOrigin: `${SOURCE_X}px ${sy}px`,
              }}
            >
              <circle
                cx={SOURCE_X} cy={sy}
                r={nodeR}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={1.5}
                filter={step.corroborates ? 'url(#cav-glow-green)' : undefined}
              />
              {/* Source icon */}
              <foreignObject
                x={SOURCE_X - 9} y={sy - 9}
                width={18} height={18}
              >
                <SourceIcon size={18} color={statusColor} />
              </foreignObject>
              {/* Status badge */}
              <foreignObject
                x={SOURCE_X + nodeR - 4} y={sy - nodeR + 2}
                width={14} height={14}
              >
                <div style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: step.corroborates ? 'var(--risk-low)' : 'var(--text3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <StatusIcon size={9} color="#fff" strokeWidth={3} />
                </div>
              </foreignObject>
              {/* Label */}
              <text
                x={SOURCE_X + nodeR + 12}
                y={sy - 4}
                fontSize={10}
                fontWeight={600}
                fill="var(--text)"
              >
                {step.source}
              </text>
              <text
                x={SOURCE_X + nodeR + 12}
                y={sy + 8}
                fontSize={8.5}
                fill={statusColor}
              >
                {step.corroborates ? step.signal : 'No signal'}
              </text>
              <text
                x={SOURCE_X + nodeR + 12}
                y={sy + 19}
                fontSize={8}
                fill="var(--text3)"
                fontFamily="var(--font-mono)"
              >
                {step.timestamp}
              </text>
            </g>
          );
        })}

        {/* ── Corroboration counter ── */}
        <g style={{
          animation: `cav-counter-fade 0.5s ease-out ${T_COUNTER}s both`,
          animationPlayState: playState,
        }}>
          <text
            x={SOURCE_X}
            y={SVG_H - 12}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill="var(--text2)"
          >
            {corroboratingCount} of {steps.length} sources corroborate
          </text>
        </g>

        {/* ── Line from sources area to alert badge ── */}
        <path
          d={`M ${SOURCE_X + 50} ${SVG_H / 2} L ${ALERT_CX - 46} ${ALERT_CY}`}
          fill="none"
          stroke={alertCfg.color}
          strokeWidth={1.5}
          strokeDasharray={4}
          opacity={0.4}
          style={{
            animation: `cav-line-draw 0.4s ease-out ${T_BADGE - 0.2}s both`,
            animationPlayState: playState,
          }}
        />

        {/* ── Alert level badge ── */}
        <g style={{
          animation: `cav-badge-bounce 0.5s ease-out ${T_BADGE}s both${alertLevel === 'confirmed' ? `, cav-confirmed-pulse 1.5s ease-in-out ${T_BADGE + 0.5}s infinite` : ''}`,
          animationPlayState: playState,
          transformOrigin: `${ALERT_CX}px ${ALERT_CY}px`,
        }}>
          {/* Background pill */}
          <rect
            x={ALERT_CX - 42}
            y={ALERT_CY - 30}
            width={84}
            height={60}
            rx={12}
            fill={alertCfg.bg}
            stroke={alertCfg.border}
            strokeWidth={1.5}
          />
          {/* Icon */}
          <foreignObject
            x={ALERT_CX - 10} y={ALERT_CY - 24}
            width={20} height={20}
          >
            <AlertIcon size={20} color={alertCfg.color} />
          </foreignObject>
          {/* Level text */}
          <text
            x={ALERT_CX}
            y={ALERT_CY + 8}
            textAnchor="middle"
            fontSize={12}
            fontWeight={700}
            fill={alertCfg.color}
          >
            {alertCfg.label}
          </text>
          {/* Threat type */}
          <text
            x={ALERT_CX}
            y={ALERT_CY + 22}
            textAnchor="middle"
            fontSize={8}
            fill="var(--text3)"
          >
            {threatType}
          </text>
        </g>

        {/* ── Header label ── */}
        <text
          x={SVG_W / 2}
          y={16}
          textAnchor="middle"
          fontSize={10}
          fontWeight={500}
          fill="var(--text3)"
          letterSpacing={1.5}
          style={{ textTransform: 'uppercase' } as React.CSSProperties}
        >
          CASCADING THREAT DETECTION
        </text>
      </svg>
    </div>
  );
}
