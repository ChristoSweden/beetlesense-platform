import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Leaf,
  Thermometer,
  Bug,
  Droplets,
  Camera,
  Users,
  Play,
  Pause,
  Calendar,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   TemporalFusionTimeline — Synchronized multi-source timeline
   showing how signals from 6 data sources correlate over time.
   Scrubbing, play/pause, correlation zone highlighting.
   ═══════════════════════════════════════════════════════════════ */

// ─── Types ───────────────────────────────────────────────────────────────

export interface TimePoint {
  date: string;
  ndvi?: number;
  temperature?: number;
  beetleCount?: number;
  soilMoisture?: number;
  droneFlown?: boolean;
  communityReports?: number;
}

export interface CorrelationEvent {
  dateRange: [string, string];
  type: 'beetle-surge' | 'ndvi-drop' | 'heat-stress' | 'compound-risk';
  label: string;
  severity: 'high' | 'moderate' | 'low';
}

export interface TemporalFusionTimelineProps {
  data: TimePoint[];
  correlationEvents?: CorrelationEvent[];
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────

const LANE_HEIGHT = 60;
const LABEL_WIDTH = 120;
const RIGHT_PAD = 60;
const TOP_PAD = 8;
const BOTTOM_PAD = 24;

const SEVERITY_COLORS: Record<string, string> = {
  high: 'rgba(239, 68, 68, 0.12)',
  moderate: 'rgba(249, 115, 22, 0.10)',
  low: 'rgba(234, 179, 8, 0.08)',
};

const SEVERITY_BORDER: Record<string, string> = {
  high: 'rgba(239, 68, 68, 0.35)',
  moderate: 'rgba(249, 115, 22, 0.30)',
  low: 'rgba(234, 179, 8, 0.25)',
};

interface LaneConfig {
  id: string;
  label: string;
  icon: typeof Leaf;
  color: string;
  type: 'line' | 'bar' | 'marker';
  field: keyof TimePoint;
  unit: string;
  domain: [number, number];
  formatValue: (v: number) => string;
}

const LANES: LaneConfig[] = [
  {
    id: 'ndvi', label: 'NDVI', icon: Leaf, color: '#4ade80',
    type: 'line', field: 'ndvi', unit: '', domain: [0.3, 1.0],
    formatValue: (v) => v.toFixed(2),
  },
  {
    id: 'temperature', label: 'Temperature', icon: Thermometer, color: '#f97316',
    type: 'line', field: 'temperature', unit: '°C', domain: [0, 30],
    formatValue: (v) => `${v.toFixed(0)}°C`,
  },
  {
    id: 'beetle', label: 'Beetle Traps', icon: Bug, color: '#fbbf24',
    type: 'bar', field: 'beetleCount', unit: '/wk', domain: [0, 100],
    formatValue: (v) => `${Math.round(v)}`,
  },
  {
    id: 'moisture', label: 'Soil Moisture', icon: Droplets, color: '#60a5fa',
    type: 'line', field: 'soilMoisture', unit: '%', domain: [20, 80],
    formatValue: (v) => `${v.toFixed(0)}%`,
  },
  {
    id: 'drone', label: 'Drone Surveys', icon: Camera, color: '#a78bfa',
    type: 'marker', field: 'droneFlown', unit: '', domain: [0, 1],
    formatValue: () => '◆',
  },
  {
    id: 'community', label: 'Reports', icon: Users, color: '#f472b6',
    type: 'marker', field: 'communityReports', unit: '', domain: [0, 10],
    formatValue: (v) => `${Math.round(v)}`,
  },
];

// ─── Demo Data ───────────────────────────────────────────────────────────

function generateDemoData(): TimePoint[] {
  const points: TimePoint[] = [];
  const start = new Date('2026-03-01');

  for (let d = 0; d < 90; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const dayOfYear = d;

    // Temperature: rising from 5 to 18, heat spike April 12-15 (day 42-45)
    let temp = 5 + (dayOfYear / 90) * 13;
    if (dayOfYear >= 42 && dayOfYear <= 45) temp += 6 + Math.random() * 2;
    temp += (Math.random() - 0.5) * 3;

    // Beetle traps: low March, spiking April 15-25 (day 45-55)
    let beetles = 2 + Math.random() * 3;
    if (dayOfYear >= 42 && dayOfYear <= 58) {
      const peak = 1 - Math.abs(dayOfYear - 50) / 10;
      beetles += peak * 70 + Math.random() * 10;
    }

    // NDVI: starts 0.75, dips to 0.62 around April 15-25
    let ndvi = 0.75 + (dayOfYear / 90) * 0.08;
    if (dayOfYear >= 44 && dayOfYear <= 56) {
      const dip = 1 - Math.abs(dayOfYear - 50) / 8;
      ndvi -= dip * 0.15;
    }
    ndvi += (Math.random() - 0.5) * 0.03;
    ndvi = Math.max(0.4, Math.min(0.95, ndvi));

    // Soil moisture: 65% in March, dropping during heat spike
    let moisture = 65 - (dayOfYear / 90) * 15;
    if (dayOfYear >= 40 && dayOfYear <= 48) moisture -= 12 + Math.random() * 5;
    moisture += (Math.random() - 0.5) * 4;
    moisture = Math.max(25, Math.min(75, moisture));

    // Drone surveys on specific dates
    const droneFlown = [14, 35, 48, 61].includes(dayOfYear);

    // Community reports: 0-1 in March, 3-8 during beetle surge
    let reports = Math.random() < 0.15 ? 1 : 0;
    if (dayOfYear >= 43 && dayOfYear <= 56) {
      reports = Math.floor(3 + Math.random() * 5);
    }

    points.push({
      date: date.toISOString().split('T')[0],
      ndvi,
      temperature: Math.max(0, temp),
      beetleCount: Math.max(0, Math.round(beetles)),
      soilMoisture: moisture,
      droneFlown,
      communityReports: reports,
    });
  }

  return points;
}

export const DEMO_TEMPORAL_DATA = generateDemoData();

export const DEMO_CORRELATION_EVENTS: CorrelationEvent[] = [
  {
    dateRange: ['2026-04-12', '2026-04-15'],
    type: 'heat-stress',
    label: 'Heat Stress Window',
    severity: 'moderate',
  },
  {
    dateRange: ['2026-04-15', '2026-04-25'],
    type: 'compound-risk',
    label: 'Compound Risk: Beetle + NDVI Drop',
    severity: 'high',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────

function dateToIdx(data: TimePoint[], dateStr: string): number {
  return data.findIndex((p) => p.date === dateStr);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' });
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Component ───────────────────────────────────────────────────────────

export function TemporalFusionTimeline({
  data,
  correlationEvents = [],
  onDateSelect,
  selectedDate,
}: TemporalFusionTimelineProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<number | null>(null);
  const playIdxRef = useRef(0);
  const [playIdx, setPlayIdx] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const count = data.length;
  const chartWidth = 700;
  const totalHeight = TOP_PAD + LANES.length * LANE_HEIGHT + BOTTOM_PAD;
  const plotWidth = chartWidth - LABEL_WIDTH - RIGHT_PAD;

  // X scale: index → pixel
  const xScale = useCallback(
    (idx: number) => LABEL_WIDTH + (idx / Math.max(1, count - 1)) * plotWidth,
    [count, plotWidth],
  );

  // Y scale for a lane
  const yScale = useCallback(
    (value: number, domain: [number, number], laneIdx: number) => {
      const laneTop = TOP_PAD + laneIdx * LANE_HEIGHT + 6;
      const laneBot = TOP_PAD + (laneIdx + 1) * LANE_HEIGHT - 6;
      const t = (value - domain[0]) / (domain[1] - domain[0]);
      return lerp(laneBot, laneTop, clamp(t, 0, 1));
    },
    [],
  );

  // Active index (hover > play > selected)
  const activeIdx = useMemo(() => {
    if (hoverIdx !== null) return hoverIdx;
    if (isPlaying) return playIdx;
    if (selectedDate) {
      const idx = dateToIdx(data, selectedDate);
      return idx >= 0 ? idx : null;
    }
    return null;
  }, [hoverIdx, isPlaying, playIdx, selectedDate, data]);

  // Play animation
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) cancelAnimationFrame(playRef.current);
      return;
    }

    let lastTime = 0;
    const step = (time: number) => {
      if (time - lastTime > 80) {
        lastTime = time;
        playIdxRef.current += 1;
        if (playIdxRef.current >= count) {
          playIdxRef.current = 0;
          setIsPlaying(false);
          return;
        }
        setPlayIdx(playIdxRef.current);
      }
      playRef.current = requestAnimationFrame(step);
    };
    playRef.current = requestAnimationFrame(step);

    return () => {
      if (playRef.current) cancelAnimationFrame(playRef.current);
    };
  }, [isPlaying, count]);

  // Mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth;
      const idx = Math.round(
        ((svgX - LABEL_WIDTH) / plotWidth) * (count - 1),
      );
      if (idx >= 0 && idx < count) {
        setHoverIdx(idx);
      }
    },
    [chartWidth, plotWidth, count],
  );

  const handleMouseLeave = useCallback(() => setHoverIdx(null), []);

  const handleClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth;
      const idx = Math.round(
        ((svgX - LABEL_WIDTH) / plotWidth) * (count - 1),
      );
      if (idx >= 0 && idx < count && onDateSelect) {
        onDateSelect(data[idx].date);
      }
    },
    [chartWidth, plotWidth, count, data, onDateSelect],
  );

  // Build line paths
  const linePaths = useMemo(() => {
    const paths: Record<string, string> = {};
    for (const lane of LANES) {
      if (lane.type !== 'line') continue;
      const laneIdx = LANES.indexOf(lane);
      const pts: string[] = [];
      for (let i = 0; i < count; i++) {
        const val = data[i][lane.field];
        if (val == null || typeof val !== 'number') continue;
        const x = xScale(i);
        const y = yScale(val, lane.domain, laneIdx);
        pts.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      paths[lane.id] = pts.join(' ');
    }
    return paths;
  }, [data, count, xScale, yScale]);

  // Area fill paths (for line lanes)
  const areaFills = useMemo(() => {
    const fills: Record<string, string> = {};
    for (const lane of LANES) {
      if (lane.type !== 'line') continue;
      const laneIdx = LANES.indexOf(lane);
      const laneBot = TOP_PAD + (laneIdx + 1) * LANE_HEIGHT - 6;
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < count; i++) {
        const val = data[i][lane.field];
        if (val == null || typeof val !== 'number') continue;
        pts.push({ x: xScale(i), y: yScale(val, lane.domain, laneIdx) });
      }
      if (pts.length < 2) continue;
      let d = `M ${pts[0].x.toFixed(1)} ${laneBot}`;
      for (const p of pts) d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
      d += ` L ${pts[pts.length - 1].x.toFixed(1)} ${laneBot} Z`;
      fills[lane.id] = d;
    }
    return fills;
  }, [data, count, xScale, yScale]);

  // Correlation event rectangles
  const eventRects = useMemo(() => {
    return correlationEvents.map((evt) => {
      const startIdx = dateToIdx(data, evt.dateRange[0]);
      const endIdx = dateToIdx(data, evt.dateRange[1]);
      if (startIdx < 0 || endIdx < 0) return null;
      const x1 = xScale(startIdx);
      const x2 = xScale(endIdx);
      return {
        ...evt,
        x: x1,
        width: x2 - x1,
        y: TOP_PAD,
        height: LANES.length * LANE_HEIGHT,
      };
    }).filter(Boolean) as Array<CorrelationEvent & { x: number; width: number; y: number; height: number }>;
  }, [correlationEvents, data, xScale]);

  // Date range label
  const dateRange = data.length > 0
    ? `${formatDateShort(data[0].date)} – ${formatDateShort(data[data.length - 1].date)}`
    : '';

  // Active point data
  const activePoint = activeIdx !== null ? data[activeIdx] : null;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg2)',
        border: '1px solid var(--border)',
        fontFamily: 'var(--font-main)',
      }}
    >
      {/* ─── Header ─── */}
      <div
        className="flex items-center justify-between px-5 py-4 flex-wrap gap-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h3
            className="text-lg font-semibold m-0"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}
          >
            {t('fusion.temporalTitle', 'Temporal Fusion')}
          </h3>
          <p className="text-xs mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--text3)' }}>
            <Calendar size={12} />
            {dateRange}
          </p>
        </div>
        <button
          onClick={() => {
            if (!isPlaying) {
              playIdxRef.current = 0;
              setPlayIdx(0);
            }
            setIsPlaying(!isPlaying);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all press-effect"
          style={{
            background: isPlaying ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg3)',
            border: `1px solid ${isPlaying ? 'rgba(74, 222, 128, 0.3)' : 'var(--border)'}`,
            color: isPlaying ? '#4ade80' : 'var(--text2)',
          }}
          aria-label={isPlaying ? 'Pause playback' : 'Play timeline'}
        >
          {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          {isPlaying ? t('fusion.pause', 'Pause') : t('fusion.play', 'Play')}
        </button>
      </div>

      {/* ─── Timeline SVG ─── */}
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${chartWidth} ${totalHeight}`}
          className="block w-full"
          style={{ minWidth: 600, minHeight: totalHeight }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          role="img"
          aria-label={t(
            'fusion.timelineAria',
            'Temporal fusion timeline showing 6 data sources over 90 days',
          )}
        >
          <defs>
            {/* Gradient fills for each line lane */}
            {LANES.filter((l) => l.type === 'line').map((lane) => (
              <linearGradient
                key={`fill-${lane.id}`}
                id={`tft-fill-${lane.id}`}
                x1="0" y1="0" x2="0" y2="1"
              >
                <stop offset="0%" stopColor={lane.color} stopOpacity="0.25" />
                <stop offset="100%" stopColor={lane.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {/* ─── Correlation Event Zones ─── */}
          {eventRects.map((evt, i) => (
            <g key={`evt-${i}`}>
              <rect
                x={evt.x}
                y={evt.y}
                width={evt.width}
                height={evt.height}
                fill={SEVERITY_COLORS[evt.severity]}
                stroke={SEVERITY_BORDER[evt.severity]}
                strokeWidth="1"
                strokeDasharray="4 3"
                rx="3"
              />
              <text
                x={evt.x + evt.width / 2}
                y={evt.y + 14}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fontFamily="var(--font-main)"
                fill={evt.severity === 'high' ? '#ef4444' : evt.severity === 'moderate' ? '#f97316' : '#eab308'}
                opacity="0.8"
              >
                {evt.label}
              </text>
            </g>
          ))}

          {/* ─── Swim Lanes ─── */}
          {LANES.map((lane, laneIdx) => {
            const laneTop = TOP_PAD + laneIdx * LANE_HEIGHT;
            const Icon = lane.icon;

            return (
              <g
                key={lane.id}
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: `opacity 0.4s ease ${laneIdx * 100}ms`,
                }}
              >
                {/* Lane separator */}
                {laneIdx > 0 && (
                  <line
                    x1={LABEL_WIDTH - 8}
                    y1={laneTop}
                    x2={chartWidth - RIGHT_PAD + 8}
                    y2={laneTop}
                    stroke="var(--border)"
                    strokeWidth="0.5"
                  />
                )}

                {/* Label area */}
                <foreignObject x="8" y={laneTop + 8} width={LABEL_WIDTH - 16} height={LANE_HEIGHT - 16}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      height: '100%',
                    }}
                  >
                    <Icon size={13} color={lane.color} style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '11px',
                        fontFamily: 'var(--font-main)',
                        fontWeight: 600,
                        color: 'var(--text2)',
                        letterSpacing: '0.03em',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {lane.label}
                    </span>
                  </div>
                </foreignObject>

                {/* ── Line chart lane ── */}
                {lane.type === 'line' && (
                  <>
                    {/* Area fill */}
                    {areaFills[lane.id] && (
                      <path
                        d={areaFills[lane.id]}
                        fill={`url(#tft-fill-${lane.id})`}
                      />
                    )}
                    {/* Line */}
                    {linePaths[lane.id] && (
                      <path
                        d={linePaths[lane.id]}
                        fill="none"
                        stroke={lane.color}
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    )}
                    {/* Temperature danger zone fill (> 20°C) */}
                    {lane.id === 'temperature' && (() => {
                      const threshold = 20;
                      const segments: string[] = [];
                      const laneBot = TOP_PAD + (laneIdx + 1) * LANE_HEIGHT - 6;
                      const threshY = yScale(threshold, lane.domain, laneIdx);

                      for (let i = 0; i < count; i++) {
                        const val = data[i].temperature;
                        if (val == null || val <= threshold) continue;
                        const x = xScale(i);
                        const y = yScale(val, lane.domain, laneIdx);
                        // Simple rect per point above threshold
                        const w = plotWidth / count;
                        segments.push(
                          `M ${(x - w / 2).toFixed(1)} ${threshY.toFixed(1)} L ${(x - w / 2).toFixed(1)} ${y.toFixed(1)} L ${(x + w / 2).toFixed(1)} ${y.toFixed(1)} L ${(x + w / 2).toFixed(1)} ${threshY.toFixed(1)} Z`,
                        );
                      }
                      if (segments.length === 0) return null;
                      return (
                        <path
                          d={segments.join(' ')}
                          fill="rgba(239, 68, 68, 0.15)"
                        />
                      );
                    })()}
                  </>
                )}

                {/* ── Bar chart lane ── */}
                {lane.type === 'bar' && (
                  <g>
                    {data.map((pt, i) => {
                      const val = pt[lane.field];
                      if (val == null || typeof val !== 'number' || val <= 0) return null;
                      const x = xScale(i);
                      const barW = Math.max(2, (plotWidth / count) * 0.6);
                      const laneBot = TOP_PAD + (laneIdx + 1) * LANE_HEIGHT - 6;
                      const y = yScale(val, lane.domain, laneIdx);
                      return (
                        <rect
                          key={i}
                          x={x - barW / 2}
                          y={y}
                          width={barW}
                          height={laneBot - y}
                          fill={lane.color}
                          fillOpacity={0.6}
                          rx="1"
                        />
                      );
                    })}
                  </g>
                )}

                {/* ── Marker lane ── */}
                {lane.type === 'marker' && (
                  <g>
                    {/* Thin baseline */}
                    <line
                      x1={LABEL_WIDTH}
                      y1={laneTop + LANE_HEIGHT / 2}
                      x2={chartWidth - RIGHT_PAD}
                      y2={laneTop + LANE_HEIGHT / 2}
                      stroke="var(--border)"
                      strokeWidth="0.5"
                    />
                    {data.map((pt, i) => {
                      const val = pt[lane.field];
                      if (!val) return null;
                      const x = xScale(i);
                      const cy = laneTop + LANE_HEIGHT / 2;

                      if (lane.id === 'drone' && pt.droneFlown) {
                        // Diamond marker
                        return (
                          <g key={i} transform={`translate(${x}, ${cy})`}>
                            <rect
                              x="-5" y="-5" width="10" height="10"
                              rx="1"
                              fill={lane.color}
                              fillOpacity="0.8"
                              transform="rotate(45)"
                            />
                          </g>
                        );
                      }
                      if (lane.id === 'community' && typeof val === 'number' && val > 0) {
                        const r = Math.max(3, Math.min(8, val * 1.2));
                        return (
                          <circle
                            key={i}
                            cx={x}
                            cy={cy}
                            r={r}
                            fill={lane.color}
                            fillOpacity={0.6}
                            stroke={lane.color}
                            strokeWidth="0.5"
                            strokeOpacity="0.8"
                          />
                        );
                      }
                      return null;
                    })}
                  </g>
                )}

                {/* Right-side current value (when active) */}
                {activeIdx !== null && (() => {
                  const pt = data[activeIdx];
                  const val = pt[lane.field];
                  if (val == null) return null;
                  const display = typeof val === 'boolean'
                    ? (val ? '◆' : '')
                    : typeof val === 'number' ? lane.formatValue(val) : '';
                  if (!display) return null;
                  return (
                    <text
                      x={chartWidth - RIGHT_PAD + 12}
                      y={laneTop + LANE_HEIGHT / 2 + 4}
                      fontSize="11"
                      fontWeight="700"
                      fontFamily="var(--font-main)"
                      fill={lane.color}
                    >
                      {display}
                    </text>
                  );
                })()}
              </g>
            );
          })}

          {/* ─── X-Axis Date Labels ─── */}
          {(() => {
            const tickCount = Math.min(8, count);
            const step = Math.floor(count / tickCount);
            const ticks: number[] = [];
            for (let i = 0; i < count; i += step) ticks.push(i);
            if (ticks[ticks.length - 1] !== count - 1) ticks.push(count - 1);

            return ticks.map((idx) => (
              <text
                key={idx}
                x={xScale(idx)}
                y={totalHeight - 4}
                textAnchor="middle"
                fontSize="9"
                fontFamily="var(--font-main)"
                fill="var(--text3)"
              >
                {formatDateShort(data[idx].date)}
              </text>
            ));
          })()}

          {/* ─── Crosshair / Scrubber ─── */}
          {activeIdx !== null && (
            <g>
              <line
                x1={xScale(activeIdx)}
                y1={TOP_PAD}
                x2={xScale(activeIdx)}
                y2={TOP_PAD + LANES.length * LANE_HEIGHT}
                stroke="var(--green)"
                strokeWidth="1"
                strokeOpacity="0.5"
                strokeDasharray="3 2"
              />
              {/* Date label on crosshair */}
              <rect
                x={xScale(activeIdx) - 28}
                y={TOP_PAD + LANES.length * LANE_HEIGHT + 2}
                width="56"
                height="16"
                rx="4"
                fill="var(--bg3)"
                stroke="var(--border)"
                strokeWidth="0.5"
              />
              <text
                x={xScale(activeIdx)}
                y={TOP_PAD + LANES.length * LANE_HEIGHT + 13}
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fontFamily="var(--font-main)"
                fill="var(--green)"
              >
                {formatDateShort(data[activeIdx].date)}
              </text>

              {/* Dots on each lane at crosshair */}
              {LANES.map((lane, laneIdx) => {
                const val = data[activeIdx][lane.field];
                if (val == null || typeof val !== 'number') return null;
                if (lane.type === 'marker') return null;
                const x = xScale(activeIdx);
                const y = yScale(val, lane.domain, laneIdx);
                return (
                  <circle
                    key={lane.id}
                    cx={x}
                    cy={y}
                    r="3.5"
                    fill={lane.color}
                    stroke="var(--bg2)"
                    strokeWidth="1.5"
                  />
                );
              })}
            </g>
          )}
        </svg>
      </div>

      {/* ─── Bottom Summary (when date selected) ─── */}
      {activePoint && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg3)',
          }}
        >
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--green)', fontFamily: 'var(--font-main)' }}
          >
            {formatDateShort(data[activeIdx!].date)}
          </span>
          {LANES.map((lane) => {
            const val = activePoint[lane.field];
            if (val == null) return null;
            const display = typeof val === 'boolean'
              ? (val ? 'Flown' : null)
              : typeof val === 'number' ? lane.formatValue(val) : null;
            if (!display) return null;
            const Icon = lane.icon;
            return (
              <span
                key={lane.id}
                className="flex items-center gap-1 text-[11px]"
                style={{ color: 'var(--text2)' }}
              >
                <Icon size={11} color={lane.color} />
                <span style={{ color: lane.color, fontWeight: 600 }}>{display}</span>
                <span style={{ color: 'var(--text3)' }}>{lane.unit}</span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TemporalFusionTimeline;
