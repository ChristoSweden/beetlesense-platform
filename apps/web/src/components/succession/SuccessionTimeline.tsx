/**
 * SuccessionTimeline — Visual timeline for planning generational transfer events.
 *
 * Features:
 * - Milestones: juridisk radgivning, vardering, avtal, lantmateri, tilltrade
 * - Duration estimates per phase
 * - Checklist per milestone
 * - "Generationsvaxling klar" celebration state
 */

import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Circle,
  Clock,
  Play,
  ChevronDown,
  ChevronUp,
  PartyPopper,
  ArrowRight,
} from 'lucide-react';
import { useState } from 'react';
import type { TimelineMilestone } from '@/hooks/useSuccessionPlan';

interface SuccessionTimelineProps {
  timeline: TimelineMilestone[];
  toggleMilestoneStatus: (id: string) => void;
  toggleChecklistItem: (milestoneId: string, itemId: string) => void;
  completedMilestones: number;
  totalMilestones: number;
  isComplete: boolean;
}

const PHASE_COLORS: Record<string, string> = {
  Advisory: '#4ade80',
  Valuation: '#60a5fa',
  Agreement: '#a78bfa',
  'Land Survey': '#f59e0b',
  Transfer: '#ec4899',
};

export function SuccessionTimeline({
  timeline,
  toggleMilestoneStatus,
  toggleChecklistItem,
  completedMilestones,
  totalMilestones,
  isComplete,
}: SuccessionTimelineProps) {
  const { i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedMilestones((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalWeeksMin = timeline.reduce((s, m) => s + m.durationWeeks[0], 0);
  const totalWeeksMax = timeline.reduce((s, m) => s + m.durationWeeks[1], 0);
  const progressPct = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

  // Celebration state
  if (isComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--green)]/10 border-2 border-[var(--green)] flex items-center justify-center mb-6">
          <PartyPopper size={36} className="text-[var(--green)]" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[var(--green)] mb-2">
          {isSv ? 'Generationsvaxling klar!' : 'Generational transfer complete!'}
        </h2>
        <p className="text-sm text-[var(--text2)] max-w-md mb-6">
          {isSv
            ? 'Grattis! Alla milstolpar i overlatelsen ar genomforda. Skogen ar i goda hander for nasta generation.'
            : 'Congratulations! All milestones in the transfer have been completed. The forest is in good hands for the next generation.'}
        </p>
        <div className="flex items-center gap-3 text-xs text-[var(--text3)]">
          <span className="flex items-center gap-1">
            <CheckCircle2 size={12} className="text-[var(--green)]" />
            {completedMilestones}/{totalMilestones} {isSv ? 'milstolpar' : 'milestones'}
          </span>
          <span>&#183;</span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {totalWeeksMin}-{totalWeeksMax} {isSv ? 'veckor totalt' : 'weeks total'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress header */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {isSv ? 'Tidsplan for generationsvaxling' : 'Succession transfer timeline'}
          </h3>
          <span className="text-xs text-[var(--text3)]">
            {totalWeeksMin}-{totalWeeksMax} {isSv ? 'veckor' : 'weeks'}
          </span>
        </div>

        <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-[var(--text3)]">
          <span>
            {completedMilestones}/{totalMilestones} {isSv ? 'milstolpar klara' : 'milestones done'}
          </span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>

        {/* Phase overview strip */}
        <div className="flex gap-1 mt-3">
          {timeline.map((m) => {
            const color = PHASE_COLORS[m.phase] ?? 'var(--text3)';
            return (
              <div
                key={m.id}
                className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: m.status === 'complete' ? color : `${color}30`,
                }}
                title={isSv ? m.phaseSv : m.phase}
              />
            );
          })}
        </div>
      </div>

      {/* Timeline milestones */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[var(--border)]" />

        <div className="space-y-3">
          {timeline.map((milestone, idx) => {
            const isExpanded = expandedMilestones.has(milestone.id);
            const color = PHASE_COLORS[milestone.phase] ?? '#4ade80';
            const completedChecks = milestone.checklist.filter((c) => c.done).length;
            const totalChecks = milestone.checklist.length;
            const _prevComplete = idx === 0 || timeline[idx - 1].status === 'complete';

            return (
              <div key={milestone.id} className="relative pl-12">
                {/* Status node */}
                <div className="absolute left-0 top-4">
                  <button
                    onClick={() => toggleMilestoneStatus(milestone.id)}
                    className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all"
                    style={{
                      backgroundColor:
                        milestone.status === 'complete'
                          ? `${color}20`
                          : milestone.status === 'active'
                            ? `${color}10`
                            : 'var(--bg2)',
                      border: `2px solid ${
                        milestone.status === 'complete'
                          ? color
                          : milestone.status === 'active'
                            ? color
                            : 'var(--border)'
                      }`,
                    }}
                  >
                    {milestone.status === 'complete' ? (
                      <CheckCircle2 size={20} style={{ color }} />
                    ) : milestone.status === 'active' ? (
                      <Play size={14} style={{ color }} />
                    ) : (
                      <Circle size={16} className="text-[var(--text3)]" />
                    )}
                  </button>
                </div>

                {/* Content card */}
                <div
                  className={`rounded-xl border transition-all ${
                    milestone.status === 'complete'
                      ? 'border-[var(--green)]/20'
                      : milestone.status === 'active'
                        ? 'border-[var(--green)]/40'
                        : 'border-[var(--border)]'
                  }`}
                  style={{
                    background:
                      milestone.status === 'complete'
                        ? 'var(--green)'
                        : 'var(--bg2)',
                    // Using CSS variable workaround for completed bg
                    ...(milestone.status === 'complete'
                      ? { background: `${color}08` }
                      : {}),
                  }}
                >
                  <button
                    onClick={() => toggleExpand(milestone.id)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Phase badge */}
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${color}15`, color }}
                          >
                            {isSv ? milestone.phaseSv : milestone.phase}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                            <Clock size={10} />
                            {milestone.durationWeeks[0]}-{milestone.durationWeeks[1]}{' '}
                            {isSv ? 'veckor' : 'weeks'}
                          </span>
                        </div>

                        <h4
                          className={`text-sm font-semibold mb-1 ${
                            milestone.status === 'complete'
                              ? 'text-[var(--text3)] line-through'
                              : 'text-[var(--text)]'
                          }`}
                        >
                          {isSv ? milestone.titleSv : milestone.title}
                        </h4>
                        <p className="text-xs text-[var(--text2)]">
                          {isSv ? milestone.descriptionSv : milestone.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        {/* Checklist progress */}
                        <span className="text-[10px] font-mono text-[var(--text3)]">
                          {completedChecks}/{totalChecks}
                        </span>
                        {isExpanded ? (
                          <ChevronUp size={14} className="text-[var(--text3)]" />
                        ) : (
                          <ChevronDown size={14} className="text-[var(--text3)]" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded: checklist */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-1.5">
                      <div className="border-t border-[var(--border)] pt-3 mb-2">
                        <p className="text-[10px] font-semibold text-[var(--text)] mb-2">
                          {isSv ? 'Checklista' : 'Checklist'}
                        </p>
                      </div>
                      {milestone.checklist.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleChecklistItem(milestone.id, item.id)}
                          className="flex items-center gap-2 w-full text-left p-2 rounded-lg hover:bg-[var(--bg3)] transition-colors"
                        >
                          {item.done ? (
                            <CheckCircle2 size={16} className="text-[var(--green)] flex-shrink-0" />
                          ) : (
                            <Circle size={16} className="text-[var(--text3)] flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs ${
                              item.done
                                ? 'text-[var(--text3)] line-through'
                                : 'text-[var(--text)]'
                            }`}
                          >
                            {isSv ? item.labelSv : item.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Connector arrow */}
                {idx < timeline.length - 1 && (
                  <div className="flex items-center justify-center py-1">
                    <ArrowRight size={12} className="text-[var(--text3)] rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
