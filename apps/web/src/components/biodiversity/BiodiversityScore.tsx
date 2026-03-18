/**
 * BiodiversityScore — Radial score display with sector breakdown.
 *
 * Large circular score (0-100) with gradient, 6 sector breakdown,
 * per-sector scores/trends, and improvement tips.
 */

import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TreePine,
  Bug,
  Droplets,
  Skull,
  Layers,
  Flower2,
} from 'lucide-react';
import type { ParcelBiodiversity, BiodiversitySector } from '@/hooks/useBiodiversity';

// ─── Helpers ───

function scoreColor(score: number): string {
  if (score >= 75) return '#4ade80';
  if (score >= 50) return '#fbbf24';
  return '#ef4444';
}

function scoreGradient(score: number): [string, string] {
  if (score >= 75) return ['#22c55e', '#4ade80'];
  if (score >= 50) return ['#f59e0b', '#fbbf24'];
  return ['#dc2626', '#ef4444'];
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  switch (trend) {
    case 'up': return <TrendingUp size={12} className="text-[var(--green)]" />;
    case 'down': return <TrendingDown size={12} className="text-red-400" />;
    default: return <Minus size={12} className="text-[var(--text3)]" />;
  }
}

function SectorIcon({ id }: { id: string }) {
  const cls = 'w-4 h-4';
  switch (id) {
    case 'species': return <Flower2 className={cls} />;
    case 'structure': return <Layers className={cls} />;
    case 'deadwood': return <Skull className={cls} />;
    case 'oldgrowth': return <TreePine className={cls} />;
    case 'redlisted': return <Bug className={cls} />;
    case 'water': return <Droplets className={cls} />;
    default: return <TreePine className={cls} />;
  }
}

// ─── Radial Score Ring ───

function ScoreRing({ score, size = 180 }: { score: number; size?: number }) {
  const r = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;
  const [c1, c2] = scoreGradient(score);
  const gradId = `score-grad-${score}`;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg3)" strokeWidth="10" />
        {/* Score arc */}
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference - progress}`}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold font-mono" style={{ color: scoreColor(score) }}>
          {score}
        </span>
        <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  );
}

// ─── Sector Row ───

function SectorRow({ sector }: { sector: BiodiversitySector }) {
  const [showTip, setShowTip] = useState(false);
  const pct = (sector.score / sector.maxScore) * 100;

  return (
    <div className="rounded-xl border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text3)]"><SectorIcon id={sector.id} /></span>
          <div>
            <p className="text-xs font-medium text-[var(--text)]">{sector.nameSv}</p>
            <p className="text-[10px] text-[var(--text3)]">{sector.nameEn}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendIcon trend={sector.trend} />
          <span className="text-sm font-bold font-mono" style={{ color: scoreColor((sector.score / sector.maxScore) * 100) }}>
            {sector.score}/{sector.maxScore}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: scoreColor(pct) }}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text3)]">
          Förbättringspotential: +{sector.improvementPotential}
        </span>
        <button
          onClick={() => setShowTip(!showTip)}
          className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:underline"
        >
          <Lightbulb size={10} />
          Tips
          {showTip ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      {showTip && (
        <div className="mt-2 p-2.5 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
          <p className="text-[11px] text-[var(--green)]">{sector.tip}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

interface BiodiversityScoreProps {
  data: ParcelBiodiversity;
  nationalAvg: number;
}

export function BiodiversityScore({ data, nationalAvg }: BiodiversityScoreProps) {
  const [showAllTips, setShowAllTips] = useState(false);

  return (
    <div className="space-y-6">
      {/* Score ring + benchmark */}
      <div className="flex flex-col items-center gap-4">
        <ScoreRing score={data.totalScore} />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--green)]/20 bg-[var(--green)]/5">
            <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
            <span className="text-xs text-[var(--text)]">Din skog: <strong className="font-mono text-[var(--green)]">{data.totalScore}</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
            <div className="w-2 h-2 rounded-full bg-[var(--text3)]" />
            <span className="text-xs text-[var(--text2)]">Riksgenomsnittet: <strong className="font-mono">{nationalAvg}</strong></span>
          </div>
        </div>

        {data.totalScore > nationalAvg && (
          <p className="text-xs text-[var(--green)] font-medium">
            +{data.totalScore - nationalAvg} poäng över riksgenomsnittet
          </p>
        )}
      </div>

      {/* Sector breakdown */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Sektorpoäng</h3>
          <button
            onClick={() => setShowAllTips(!showAllTips)}
            className="flex items-center gap-1.5 text-[10px] text-[var(--green)] hover:underline"
          >
            <Lightbulb size={12} />
            {showAllTips ? 'Dölj alla tips' : 'Hur ökar jag poängen?'}
          </button>
        </div>

        <div className="space-y-2">
          {data.sectors.map(sector => (
            <SectorRow key={sector.id} sector={sector} />
          ))}
        </div>
      </div>

      {/* Quick summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg2)' }}>
          <p className="text-lg font-bold font-mono text-[var(--text)]">{data.speciesCount}</p>
          <p className="text-[10px] text-[var(--text3)]">Arter registrerade</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg2)' }}>
          <p className="text-lg font-bold font-mono text-[var(--green)]">{data.creditsPerYear}</p>
          <p className="text-[10px] text-[var(--text3)]">Krediter/år</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg2)' }}>
          <p className="text-lg font-bold font-mono text-amber-400">{data.rarityIndex}%</p>
          <p className="text-[10px] text-[var(--text3)]">Sällsynthetsindex</p>
        </div>
      </div>
    </div>
  );
}
