import { useTranslation } from 'react-i18next';
import { Clock, MapPin, ChevronRight, ShieldCheck, Eye, AlertCircle } from 'lucide-react';
import type { SavedObservation, VerdictStatus } from '@/services/satelliteValidationService';

interface ObservationHistoryProps {
  observations: SavedObservation[];
  onSelect: (observation: SavedObservation) => void;
}

const VERDICT_STYLES: Record<VerdictStatus, { color: string; icon: React.ReactNode }> = {
  confirmed: { color: '#ef4444', icon: <AlertCircle size={14} /> },
  monitoring: { color: '#f59e0b', icon: <Eye size={14} /> },
  normal: { color: '#4ade80', icon: <ShieldCheck size={14} /> },
};

export function ObservationHistory({ observations, onSelect }: ObservationHistoryProps) {
  const { t } = useTranslation();

  if (observations.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-6 text-center" style={{ background: 'var(--bg2)' }}>
        <Clock size={24} className="text-[var(--text3)] mx-auto mb-2" />
        <p className="text-xs text-[var(--text3)]">
          {t('satelliteCheck.history.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[var(--text3)]" />
          <h4 className="text-sm font-semibold text-[var(--text)]">
            {t('satelliteCheck.history.title')}
          </h4>
          <span className="text-[10px] font-mono text-[var(--text3)] ml-auto">
            {observations.length} {t('satelliteCheck.history.observations')}
          </span>
        </div>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {observations.map((obs) => {
          const vstyle = VERDICT_STYLES[obs.verdict];
          return (
            <button
              key={obs.id}
              onClick={() => onSelect(obs)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg3)] transition-colors"
            >
              {/* Verdict indicator */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${vstyle.color}15`, color: vstyle.color }}
              >
                {vstyle.icon}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--text)] truncate">
                    {t(`satelliteCheck.types.${obs.observationType}`)}
                  </span>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: `${vstyle.color}12`, color: vstyle.color }}
                  >
                    {t(`satelliteCheck.verdicts.${obs.verdict}`)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <MapPin size={10} className="text-[var(--text3)]" />
                  <span className="text-[10px] text-[var(--text3)] truncate">{obs.parcelName}</span>
                  <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                  <span className="text-[10px] text-[var(--text3)]">
                    {new Date(obs.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-mono text-[var(--text2)]">
                    {obs.primaryMetric}: {obs.primaryValue.toFixed(2)}
                  </span>
                  <span
                    className="text-[10px] font-mono font-semibold"
                    style={{ color: obs.changePercent < -10 ? '#ef4444' : obs.changePercent < -5 ? '#f59e0b' : '#4ade80' }}
                  >
                    {obs.changePercent > 0 ? '+' : ''}{obs.changePercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
