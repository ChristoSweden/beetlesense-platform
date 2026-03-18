import { CheckCircle2, Circle, ArrowRight, Trophy } from 'lucide-react';
import {
  frameForestPlanProgress,
  FOREST_PLAN_STEPS,
  type ForestPlanProgressFrame,
} from '@/services/behavioralFraming';

interface ForestPlanProgressProps {
  /** Steps the user has completed (must match step names from FOREST_PLAN_STEPS) */
  completedSteps?: string[];
  /** Override total steps list */
  totalSteps?: string[];
  /** CTA click handler */
  onContinue?: () => void;
}

export function ForestPlanProgress({
  completedSteps = [
    'Registrera fastighet',
    'Första drönarscan',
    'Trädräkning klar',
    'Hälsobedömning',
    'Riskanalys granbarkborre',
    'Virkesvärdeskattning',
    'Gallringsplan',
  ],
  totalSteps = FOREST_PLAN_STEPS,
  onContinue,
}: ForestPlanProgressProps) {
  const frame: ForestPlanProgressFrame = frameForestPlanProgress(completedSteps, totalSteps);
  const isComplete = frame.percentage === 100;

  return (
    <div
      className="rounded-2xl border p-5"
      style={{
        background: 'var(--bg2, #0a1f0d)',
        borderColor: 'var(--border, #1a3a1f)',
      }}
    >
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text, #e5e7eb)' }}>
            Din skogsplan
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3, #6b7280)' }}>
            {frame.motivator}
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-2xl font-bold font-mono"
            style={{ color: isComplete ? '#22c55e' : '#f59e0b' }}
          >
            {frame.percentage}%
          </p>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text3, #6b7280)' }}>
            klar
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full mb-5 overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${frame.percentage}%`,
            background: isComplete
              ? 'linear-gradient(90deg, #16a34a, #22c55e)'
              : 'linear-gradient(90deg, #f59e0b, #eab308)',
          }}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-1.5 mb-5">
        {totalSteps.map((step) => {
          const done = completedSteps.includes(step);
          const isNext = step === frame.nextAction && !isComplete;

          return (
            <div
              key={step}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors"
              style={{
                background: isNext ? 'rgba(34, 197, 94, 0.08)' : 'transparent',
                border: isNext ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent',
              }}
            >
              {done ? (
                <CheckCircle2
                  size={16}
                  style={{ color: '#22c55e' }}
                  className="shrink-0"
                />
              ) : (
                <Circle
                  size={16}
                  style={{ color: isNext ? '#f59e0b' : 'var(--text3, #4b5563)' }}
                  className="shrink-0"
                />
              )}
              <span
                className="text-sm"
                style={{
                  color: done
                    ? 'var(--text2, #a1a1aa)'
                    : isNext
                      ? '#22c55e'
                      : 'var(--text3, #6b7280)',
                  textDecoration: done ? 'line-through' : 'none',
                  fontWeight: isNext ? 600 : 400,
                }}
              >
                {step}
              </span>
              {isNext && (
                <span
                  className="ml-auto text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: '#16a34a', color: '#fff' }}
                >
                  Nästa
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      {!isComplete ? (
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#fff',
          }}
        >
          Slutför din skogsplan
          <ArrowRight size={16} />
        </button>
      ) : (
        <div
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}
        >
          <Trophy size={16} />
          Skogsplan komplett
        </div>
      )}
    </div>
  );
}
export default ForestPlanProgress;
