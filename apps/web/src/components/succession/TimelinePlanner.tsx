import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Play,
} from 'lucide-react';
import { PLANNING_STEPS } from '@/services/successionService';

interface StepState {
  completed: boolean;
  targetDate: string | null;
}

export function TimelinePlanner() {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [steps, setSteps] = useState<Record<string, StepState>>(() =>
    Object.fromEntries(PLANNING_STEPS.map((s) => [s.id, { completed: false, targetDate: null }])),
  );
  const [planningStarted, setPlanningStarted] = useState(false);

  const startPlanning = () => {
    const now = new Date();
    const newSteps: Record<string, StepState> = {};
    let cumulativeMonths = 0;

    for (const step of PLANNING_STEPS) {
      const avgMonths = (step.estimatedMonths[0] + step.estimatedMonths[1]) / 2;
      cumulativeMonths += avgMonths;
      const targetDate = new Date(now);
      targetDate.setMonth(targetDate.getMonth() + Math.round(cumulativeMonths));
      newSteps[step.id] = {
        completed: false,
        targetDate: targetDate.toISOString().split('T')[0],
      };
    }

    setSteps(newSteps);
    setPlanningStarted(true);
  };

  const toggleComplete = (stepId: string) => {
    setSteps((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], completed: !prev[stepId].completed },
    }));
  };

  const completedCount = Object.values(steps).filter((s) => s.completed).length;
  const totalSteps = PLANNING_STEPS.length;

  const totalMonthsRange = useMemo(() => {
    const min = PLANNING_STEPS.reduce((s, p) => s + p.estimatedMonths[0], 0);
    const max = PLANNING_STEPS.reduce((s, p) => s + p.estimatedMonths[1], 0);
    return [min, max];
  }, []);

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">
              {t('succession.timeline.title')}
            </span>
          </div>
          <span className="text-xs text-[var(--text3)]">
            {totalMonthsRange[0]}–{totalMonthsRange[1]} {t('succession.timeline.monthsTotal')}
          </span>
        </div>

        {planningStarted ? (
          <>
            <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
                style={{ width: `${(completedCount / totalSteps) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text3)]">
              {completedCount}/{totalSteps} {t('succession.timeline.stepsComplete')}
            </p>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-[var(--text3)] mb-3">
              {t('succession.timeline.notStarted')}
            </p>
            <button
              onClick={startPlanning}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--green)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Play size={14} />
              {t('succession.timeline.startPlanning')}
            </button>
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-px bg-[var(--border)]" />

        <div className="space-y-1">
          {PLANNING_STEPS.map((step, idx) => {
            const state = steps[step.id];
            const _isLast = idx === PLANNING_STEPS.length - 1;
            const prevCompleted = idx === 0 || steps[PLANNING_STEPS[idx - 1].id]?.completed;

            return (
              <div key={step.id} className="relative pl-10">
                {/* Node */}
                <div className="absolute left-0 top-3">
                  <button
                    onClick={() => planningStarted && toggleComplete(step.id)}
                    disabled={!planningStarted}
                    className="relative z-10"
                  >
                    {state?.completed ? (
                      <CheckCircle2 size={30} className="text-[var(--green)]" />
                    ) : prevCompleted && planningStarted ? (
                      <div className="w-[30px] h-[30px] rounded-full border-2 border-[var(--green)] bg-[var(--bg)] flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[var(--green)] animate-pulse" />
                      </div>
                    ) : (
                      <Circle size={30} className="text-[var(--text3)]" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div
                  className={`rounded-lg border p-4 mb-3 transition-all ${
                    state?.completed
                      ? 'border-[var(--green)]/20 bg-[var(--green)]/5'
                      : 'border-[var(--border)]'
                  }`}
                  style={{ background: state?.completed ? undefined : 'var(--bg2)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono text-[var(--text3)] uppercase">
                          {t('succession.timeline.step')} {step.order}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                          <Clock size={10} />
                          {step.estimatedMonths[0]}–{step.estimatedMonths[1]} {t('succession.timeline.months')}
                        </span>
                      </div>
                      <h4
                        className={`text-sm font-semibold mb-1 ${
                          state?.completed ? 'text-[var(--text3)] line-through' : 'text-[var(--text)]'
                        }`}
                      >
                        {isSv ? step.titleSv : step.titleEn}
                      </h4>
                      <p className="text-xs text-[var(--text2)]">
                        {isSv ? step.descriptionSv : step.descriptionEn}
                      </p>
                    </div>

                    {state?.targetDate && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-[var(--text3)]">
                          {t('succession.timeline.target')}
                        </p>
                        <p className="text-xs font-mono text-[var(--text2)]">
                          {new Date(state.targetDate).toLocaleDateString(isSv ? 'sv-SE' : 'en-SE', {
                            year: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
