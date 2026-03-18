import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, TrendingUp, Heart, AlertTriangle } from 'lucide-react';
import type { PortfolioSummary as PortfolioSummaryData } from '@/hooks/usePortfolio';

// ─── Animated counter ───

function useAnimatedNumber(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = performance.now();

    function animate(now: number) {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(fromRef.current + (target - fromRef.current) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);

  }, [target, duration]);

  return value;
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span
      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
        isPositive
          ? 'text-[var(--green)] bg-[var(--green)]/10'
          : 'text-red-400 bg-red-400/10'
      }`}
    >
      {isPositive ? '\u2191' : '\u2193'}{' '}
      {Math.abs(value).toLocaleString('sv-SE', { maximumFractionDigits: 1 })}
      {typeof value === 'number' && Math.abs(value) < 100 ? '%' : ''}
    </span>
  );
}

function formatKr(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toLocaleString('sv-SE', { maximumFractionDigits: 0 })}k`;
  }
  return value.toLocaleString('sv-SE');
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  format?: 'number' | 'kr' | 'score';
  suffix?: string;
  trend?: number;
  color: string;
}

function StatCard({ icon, label, value, format = 'number', suffix, trend, color }: StatCardProps) {
  const animated = useAnimatedNumber(value);

  let displayValue: string;
  switch (format) {
    case 'kr':
      displayValue = formatKr(animated);
      break;
    case 'score':
      displayValue = String(animated);
      break;
    default:
      displayValue = animated.toLocaleString('sv-SE');
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {trend !== undefined && <TrendBadge value={trend} />}
      </div>
      <p className="mt-3 text-2xl font-semibold font-mono text-[var(--text)]">
        {displayValue}
        {suffix && <span className="text-sm text-[var(--text3)] ml-1">{suffix}</span>}
      </p>
      <p className="text-xs text-[var(--text3)] mt-1">{label}</p>
    </div>
  );
}

// ─── Main component ───

interface Props {
  summary: PortfolioSummaryData;
  isLoading: boolean;
}

export function PortfolioSummary({ summary, isLoading }: Props) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[var(--border)] p-4 animate-pulse"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="w-9 h-9 rounded-lg bg-[var(--bg3)]" />
            <div className="mt-3 h-7 w-20 rounded bg-[var(--bg3)]" />
            <div className="mt-2 h-3 w-24 rounded bg-[var(--bg3)]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        icon={<Map size={18} />}
        label={t('portfolio.totalHectares')}
        value={summary.totalHectares}
        suffix="ha"
        trend={summary.hectaresTrend || undefined}
        color="#4ade80"
      />
      <StatCard
        icon={<TrendingUp size={18} />}
        label={t('portfolio.totalValue')}
        value={summary.totalValue}
        format="kr"
        suffix="kr"
        trend={summary.valueTrend || undefined}
        color="#86efac"
      />
      <StatCard
        icon={<Heart size={18} />}
        label={t('portfolio.avgHealth')}
        value={summary.avgHealthScore}
        format="score"
        suffix="/100"
        trend={summary.healthTrend || undefined}
        color="#4ade80"
      />
      <StatCard
        icon={<AlertTriangle size={18} />}
        label={t('portfolio.activeWarnings')}
        value={summary.activeWarnings}
        trend={summary.warningsTrend || undefined}
        color="#fbbf24"
      />
    </div>
  );
}
