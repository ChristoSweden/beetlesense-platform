import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Leaf,
  Shield,
  DollarSign,
  Sprout,
  Cloud,
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { VisuallyHidden } from '@/components/a11y/VisuallyHidden';

// ─── Types ───

interface SectorScore {
  key: string;
  label: string;
  labelEn: string;
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  color: string;
  icon: React.ReactNode;
  details?: string;
}

type OverallTrend = 'improving' | 'stable' | 'declining';

interface ForestIntelligenceScoreProps {
  className?: string;
}

// ─── Demo data ───

function getDemoScores(): { overall: number; trend: OverallTrend; sectors: SectorScore[] } {
  return {
    overall: 72,
    trend: 'improving',
    sectors: [
      {
        key: 'health',
        label: 'Hälsa',
        labelEn: 'Health',
        score: 78,
        trend: 'stable',
        color: '#4ade80',
        icon: <Leaf size={14} aria-hidden="true" />,
        details: 'NDVI medel 0.72 — 2 av 5 skiften visar stress',
      },
      {
        key: 'risk',
        label: 'Risk',
        labelEn: 'Risk',
        score: 58,
        trend: 'declining',
        color: '#ef4444',
        icon: <Shield size={14} aria-hidden="true" />,
        details: 'Barkborre detekterad i Granudden, stormrisk moderat',
      },
      {
        key: 'value',
        label: 'Värde',
        labelEn: 'Value',
        score: 81,
        trend: 'improving',
        color: '#fbbf24',
        icon: <DollarSign size={14} aria-hidden="true" />,
        details: 'Medelvärde 680 SEK/m³fub — timmerpris +4% YoY',
      },
      {
        key: 'growth',
        label: 'Tillväxt',
        labelEn: 'Growth',
        score: 74,
        trend: 'improving',
        color: '#22d3ee',
        icon: <Sprout size={14} aria-hidden="true" />,
        details: 'Medelårsillväxt 7.2 m³/ha — god vårstart',
      },
      {
        key: 'climate',
        label: 'Klimat',
        labelEn: 'Climate',
        score: 69,
        trend: 'stable',
        color: '#a78bfa',
        icon: <Cloud size={14} aria-hidden="true" />,
        details: 'Kolbindning 4.1 ton/ha/år — certifieringskrav uppfyllt',
      },
    ],
  };
}

// ─── Helpers ───

function getScoreGrade(score: number): { label: string; className: string } {
  if (score >= 80) return { label: 'Utmärkt', className: 'text-[#4ade80]' };
  if (score >= 60) return { label: 'Bra', className: 'text-[#fbbf24]' };
  if (score >= 40) return { label: 'Varning', className: 'text-[#f59e0b]' };
  return { label: 'Kritiskt', className: 'text-[#ef4444]' };
}

function getTrendLabel(trend: OverallTrend): { icon: React.ReactNode; label: string; color: string } {
  switch (trend) {
    case 'improving':
      return { icon: <TrendingUp size={16} aria-hidden="true" />, label: 'Förbättras', color: '#4ade80' };
    case 'declining':
      return { icon: <TrendingDown size={16} aria-hidden="true" />, label: 'Försämras', color: '#ef4444' };
    case 'stable':
      return { icon: <Minus size={16} aria-hidden="true" />, label: 'Stabil', color: '#fbbf24' };
  }
}

function _easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Spring physics for arc animation
function springInterp(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0 ? 0
    : t >= 1 ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

// ─── SVG Radial Gauge ───

interface RadialGaugeProps {
  overall: number;
  sectors: SectorScore[];
  decomposed: boolean;
}

function RadialGauge({ overall, sectors, decomposed }: RadialGaugeProps) {
  const prefersReducedMotion = useReducedMotion();
  const [animProgress, setAnimProgress] = useState(0);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimProgress(1);
      setScoreDisplay(overall);
      return;
    }

    startTimeRef.current = performance.now();
    const duration = 1800; // ms

    function tick(now: number) {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = springInterp(t);
      setAnimProgress(eased);
      setScoreDisplay(Math.round(eased * overall));

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      }
    }

    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [overall, prefersReducedMotion]);

  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = 105;
  const arcWidth = 18;
  const innerR = outerR - arcWidth;
  const gapAngle = 4; // degrees between sectors
  const totalGap = gapAngle * sectors.length;
  const totalArc = 300; // degrees out of 360 for the gauge
  const startAngle = 120; // start from bottom-left

  // Overall score arc
  const scoreArcAngle = (overall / 100) * totalArc * animProgress;

  // Sector arcs
  const sectorArcDeg = (totalArc - totalGap) / sectors.length;
  const decomposedOffset = decomposed ? 20 : 0;

  function polarToXY(angleDeg: number, r: number): { x: number; y: number } {
    const rad = (angleDeg - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startDeg: number, endDeg: number, r: number, width: number, extraR = 0): string {
    const R = r + extraR;
    const rInner = R - width;
    const s1 = polarToXY(startDeg, R);
    const e1 = polarToXY(endDeg, R);
    const s2 = polarToXY(endDeg, rInner);
    const e2 = polarToXY(startDeg, rInner);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s1.x} ${s1.y} A ${R} ${R} 0 ${large} 1 ${e1.x} ${e1.y}
            L ${s2.x} ${s2.y} A ${rInner} ${rInner} 0 ${large} 0 ${e2.x} ${e2.y} Z`;
  }

  const grade = getScoreGrade(overall);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-full h-full"
      role="img"
      aria-label={`Forest Intelligence Score: ${overall} out of 100`}
    >
      <defs>
        {/* Glow filter */}
        <filter id="gauge-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {/* Score gradient */}
        <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#16a34a" />
          <stop offset="50%" stopColor="#4ade80" />
          <stop offset="100%" stopColor="#86efac" />
        </linearGradient>
      </defs>

      {/* Background track */}
      <path
        d={arcPath(startAngle, startAngle + totalArc, outerR, arcWidth)}
        fill="rgba(255,255,255,0.04)"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.5"
      />

      {/* Sector arcs */}
      {sectors.map((sector, i) => {
        const sStart = startAngle + i * (sectorArcDeg + gapAngle);
        const sectorProgress = animProgress * (sector.score / 100);
        const sEnd = sStart + sectorArcDeg * sectorProgress;

        // Mid-angle for decompose translation
        const midAngle = sStart + sectorArcDeg / 2;
        const midRad = (midAngle - 90) * (Math.PI / 180);
        const tx = decomposed ? Math.cos(midRad) * decomposedOffset : 0;
        const ty = decomposed ? Math.sin(midRad) * decomposedOffset : 0;

        return (
          <g
            key={sector.key}
            style={{
              transform: `translate(${tx}px, ${ty}px)`,
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Sector track */}
            <path
              d={arcPath(sStart, sStart + sectorArcDeg, outerR, arcWidth)}
              fill="rgba(255,255,255,0.03)"
            />
            {/* Sector filled arc */}
            {sEnd > sStart + 0.5 && (
              <path
                d={arcPath(sStart, sEnd, outerR, arcWidth)}
                fill={sector.color}
                opacity={0.7 + 0.3 * animProgress}
                filter="url(#gauge-glow)"
              />
            )}
            {/* Sector label (when decomposed) */}
            {decomposed && (
              <text
                x={cx + Math.cos(midRad) * (outerR + decomposedOffset + 14)}
                y={cy + Math.sin(midRad) * (outerR + decomposedOffset + 14)}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={sector.color}
                fontSize="8"
                fontFamily="'DM Sans', sans-serif"
                fontWeight="600"
              >
                {sector.label} {sector.score}
              </text>
            )}
          </g>
        );
      })}

      {/* Inner score ring */}
      {scoreArcAngle > 0.5 && (
        <path
          d={arcPath(startAngle, startAngle + scoreArcAngle, innerR - 4, 6)}
          fill="url(#score-grad)"
          opacity={0.5}
        />
      )}

      {/* Center score number */}
      <text
        x={cx}
        y={cy - 12}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--text, #e8f5e9)"
        fontSize="46"
        fontFamily="'DM Mono', monospace"
        fontWeight="700"
      >
        {scoreDisplay}
      </text>

      {/* Score label */}
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--text2, #a3c9a8)"
        fontSize="10"
        fontFamily="'DM Sans', sans-serif"
        fontWeight="500"
        letterSpacing="0.08em"
      >
        FOREST INTELLIGENCE
      </text>

      {/* Grade label */}
      <text
        x={cx}
        y={cy + 34}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={overall >= 80 ? '#4ade80' : overall >= 60 ? '#fbbf24' : overall >= 40 ? '#f59e0b' : '#ef4444'}
        fontSize="11"
        fontFamily="'DM Sans', sans-serif"
        fontWeight="600"
      >
        {grade.label}
      </text>
    </svg>
  );
}

// ─── Mini Progress Bar ───

function MiniProgressBar({ sector, animDelay }: { sector: SectorScore; animDelay: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) {
      setWidth(sector.score);
      return;
    }
    const timer = setTimeout(() => {
      setWidth(sector.score);
    }, animDelay);
    return () => clearTimeout(timer);
  }, [sector.score, animDelay, prefersReducedMotion]);

  const trendInfo = getTrendLabel(sector.trend);

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-20 flex-shrink-0">
        <span style={{ color: sector.color }}>{sector.icon}</span>
        <span className="text-xs text-[var(--text2)] font-medium">{sector.label}</span>
      </div>
      <div className="flex-1 h-2 rounded-full bg-[var(--bg3)] overflow-hidden relative">
        <div
          className="h-full rounded-full"
          style={{
            width: `${width}%`,
            backgroundColor: sector.color,
            opacity: 0.8,
            transition: prefersReducedMotion ? 'none' : 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
        {/* Shimmer highlight */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)`,
            transition: prefersReducedMotion ? 'none' : 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      </div>
      <div className="flex items-center gap-1 w-14 flex-shrink-0 justify-end">
        <span className="text-xs font-mono text-[var(--text)] font-semibold">{sector.score}</span>
        <span style={{ color: trendInfo.color }}>{trendInfo.icon}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───

export function ForestIntelligenceScore({ className = '' }: ForestIntelligenceScoreProps) {
  const { t: _t } = useTranslation();
  const [decomposed, setDecomposed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const data = getDemoScores();
  const trendInfo = getTrendLabel(data.trend);

  return (
    <div
      className={`rounded-2xl border border-[var(--border)] overflow-hidden ${className}`}
      style={{ background: 'var(--surface)' }}
      role="region"
      aria-label="Forest Intelligence Score - overall forest health composite metric"
    >
      {/* Header */}
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">
            Skogsintelligens
          </h2>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            Samlad bedömning av alla skiften
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--bg3)]" style={{ color: trendInfo.color }}>
          {trendInfo.icon}
          <span className="text-xs font-medium">{trendInfo.label}</span>
          <span className="text-[10px] text-[var(--text3)] ml-1">vs förra mån</span>
        </div>
      </div>

      {/* Gauge */}
      <div className="px-5 pt-4 pb-2">
        <div className="w-56 h-56 mx-auto relative">
          <RadialGauge
            overall={data.overall}
            sectors={data.sectors}
            decomposed={decomposed}
          />
        </div>
      </div>

      {/* Decompose button */}
      <div className="px-5 pb-3 flex justify-center">
        <button
          onClick={() => setDecomposed(!decomposed)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                     transition-all duration-300 ${
            decomposed
              ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
              : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] border border-transparent'
          }`}
          aria-label={decomposed ? 'Collapse sector breakdown' : 'Decompose into sectors'}
          aria-pressed={decomposed}
        >
          <ChevronDown
            size={12}
            className={`transition-transform duration-300 ${decomposed ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          <span>{decomposed ? 'Sammanfatta' : 'Dekomponera'}</span>
        </button>
      </div>

      {/* Sector progress bars */}
      <div className="px-5 pb-4 space-y-2">
        {data.sectors.map((sector, i) => (
          <MiniProgressBar
            key={sector.key}
            sector={sector}
            animDelay={400 + i * 150}
          />
        ))}
      </div>

      {/* Expandable details */}
      <div className="border-t border-[var(--border)]">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-5 py-2 flex items-center justify-between text-[var(--text3)]
                     hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          aria-expanded={showDetails}
          aria-label="Show detailed sector breakdown"
        >
          <span className="text-[10px] uppercase tracking-wider font-semibold">
            Detaljerad analys
          </span>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {showDetails && (
          <div className="px-5 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
            {data.sectors.map((sector) => (
              <div key={sector.key} className="flex items-start gap-2.5">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${sector.color}20`, color: sector.color }}
                >
                  {sector.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text)]">{sector.label}</span>
                    <span className="text-[10px] font-mono" style={{ color: sector.color }}>
                      {sector.score}/100
                    </span>
                  </div>
                  {sector.details && (
                    <p className="text-[10px] text-[var(--text3)] mt-0.5 leading-relaxed">
                      {sector.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Screen reader summary */}
      <VisuallyHidden>
        Forest Intelligence Score is {data.overall} out of 100, rated as {getScoreGrade(data.overall).label}.
        Trend is {data.trend} compared to last month.
        Health: {data.sectors[0].score}, Risk: {data.sectors[1].score},
        Value: {data.sectors[2].score}, Growth: {data.sectors[3].score},
        Climate: {data.sectors[4].score}.
      </VisuallyHidden>
    </div>
  );
}
