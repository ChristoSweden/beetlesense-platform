import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import type { ReactNode } from 'react';
import { type ScenarioId, getScenarioPreview } from '@/services/scenarioEngine';

interface ScenarioCardProps {
  scenarioId: ScenarioId;
  icon: ReactNode;
  titleKey: string;
  descriptionKey: string;
  isActive: boolean;
  onSimulate: (id: ScenarioId) => void;
}

export function ScenarioCard({
  scenarioId,
  icon,
  titleKey,
  descriptionKey,
  isActive,
  onSimulate,
}: ScenarioCardProps) {
  const { t } = useTranslation();
  const preview = getScenarioPreview(scenarioId);

  return (
    <button
      onClick={() => onSimulate(scenarioId)}
      className={`
        w-full text-left rounded-xl border p-4 transition-all duration-200
        ${
          isActive
            ? 'border-[var(--green)] bg-[var(--green)]/5 shadow-[0_0_20px_rgba(74,222,128,0.08)]'
            : 'border-[var(--border)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
        }
      `}
      style={{ background: isActive ? undefined : 'var(--bg2)' }}
      aria-pressed={isActive}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
            ${isActive ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'bg-[var(--bg3)] text-[var(--text3)]'}
          `}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${isActive ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
            {t(titleKey)}
          </h3>
          <p className="text-xs text-[var(--text3)] mt-0.5 line-clamp-2">
            {t(descriptionKey)}
          </p>

          {/* Impact preview */}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {t('scenarios.health')}: <span className={preview.health.includes('\u2191') ? 'text-[#4ade80]' : preview.health.includes('\u2193') ? 'text-[#ef4444]' : 'text-[var(--text3)]'}>{preview.health}</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {t('scenarios.value')}: <span className={preview.value.includes('\u2191') ? 'text-[#4ade80]' : preview.value.includes('\u2193') ? 'text-[#ef4444]' : 'text-[var(--text3)]'}>{preview.value}</span>
            </span>
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {t('scenarios.risk')}: <span className={preview.risk.includes('\u2193') ? 'text-[#4ade80]' : preview.risk.includes('\u2191') ? 'text-[#ef4444]' : 'text-[var(--text3)]'}>{preview.risk}</span>
            </span>
          </div>
        </div>

        {/* Simulate button */}
        <div
          className={`
            w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
            ${isActive ? 'bg-[var(--green)] text-[#030d05]' : 'bg-[var(--bg3)] text-[var(--text3)] group-hover:bg-[var(--border2)]'}
          `}
        >
          <Play size={14} />
        </div>
      </div>
    </button>
  );
}
