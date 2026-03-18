/**
 * ImprovementPlan — Actionable steps to boost biodiversity and credit generation.
 *
 * Per-action: cost, time, score impact, credit impact, ROI.
 * Prioritized by ROI. Cumulative improvement chart.
 * Naturvårdsavtal eligibility check.
 */

import { useState, useMemo } from 'react';
import {
  TreePine,
  Droplets,
  Bird,
  Layers,
  Skull,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Zap,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import type { ImprovementAction } from '@/hooks/useBiodiversity';

// ─── Helpers ───

function formatSEK(n: number): string {
  return n.toLocaleString('sv-SE', { maximumFractionDigits: 0 }) + ' kr';
}

function CategoryIcon({ category }: { category: string }) {
  const cls = 'w-4 h-4';
  switch (category) {
    case 'deadwood': return <Skull className={cls} />;
    case 'retention': return <Layers className={cls} />;
    case 'wetland': return <Droplets className={cls} />;
    case 'nesting': return <Bird className={cls} />;
    case 'edge': return <TreePine className={cls} />;
    default: return <TreePine className={cls} />;
  }
}

function _CategoryLabel({ category }: { category: string }) {
  const labels: Record<string, string> = {
    deadwood: 'Död ved',
    retention: 'Retentionsytor',
    wetland: 'Våtmark',
    nesting: 'Häckning',
    edge: 'Skogsbryn',
    other: 'Övrigt',
  };
  return <>{labels[category] || category}</>;
}

// ─── Action Card ───

function ActionCard({ action, rank }: { action: ImprovementAction; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const roiLabel = action.roi === Infinity ? 'Gratis' : `${action.roi.toFixed(1)}x`;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10 border border-[var(--green)]/20 flex-shrink-0">
              <span className="text-xs font-bold font-mono text-[var(--green)]">#{rank}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text3)]"><CategoryIcon category={action.category} /></span>
                <p className="text-sm font-medium text-[var(--text)]">{action.nameSv}</p>
              </div>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">{action.nameEn}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
              action.roi >= 3 ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20' :
              action.roi >= 1 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-[var(--bg3)] text-[var(--text3)] border-[var(--border)]'
            }`}>
              ROI {roiLabel}
            </div>
            {expanded ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
          </div>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 mt-3 ml-11">
          <span className="text-[10px] text-[var(--text3)]">
            Kostnad: <strong className="font-mono text-[var(--text)]">{action.costSEK === 0 ? 'Gratis' : formatSEK(action.costSEK)}</strong>
          </span>
          <span className="text-[10px] text-[var(--text3)]">
            Poäng: <strong className="font-mono text-[var(--green)]">+{action.scoreImpact}</strong>
          </span>
          <span className="text-[10px] text-[var(--text3)]">
            Krediter: <strong className="font-mono text-[var(--green)]">+{action.creditImpact}/år</strong>
          </span>
          <span className="text-[10px] text-[var(--text3)]">
            Intäkt: <strong className="font-mono text-[var(--green)]">{formatSEK(action.annualRevenueSEK)}/år</strong>
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text2)] mt-3 mb-4">{action.description}</p>

          {/* Impact visualization */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text3)] mb-1">Kostnad</p>
              <p className="text-sm font-bold font-mono text-[var(--text)]">{action.costSEK === 0 ? 'Gratis' : formatSEK(action.costSEK)}</p>
              {action.timeMonths > 0 && <p className="text-[9px] text-[var(--text3)]">{action.timeMonths} månader</p>}
            </div>
            <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text3)] mb-1">Biodiversitetspoäng</p>
              <p className="text-sm font-bold font-mono text-[var(--green)]">+{action.scoreImpact}</p>
            </div>
            <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text3)] mb-1">Krediter per år</p>
              <p className="text-sm font-bold font-mono text-[var(--green)]">+{action.creditImpact}</p>
            </div>
            <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
              <p className="text-[10px] text-[var(--text3)] mb-1">Årsintäkt</p>
              <p className="text-sm font-bold font-mono text-[var(--green)]">{formatSEK(action.annualRevenueSEK)}</p>
            </div>
          </div>

          {/* ROI equation */}
          <div className="rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20 p-3 mb-3">
            <div className="flex items-center gap-2 text-xs text-[var(--green)]">
              <Zap size={14} />
              <span>
                {action.nameSv}
                <ArrowRight size={12} className="inline mx-1" />
                +{action.scoreImpact} biodiversitetspoäng
                <ArrowRight size={12} className="inline mx-1" />
                +{action.creditImpact} krediter/år
                <ArrowRight size={12} className="inline mx-1" />
                <strong className="font-mono">{formatSEK(action.annualRevenueSEK)}/år</strong>
              </span>
            </div>
          </div>

          {/* Naturvårdsavtal */}
          {action.naturvardsavtalEligible && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <ShieldCheck size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-blue-400 font-medium">Naturvårdsavtal möjligt</p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  Denna åtgärd kvalificerar för naturvårdsavtal med Skogsstyrelsen. Ersättning upp till 70%.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───

interface ImprovementPlanProps {
  actions: ImprovementAction[];
  currentScore: number;
  parcelName: string;
}

export function ImprovementPlan({ actions, currentScore, parcelName }: ImprovementPlanProps) {
  // Cumulative stats
  const cumulative = useMemo(() => {
    let score = currentScore;
    let credits = 0;
    let revenue = 0;
    let cost = 0;
    return actions.map((a, i) => {
      score += a.scoreImpact;
      credits += a.creditImpact;
      revenue += a.annualRevenueSEK;
      cost += a.costSEK;
      return { rank: i + 1, score: Math.min(score, 100), credits, revenue, cost, name: a.nameSv };
    });
  }, [actions, currentScore]);

  const totalScoreGain = useMemo(() => actions.reduce((s, a) => s + a.scoreImpact, 0), [actions]);
  const totalCreditGain = useMemo(() => actions.reduce((s, a) => s + a.creditImpact, 0), [actions]);
  const totalRevenue = useMemo(() => actions.reduce((s, a) => s + a.annualRevenueSEK, 0), [actions]);
  const totalCost = useMemo(() => actions.reduce((s, a) => s + a.costSEK, 0), [actions]);
  const naturvardsCount = useMemo(() => actions.filter(a => a.naturvardsavtalEligible).length, [actions]);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-5">
        <h3 className="text-sm font-semibold text-[var(--green)] mb-3">
          Förbättringsplan — {parcelName}
        </h3>
        <p className="text-xs text-[var(--text2)] mb-4">
          {actions.length} åtgärder identifierade. Sorterade efter ROI (bäst avkastning först).
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text3)]">Poängökning</p>
            <p className="text-lg font-bold font-mono text-[var(--green)]">{currentScore} → {Math.min(currentScore + totalScoreGain, 100)}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text3)]">Nya krediter</p>
            <p className="text-lg font-bold font-mono text-[var(--green)]">+{totalCreditGain}/år</p>
          </div>
          <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text3)]">Ny årsintäkt</p>
            <p className="text-lg font-bold font-mono text-[var(--green)]">{formatSEK(totalRevenue)}</p>
          </div>
          <div className="rounded-lg bg-[var(--bg)] p-3 border border-[var(--border)]">
            <p className="text-[10px] text-[var(--text3)]">Total kostnad</p>
            <p className="text-lg font-bold font-mono text-[var(--text)]">{formatSEK(totalCost)}</p>
          </div>
        </div>
      </div>

      {/* Cumulative chart */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3">Kumulativ förbättring</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[var(--text3)] w-16">Idag</span>
            <div className="flex-1 h-5 rounded-full bg-[var(--bg3)] overflow-hidden">
              <div className="h-full rounded-full bg-[var(--text3)]/30 flex items-center justify-end pr-2 transition-all"
                style={{ width: `${currentScore}%` }}>
                <span className="text-[9px] font-mono font-bold text-[var(--text)]">{currentScore}</span>
              </div>
            </div>
          </div>
          {cumulative.map(c => (
            <div key={c.rank} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-[var(--text3)] w-16">+Åtgärd {c.rank}</span>
              <div className="flex-1 h-5 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div className="h-full rounded-full bg-[var(--green)]/50 flex items-center justify-end pr-2 transition-all duration-700"
                  style={{ width: `${c.score}%` }}>
                  <span className="text-[9px] font-mono font-bold text-[var(--text)]">{c.score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Naturvårdsavtal check */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-semibold text-blue-400">Naturvårdsavtal med Skogsstyrelsen</h4>
            <p className="text-xs text-[var(--text2)] mt-1">
              {naturvardsCount} av {actions.length} åtgärder kvalificerar för naturvårdsavtal.
              Skogsstyrelsen kan ersätta upp till 70% av kostnaden för frivilliga naturvårdsåtgärder.
            </p>
            <a
              href="https://www.skogsstyrelsen.se/aga-skog/naturvard/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-400 mt-2 hover:underline"
            >
              Läs mer hos Skogsstyrelsen <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* Action list */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Åtgärder (sorterade efter ROI)</h3>
        <div className="space-y-2">
          {actions.map((action, i) => (
            <ActionCard key={action.id} action={action} rank={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}
