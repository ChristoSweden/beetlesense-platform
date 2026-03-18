import { useState } from 'react';
import {
  Bug,
  Wind,
  TrendingDown,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import type { ForestPlan } from '@/hooks/useForestPlan';

interface ContingencyPlanProps {
  plan: ForestPlan;
  formatSEK: (v: number) => string;
}

const SCENARIO_ICONS: Record<string, typeof Bug> = {
  bug: Bug,
  wind: Wind,
  'trending-down': TrendingDown,
};

function getProbabilityColor(prob: number): string {
  if (prob >= 30) return '#f97316';
  if (prob >= 20) return '#fbbf24';
  return '#4ade80';
}

export function ContingencyPlan({ plan, formatSEK }: ContingencyPlanProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activatedIds, setActivatedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const activate = (id: string) => {
    setActivatedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {plan.contingencies.map((scenario) => {
        const isExpanded = expandedId === scenario.id;
        const isActivated = activatedIds.has(scenario.id);
        const Icon = SCENARIO_ICONS[scenario.icon] || AlertTriangle;
        const probColor = getProbabilityColor(scenario.probability);

        return (
          <div
            key={scenario.id}
            className={`rounded-xl border overflow-hidden transition-all ${
              isActivated ? 'border-orange-500/40' : 'border-[var(--border)]'
            }`}
            style={{ background: isActivated ? 'rgba(249, 115, 22, 0.03)' : 'var(--bg2)' }}
          >
            {/* Header */}
            <button
              onClick={() => toggle(scenario.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--bg3)]/30 transition-colors"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${probColor}15` }}
              >
                <Icon size={18} style={{ color: probColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text)]">{scenario.name}</h3>
                  {isActivated && (
                    <span className="text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400">
                      Aktiverad
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--text3)] mt-0.5 truncate">{scenario.description.slice(0, 80)}...</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-[9px] text-[var(--text3)] uppercase">Sannolikhet</p>
                  <p className="text-sm font-mono font-bold" style={{ color: probColor }}>{scenario.probability}%</p>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-[var(--border)] p-4 space-y-4">
                {/* Description */}
                <p className="text-xs text-[var(--text2)] leading-relaxed">{scenario.description}</p>

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-[var(--border)] p-2.5" style={{ background: 'var(--bg)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <DollarSign size={11} className="text-red-400" />
                      <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Ekonomisk påverkan</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-red-400">{formatSEK(scenario.financialImpact)}</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] p-2.5" style={{ background: 'var(--bg)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={11} className="text-[#fbbf24]" />
                      <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Återhämtning</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-[#fbbf24]">{scenario.recoveryYears} år</p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] p-2.5" style={{ background: 'var(--bg)' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle size={11} style={{ color: probColor }} />
                      <span className="text-[9px] text-[var(--text3)] uppercase tracking-wider">Utlösning</span>
                    </div>
                    <p className="text-sm font-mono font-bold text-[var(--text)]">År {scenario.triggerYear}</p>
                  </div>
                </div>

                {/* Trigger conditions */}
                <div>
                  <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-2">
                    Utlösande villkor
                  </h4>
                  <div className="space-y-1.5">
                    {scenario.triggerConditions.map((cond, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-[var(--text2)]">
                        <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" style={{ color: probColor }} />
                        {cond}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Immediate actions */}
                <div>
                  <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-2">
                    Omedelbara åtgärder
                  </h4>
                  <div className="space-y-1.5">
                    {scenario.immediateActions.map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-[var(--text2)]">
                        <Zap size={10} className="mt-0.5 flex-shrink-0 text-[#fbbf24]" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revised 5-year plan */}
                <div>
                  <h4 className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider mb-2">
                    Reviderad handlingsplan
                  </h4>
                  <div className="space-y-2">
                    {scenario.revisedActions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--border)]"
                        style={{ background: 'var(--bg)' }}
                      >
                        <span className="text-[11px] font-mono font-semibold text-[var(--text3)] w-10">{action.year}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-[var(--text)]">{action.label}</p>
                          <p className="text-[9px] text-[var(--text3)] mt-0.5 truncate">{action.description}</p>
                        </div>
                        {action.estimatedRevenue !== undefined && (
                          <span
                            className="text-[10px] font-mono font-semibold flex-shrink-0"
                            style={{ color: action.estimatedRevenue >= 0 ? '#4ade80' : '#f97316' }}
                          >
                            {formatSEK(action.estimatedRevenue)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activate button */}
                <button
                  onClick={() => activate(scenario.id)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                    isActivated
                      ? 'border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/15'
                      : 'border-[var(--border)] bg-[var(--bg3)] text-[var(--text)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  {isActivated ? (
                    <>
                      <CheckCircle2 size={14} />
                      Beredskapsplan aktiverad — klicka för att avaktivera
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Aktivera beredskapsplan
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
