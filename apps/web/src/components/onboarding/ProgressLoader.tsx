import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, TreePine, Satellite, Trees, ShieldAlert } from 'lucide-react';
import type { LoadingStep } from '@/services/fastighetsLookup';

interface ProgressLoaderProps {
  completedSteps: LoadingStep[];
  error?: string | null;
}

interface StepConfig {
  id: LoadingStep;
  labelKey: string;
  icon: typeof TreePine;
}

const STEPS: StepConfig[] = [
  { id: 'boundaries', labelKey: 'onboarding.loadingBoundaries', icon: TreePine },
  { id: 'satellite', labelKey: 'onboarding.fetchingSatellite', icon: Satellite },
  { id: 'species', labelKey: 'onboarding.analyzingSpecies', icon: Trees },
  { id: 'risk', labelKey: 'onboarding.calculatingRisk', icon: ShieldAlert },
];

export function ProgressLoader({ completedSteps, error }: ProgressLoaderProps) {
  const { t } = useTranslation();
  const [visibleSteps, setVisibleSteps] = useState(0);

  // Stagger the appearance of steps
  useEffect(() => {
    if (visibleSteps < STEPS.length) {
      const timer = setTimeout(() => setVisibleSteps((v) => v + 1), 300);
      return () => clearTimeout(timer);
    }
  }, [visibleSteps]);

  const completedCount = completedSteps.length;
  const progress = (completedCount / STEPS.length) * 100;

  return (
    <div className="flex flex-col items-center">
      {/* Title */}
      <div className="mb-8 text-center">
        <h2 className="text-xl font-serif font-bold text-[var(--text)] mb-2">
          {t('onboarding.findingForest')}
        </h2>
        <p className="text-sm text-[var(--text3)]">
          {t('onboarding.pleaseWait', { defaultValue: 'This takes about 5 seconds...' })}
        </p>
      </div>

      {/* Animated tree spinner */}
      <div className="relative mb-8">
        <div className="w-20 h-20 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <TreePine size={28} className="text-[var(--green)] animate-pulse" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs mb-8">
        <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--green)] transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-[var(--text3)] text-center mt-2 font-mono">
          {completedCount}/{STEPS.length}
        </p>
      </div>

      {/* Step list */}
      <div className="w-full max-w-sm space-y-3">
        {STEPS.map((step, index) => {
          const isVisible = index < visibleSteps;
          const isCompleted = completedSteps.includes(step.id);
          const isActive =
            !isCompleted &&
            index === completedCount &&
            completedCount < STEPS.length;

          return (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-500 ${
                !isVisible
                  ? 'opacity-0 translate-y-2'
                  : isCompleted
                    ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
                    : isActive
                      ? 'border-[var(--border2)] bg-[var(--bg3)]'
                      : 'border-[var(--border)] bg-[var(--bg2)]'
              }`}
            >
              {/* Icon */}
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                  isCompleted
                    ? 'bg-[var(--green)]/15 text-[var(--green)]'
                    : isActive
                      ? 'bg-[var(--bg)] text-[var(--text2)]'
                      : 'bg-[var(--bg)] text-[var(--text3)]'
                }`}
              >
                {isCompleted ? (
                  <Check size={16} className="animate-in fade-in" />
                ) : isActive ? (
                  <step.icon size={16} className="animate-pulse" />
                ) : (
                  <step.icon size={16} />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm transition-colors duration-300 ${
                  isCompleted
                    ? 'text-[var(--green)] font-medium'
                    : isActive
                      ? 'text-[var(--text)]'
                      : 'text-[var(--text3)]'
                }`}
              >
                {t(step.labelKey)}
              </span>

              {/* Checkmark */}
              {isCompleted && (
                <div className="ml-auto">
                  <Check size={16} className="text-[var(--green)]" />
                </div>
              )}

              {/* Spinner for active step */}
              {isActive && (
                <div className="ml-auto">
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 w-full max-w-sm px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400 text-center">
          {error}
        </div>
      )}
    </div>
  );
}
