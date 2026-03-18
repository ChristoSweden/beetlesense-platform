import { useTranslation } from 'react-i18next';
import {
  TrendingDown,
  TrendingUp,
  Minus,
  ShieldCheck,
  AlertCircle,
  Eye,
  Info,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import type { SatelliteAnalysis, SeverityLevel, VerdictStatus, ConfidenceLevel } from '@/services/satelliteValidationService';
import { SPECTRAL_INDICES } from '@/services/satelliteValidationService';

interface AnalysisResultProps {
  analysis: SatelliteAnalysis;
  onSave: () => void;
}

const VERDICT_CONFIG: Record<VerdictStatus, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  confirmed: {
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    icon: <AlertCircle size={20} />,
    label: 'Confirmed',
  },
  monitoring: {
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    icon: <Eye size={20} />,
    label: 'Monitoring',
  },
  normal: {
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.08)',
    icon: <ShieldCheck size={20} />,
    label: 'Normal',
  },
};

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  none: '#4ade80',
  low: '#86efac',
  moderate: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

const CONFIDENCE_CONFIG: Record<ConfidenceLevel, { color: string; label: string }> = {
  high: { color: '#4ade80', label: 'High' },
  medium: { color: '#f59e0b', label: 'Medium' },
  low: { color: '#ef4444', label: 'Low' },
};

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp size={16} className="text-[#4ade80]" />;
  if (trend === 'down') return <TrendingDown size={16} className="text-[#ef4444]" />;
  return <Minus size={16} className="text-[var(--text3)]" />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AnalysisResult({ analysis, onSave }: AnalysisResultProps) {
  const { t } = useTranslation();
  const verdictCfg = VERDICT_CONFIG[analysis.verdict];
  const confCfg = CONFIDENCE_CONFIG[analysis.confidence];

  return (
    <div className="space-y-4">
      {/* Verdict Banner */}
      <div
        className="rounded-xl border p-4"
        style={{
          background: verdictCfg.bg,
          borderColor: `${verdictCfg.color}30`,
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${verdictCfg.color}15`, color: verdictCfg.color }}
          >
            {verdictCfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-mono font-semibold uppercase px-2 py-0.5 rounded-full"
                style={{ background: `${verdictCfg.color}15`, color: verdictCfg.color }}
              >
                {t(`satelliteCheck.verdicts.${analysis.verdict}`)}
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{ background: `${SEVERITY_COLORS[analysis.severity]}15`, color: SEVERITY_COLORS[analysis.severity] }}
              >
                {t(`satelliteCheck.severity.${analysis.severity}`)}
              </span>
            </div>
            <p className="text-sm text-[var(--text)] leading-relaxed">
              {analysis.verdictText}
            </p>
          </div>
        </div>
      </div>

      {/* Historical Comparison */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">
          {t('satelliteCheck.comparison')}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {/* Baseline */}
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-[10px] font-mono text-[var(--text3)] mb-2">
              {t('satelliteCheck.baseline')} — {formatDate(analysis.baselineTimestamp)}
            </p>
            <div
              className="w-full h-20 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, rgba(74,222,128,0.15) 0%, rgba(74,222,128,0.08) 100%)`,
                border: '1px solid rgba(74,222,128,0.1)',
              }}
            >
              <span className="text-lg font-mono font-bold text-[#4ade80]">
                {analysis.primaryIndex.baseline.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Current */}
          <div className="rounded-lg border border-[var(--border)] p-3">
            <p className="text-[10px] font-mono text-[var(--text3)] mb-2">
              {t('satelliteCheck.current')} — {formatDate(analysis.timestamp)}
            </p>
            <div
              className="w-full h-20 rounded-lg flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${SEVERITY_COLORS[analysis.primaryIndex.severity]}15 0%, ${SEVERITY_COLORS[analysis.primaryIndex.severity]}08 100%)`,
                border: `1px solid ${SEVERITY_COLORS[analysis.primaryIndex.severity]}20`,
              }}
            >
              <span
                className="text-lg font-mono font-bold"
                style={{ color: SEVERITY_COLORS[analysis.primaryIndex.severity] }}
              >
                {analysis.primaryIndex.current.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">
          {t('satelliteCheck.spectralIndices')}
        </h4>
        <div className="space-y-3">
          {analysis.indices.map((idx) => {
            const spec = SPECTRAL_INDICES[idx.indexId];
            const severityColor = SEVERITY_COLORS[idx.severity];
            return (
              <div key={idx.indexId} className="flex items-center gap-3">
                <div className="w-16 flex-shrink-0">
                  <span className="text-xs font-mono font-semibold text-[var(--text)]">
                    {spec?.name ?? idx.indexId}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-bold text-[var(--text)]">
                      {idx.current.toFixed(2)}
                    </span>
                    <TrendIcon trend={idx.trend} />
                    <span
                      className="text-xs font-mono font-semibold"
                      style={{ color: severityColor }}
                    >
                      {idx.changePercent > 0 ? '+' : ''}{idx.changePercent.toFixed(1)}%
                    </span>
                  </div>
                  {/* Mini bar showing value in range */}
                  {spec && (
                    <div className="mt-1 h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(2, Math.min(100, ((idx.current - spec.range[0]) / (spec.range[1] - spec.range[0])) * 100))}%`,
                          background: severityColor,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Info size={14} className="text-[var(--text3)]" />
          <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            {t('satelliteCheck.whatThisMeans')}
          </h4>
        </div>
        <p className="text-xs text-[var(--text2)] leading-relaxed">
          {analysis.explanation}
        </p>
      </div>

      {/* Confidence */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Gauge size={14} className="text-[var(--text3)]" />
          <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            {t('satelliteCheck.dataConfidence')}
          </h4>
          <span
            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ml-auto"
            style={{ background: `${confCfg.color}15`, color: confCfg.color }}
          >
            {confCfg.label}
          </span>
        </div>
        <div className="space-y-2">
          {[
            { label: t('satelliteCheck.confidence.dataQuality'), value: analysis.confidenceFactors.dataQuality },
            { label: t('satelliteCheck.confidence.cloudCover'), value: analysis.confidenceFactors.cloudCover },
            { label: t('satelliteCheck.confidence.temporalGap'), value: analysis.confidenceFactors.temporalGap },
          ].map((factor) => (
            <div key={factor.label} className="flex items-center gap-3">
              <span className="text-[10px] text-[var(--text3)] w-24 flex-shrink-0">{factor.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${factor.value * 100}%`,
                    background: factor.value >= 0.8 ? '#4ade80' : factor.value >= 0.6 ? '#f59e0b' : '#ef4444',
                  }}
                />
              </div>
              <span className="text-[10px] font-mono text-[var(--text2)] w-10 text-right">
                {Math.round(factor.value * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggested Actions */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">
          {t('satelliteCheck.suggestedActions')}
        </h4>
        <div className="space-y-2">
          {analysis.suggestedActions.map((action, i) => (
            <div key={i} className="flex items-start gap-2">
              <ChevronRight size={12} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
              <span className="text-xs text-[var(--text2)] leading-relaxed">{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={onSave}
        className="w-full py-3 px-4 rounded-xl bg-[var(--green)] text-[#030d05] text-sm font-semibold
          hover:bg-[var(--green2)] transition-colors flex items-center justify-center gap-2"
      >
        {t('satelliteCheck.saveObservation')}
      </button>
    </div>
  );
}
