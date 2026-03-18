import { useState, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  TreePine,
  Axe,
  Sprout,
  Leaf,
  Scissors,
  X,
  AlertTriangle,
  Milestone,
} from 'lucide-react';
import type { PlanAction, ForestPlan } from '@/hooks/useForestPlan';

interface PlanTimelineProps {
  plan: ForestPlan;
  formatSEK: (v: number) => string;
}

type ZoomLevel = 'decade' | '5year' | 'yearly';

const ACTION_COLORS: Record<PlanAction['type'], string> = {
  rojning: '#fbbf24',
  gallring: '#4ade80',
  slutavverkning: '#f97316',
  plantering: '#38bdf8',
  naturvard: '#c084fc',
};

const ACTION_LABELS: Record<PlanAction['type'], string> = {
  rojning: 'Röjning',
  gallring: 'Gallring',
  slutavverkning: 'Slutavverkning',
  plantering: 'Plantering',
  naturvard: 'Naturvård',
};

const ACTION_ICONS: Record<PlanAction['type'], typeof TreePine> = {
  rojning: Scissors,
  gallring: Axe,
  slutavverkning: TreePine,
  plantering: Sprout,
  naturvard: Leaf,
};

export function PlanTimeline({ plan, formatSEK }: PlanTimelineProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('5year');
  const [selectedAction, setSelectedAction] = useState<PlanAction | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Unique parcels for swim lanes
  const parcelNames = useMemo(() => {
    const names = new Set(plan.actions.map(a => a.parcelName));
    return Array.from(names);
  }, [plan.actions]);

  const startYear = 2026;
  const endYear = 2076;

  const cellWidth = zoom === 'decade' ? 120 : zoom === '5year' ? 80 : 48;
  const yearStep = zoom === 'decade' ? 10 : zoom === '5year' ? 5 : 1;

  // Generate year columns
  const columns: number[] = [];
  for (let y = startYear; y <= endYear; y += yearStep) {
    columns.push(y);
  }

  const totalWidth = columns.length * cellWidth;

  // Get actions in a specific year range for a parcel
  const getActionsInRange = (parcelName: string, yearStart: number, yearEnd: number) => {
    return plan.actions.filter(
      a => a.parcelName === parcelName && a.year >= yearStart && a.year < yearEnd
    );
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const amount = cellWidth * 3;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
    }
  };

  const cycleZoom = (direction: 'in' | 'out') => {
    const levels: ZoomLevel[] = ['decade', '5year', 'yearly'];
    const idx = levels.indexOf(zoom);
    if (direction === 'in' && idx < levels.length - 1) setZoom(levels[idx + 1]);
    if (direction === 'out' && idx > 0) setZoom(levels[idx - 1]);
  };

  // Milestones and risk events
  const milestones = plan.actions.filter(a => a.milestone);
  const riskYears = plan.contingencies.map(c => c.triggerYear);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => scroll('left')} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => scroll('right')} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Legend */}
          <div className="hidden md:flex items-center gap-3 mr-4">
            {Object.entries(ACTION_LABELS).map(([type, label]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ background: ACTION_COLORS[type as PlanAction['type']] }}
                />
                <span className="text-[9px] text-[var(--text3)]">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-1 border border-[var(--border)] rounded-lg p-0.5">
            <button
              onClick={() => cycleZoom('out')}
              className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] transition-colors"
              title="Zooma ut"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[9px] font-mono text-[var(--text3)] px-1.5 min-w-[50px] text-center">
              {zoom === 'decade' ? '10 år' : zoom === '5year' ? '5 år' : '1 år'}
            </span>
            <button
              onClick={() => cycleZoom('in')}
              className="p-1 rounded hover:bg-[var(--bg3)] text-[var(--text3)] transition-colors"
              title="Zooma in"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Timeline grid */}
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-xl border border-[var(--border)]"
        style={{ background: 'var(--bg2)' }}
      >
        <div style={{ minWidth: totalWidth + 120 }}>
          {/* Header row with years */}
          <div className="flex border-b border-[var(--border)] sticky top-0 z-10" style={{ background: 'var(--bg2)' }}>
            <div className="w-[120px] flex-shrink-0 p-2 text-[9px] font-semibold text-[var(--text3)] uppercase tracking-wider border-r border-[var(--border)]">
              Skifte
            </div>
            {columns.map((year) => {
              const isRiskYear = riskYears.some(ry => ry >= year && ry < year + yearStep);
              return (
                <div
                  key={year}
                  className="flex-shrink-0 p-2 text-center border-r border-[var(--border)] relative"
                  style={{ width: cellWidth }}
                >
                  <span className={`text-[10px] font-mono ${isRiskYear ? 'text-orange-400' : 'text-[var(--text3)]'}`}>
                    {year}
                  </span>
                  {isRiskYear && (
                    <AlertTriangle size={8} className="absolute top-1 right-1 text-orange-400" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Milestone row */}
          {milestones.length > 0 && (
            <div className="flex border-b border-[var(--border)]" style={{ background: 'rgba(74, 222, 128, 0.03)' }}>
              <div className="w-[120px] flex-shrink-0 p-2 text-[9px] text-[var(--text3)] border-r border-[var(--border)] flex items-center gap-1">
                <Milestone size={10} className="text-[#4ade80]" />
                Milstolpar
              </div>
              {columns.map((year) => {
                const colMilestones = milestones.filter(m => m.year >= year && m.year < year + yearStep);
                return (
                  <div key={year} className="flex-shrink-0 p-1 border-r border-[var(--border)] flex items-center justify-center" style={{ width: cellWidth }}>
                    {colMilestones.length > 0 && (
                      <div
                        className="text-[7px] font-medium text-[#4ade80] bg-[#4ade80]/10 px-1.5 py-0.5 rounded-full text-center leading-tight truncate"
                        title={colMilestones[0].milestone}
                        style={{ maxWidth: cellWidth - 8 }}
                      >
                        {colMilestones[0].milestone}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Swim lanes per parcel */}
          {parcelNames.map((parcelName, idx) => (
            <div
              key={parcelName}
              className={`flex ${idx < parcelNames.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
            >
              <div className="w-[120px] flex-shrink-0 p-2 text-[10px] font-medium text-[var(--text)] border-r border-[var(--border)] flex items-center">
                {parcelName}
              </div>
              {columns.map((year) => {
                const rangeActions = getActionsInRange(parcelName, year, year + yearStep);
                return (
                  <div
                    key={year}
                    className="flex-shrink-0 p-1 border-r border-[var(--border)] flex flex-col gap-1 justify-center"
                    style={{ width: cellWidth, minHeight: 48 }}
                  >
                    {rangeActions.map((action) => {
                      const Icon = ACTION_ICONS[action.type];
                      return (
                        <button
                          key={action.id}
                          onClick={() => setSelectedAction(action)}
                          className="flex items-center gap-1 px-1.5 py-1 rounded-md text-left transition-all hover:brightness-125 cursor-pointer"
                          style={{
                            background: `${ACTION_COLORS[action.type]}20`,
                            borderLeft: `2px solid ${ACTION_COLORS[action.type]}`,
                          }}
                          title={action.label}
                        >
                          <Icon size={9} style={{ color: ACTION_COLORS[action.type], flexShrink: 0 }} />
                          <span
                            className="text-[8px] font-medium truncate"
                            style={{ color: ACTION_COLORS[action.type] }}
                          >
                            {zoom === 'yearly' ? ACTION_LABELS[action.type] : action.label.split(' ')[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Revenue markers */}
      <div className="flex flex-wrap gap-2">
        {plan.actions
          .filter(a => a.estimatedRevenue && a.estimatedRevenue > 40000)
          .map(a => (
            <button
              key={a.id}
              onClick={() => setSelectedAction(a)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-mono border border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg3)] transition-colors"
            >
              <span className="text-[#4ade80]">{a.year}</span>
              <span className="text-[var(--text2)]">{formatSEK(a.estimatedRevenue!)}</span>
              <span className="text-[var(--text3)]">{a.parcelName}</span>
            </button>
          ))}
      </div>

      {/* Action detail modal */}
      {selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedAction(null)}>
          <div
            className="rounded-xl border border-[var(--border)] p-5 max-w-md w-full space-y-3"
            style={{ background: 'var(--bg2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${ACTION_COLORS[selectedAction.type]}20` }}
                >
                  {(() => { const Icon = ACTION_ICONS[selectedAction.type]; return <Icon size={16} style={{ color: ACTION_COLORS[selectedAction.type] }} />; })()}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">{selectedAction.label}</h3>
                  <p className="text-[10px] text-[var(--text3)]">
                    {selectedAction.parcelName} &middot; {selectedAction.year}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedAction(null)} className="text-[var(--text3)] hover:text-[var(--text)] transition-colors">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-[var(--text2)] leading-relaxed">{selectedAction.description}</p>

            <div className="grid grid-cols-2 gap-3">
              {selectedAction.estimatedVolume && (
                <div className="rounded-lg border border-[var(--border)] p-2" style={{ background: 'var(--bg)' }}>
                  <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Volym</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">{selectedAction.estimatedVolume} m3</p>
                </div>
              )}
              {selectedAction.estimatedRevenue !== undefined && (
                <div className="rounded-lg border border-[var(--border)] p-2" style={{ background: 'var(--bg)' }}>
                  <p className="text-[9px] text-[var(--text3)] uppercase tracking-wider">
                    {selectedAction.estimatedRevenue >= 0 ? 'Intäkt' : 'Kostnad'}
                  </p>
                  <p
                    className="text-sm font-mono font-semibold"
                    style={{ color: selectedAction.estimatedRevenue >= 0 ? '#4ade80' : '#f97316' }}
                  >
                    {formatSEK(selectedAction.estimatedRevenue)}
                  </p>
                </div>
              )}
            </div>

            {selectedAction.milestone && (
              <div className="rounded-lg border p-2" style={{ background: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.15)' }}>
                <div className="flex items-center gap-1.5">
                  <Milestone size={12} className="text-[#4ade80]" />
                  <span className="text-[10px] font-medium text-[#4ade80]">{selectedAction.milestone}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg" style={{ background: `${ACTION_COLORS[selectedAction.type]}10` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: ACTION_COLORS[selectedAction.type] }} />
              <span className="text-[10px] font-medium" style={{ color: ACTION_COLORS[selectedAction.type] }}>
                {ACTION_LABELS[selectedAction.type]}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
