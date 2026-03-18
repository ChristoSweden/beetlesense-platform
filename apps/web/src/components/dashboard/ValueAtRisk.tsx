import { useTranslation } from 'react-i18next';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { formatSEK } from '@/services/timberPriceService';
import { VisuallyHidden } from '@/components/a11y/VisuallyHidden';

interface ValueAtRiskProps {
  totalValue: number;
  valueAtRisk: number;
  descriptionKey: 'plotB' | 'general';
  onAskAi?: () => void;
}

/**
 * Shows the potential financial loss from detected threats (beetle damage, etc.)
 * as a red-shaded portion of a total value bar. Links to AI Companion for advice.
 */
export function ValueAtRisk({
  totalValue,
  valueAtRisk,
  descriptionKey,
  onAskAi,
}: ValueAtRiskProps) {
  const { t } = useTranslation();

  if (valueAtRisk <= 0 || totalValue <= 0) return null;

  const riskPercent = Math.min((valueAtRisk / totalValue) * 100, 100);

  return (
    <div className="rounded-lg border border-[var(--red)]/30 p-3 mt-3" style={{ background: 'rgba(239, 68, 68, 0.06)' }}>
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle size={14} className="text-[var(--red)] mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[var(--red)]">
            {t('timberValue.valueAtRisk')}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            {descriptionKey === 'plotB'
              ? t('timberValue.riskDescriptionPlotB')
              : t('timberValue.riskDescriptionGeneral')}
          </p>
        </div>
      </div>

      {/* Value bar with risk shading */}
      <VisuallyHidden>
        {Math.round(riskPercent)}% of total timber value ({formatSEK(valueAtRisk)}) is at risk
      </VisuallyHidden>
      <div className="relative h-5 rounded-full overflow-hidden bg-[var(--bg)]" aria-hidden="true">
        {/* Healthy portion */}
        <div
          className="absolute inset-y-0 left-0 bg-[var(--green)]/30 transition-all duration-500"
          style={{ width: `${100 - riskPercent}%` }}
        />
        {/* At-risk portion */}
        <div
          className="absolute inset-y-0 right-0 bg-[var(--red)]/30 transition-all duration-500"
          style={{ width: `${riskPercent}%` }}
        />
        {/* Divider line */}
        <div
          className="absolute inset-y-0 w-px bg-[var(--red)]"
          style={{ left: `${100 - riskPercent}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs font-mono text-[var(--red)]">
          -{formatSEK(valueAtRisk)}
        </p>
        {onAskAi && (
          <button
            onClick={onAskAi}
            className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
            aria-label="Ask AI about risk mitigation strategies"
          >
            <Sparkles size={10} aria-hidden="true" />
            {t('timberValue.askAiMitigation')}
          </button>
        )}
      </div>
    </div>
  );
}
