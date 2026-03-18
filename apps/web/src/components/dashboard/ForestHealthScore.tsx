import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { VisuallyHidden } from '@/components/a11y/VisuallyHidden';
import type { ForestHealthScoreData, HealthTrend } from '@/hooks/useForestHealthScore';

// ─── Helpers ───

function getScoreColor(score: number): string {
  if (score <= 33) return '#ef4444'; // red-500
  if (score <= 66) return '#eab308'; // yellow-500
  return '#4ade80'; // green-400
}

function getScoreGradient(score: number): [string, string] {
  if (score <= 33) return ['#dc2626', '#ef4444'];
  if (score <= 66) return ['#ca8a04', '#eab308'];
  return ['#16a34a', '#4ade80'];
}

/** Returns a text label for the score range, alongside color coding (WCAG non-color indicator) */
function getScoreStatusLabel(score: number): { label: string; className: string } {
  if (score <= 33) return { label: 'Critical', className: 'status-critical' };
  if (score <= 66) return { label: 'At Risk', className: 'status-at-risk' };
  return { label: 'Healthy', className: 'status-healthy' };
}

function getTrendIcon(trend: HealthTrend) {
  switch (trend) {
    case 'improving': return <TrendingUp size={20} className="text-[#4ade80]" aria-hidden="true" />;
    case 'declining': return <TrendingDown size={20} className="text-[#ef4444]" aria-hidden="true" />;
    case 'stable': return <Minus size={20} className="text-[#eab308]" aria-hidden="true" />;
  }
}

function getTrendKey(trend: HealthTrend): string {
  switch (trend) {
    case 'improving': return 'health.trendImproving';
    case 'declining': return 'health.trendDeclining';
    case 'stable': return 'health.trendStable';
  }
}

// ─── Circular Gauge SVG ───

interface CircularGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  trend: HealthTrend;
}

function CircularGauge({ score, size = 200, strokeWidth = 12, trend }: CircularGaugeProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  const [animatedScore, setAnimatedScore] = useState(0);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ANIMATION_DURATION = 1400; // ms

  useEffect(() => {
    // Skip animation if user prefers reduced motion
    if (prefersReducedMotion || score === 0) {
      setAnimatedScore(score);
      return;
    }

    startTimeRef.current = performance.now();

    function animate(now: number) {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [score, prefersReducedMotion]);

  const fillPercent = animatedScore / 100;
  const dashOffset = circumference * (1 - fillPercent);
  const [colorStart, colorEnd] = getScoreGradient(animatedScore);
  const gradientId = 'healthScoreGradient';
  const statusInfo = getScoreStatusLabel(score);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Forest health score: ${score} out of 100. Status: ${statusInfo.label}. Trend: ${trend}`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          opacity={0.3}
        />
        {/* Filled ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 0.1s ease-out' }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-5xl font-mono font-bold tabular-nums"
          style={{ color: getScoreColor(animatedScore) }}
          aria-hidden="true"
        >
          {animatedScore}
        </span>
        {/* Status label alongside color (WCAG: don't rely on color alone) */}
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${statusInfo.className}`}
          style={{ color: getScoreColor(score) }}
        >
          {statusInfo.label}
        </span>
        <div className="flex items-center gap-1.5 mt-1">
          {getTrendIcon(trend)}
          <span className="text-xs text-[var(--text3)] font-medium">
            {t(getTrendKey(trend))}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───

interface ForestHealthScoreProps {
  data: ForestHealthScoreData;
}

export function ForestHealthScore({ data }: ForestHealthScoreProps) {
  const { t } = useTranslation();
  const { score, trend, benchmark, summary, isLoading, isDemo: isDemoMode } = data;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border)] p-6 animate-pulse" style={{ background: 'var(--bg2)' }} role="status">
        <VisuallyHidden>Loading forest health score</VisuallyHidden>
        <div className="flex flex-col items-center">
          <div className="w-[200px] h-[200px] rounded-full bg-[var(--bg3)]" />
          <div className="h-4 w-48 bg-[var(--bg3)] rounded mt-5" />
          <div className="h-3 w-64 bg-[var(--bg3)] rounded mt-3" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-[var(--border)] p-6 relative overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Subtle glow effect behind the gauge */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full opacity-[0.07] blur-3xl pointer-events-none"
        style={{ background: getScoreColor(score) }}
        aria-hidden="true"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative">
        <h2 className="text-sm font-semibold text-[var(--text)]">
          {t('health.title')}
        </h2>
        {isDemoMode && (
          <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
            DEMO
          </span>
        )}
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center relative">
        <CircularGauge score={score} trend={trend} />

        {/* Screen reader summary of gauge */}
        <VisuallyHidden>
          Forest health score is {score} out of 100, rated {getScoreStatusLabel(score).label}.
          Trend is {trend}. In the {benchmark.percentile}th percentile for {benchmark.county}.
        </VisuallyHidden>

        {/* Benchmark text */}
        <p className="text-sm text-[var(--text2)] mt-4 text-center">
          {t('health.benchmarkText', {
            percentile: benchmark.percentile,
            county: benchmark.county,
          })}
        </p>

        {/* AI Summary */}
        <div className="mt-4 flex items-start gap-2 w-full max-w-md mx-auto">
          <Sparkles size={14} className="text-[var(--green)] flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs text-[var(--text3)] leading-relaxed italic">
            {summary}
          </p>
        </div>
      </div>
    </div>
  );
}
