import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import type { AnalysisResult, ConfidenceLevel, RiskLevel } from '@/services/advisorService';

interface AnalysisPanelProps {
  analysis: AnalysisResult;
}

const CONFIDENCE_COLORS: Record<ConfidenceLevel, string> = {
  high: 'var(--green)',
  medium: 'var(--amber)',
  low: 'var(--red, #ef4444)',
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4ade80',
  moderate: '#fbbf24',
  high: '#f97316',
  very_high: '#ef4444',
};

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

export function AnalysisPanel({ analysis }: AnalysisPanelProps) {
  const { t } = useTranslation();
  const [expandedStandData, setExpandedStandData] = useState(false);

  return (
    <div className="space-y-6">
      {/* Confidence indicator */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider"
          style={{
            background: `${CONFIDENCE_COLORS[analysis.confidence]}15`,
            color: CONFIDENCE_COLORS[analysis.confidence],
          }}
        >
          <ShieldCheck size={12} />
          {t(`advisor.confidence.${analysis.confidence}`)}
        </div>
        <span className="text-[10px] text-[var(--text3)]">
          {t('advisor.confidenceBasedOn', { count: analysis.citations.length })}
        </span>
      </div>

      {/* Situation Assessment */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-xs font-semibold text-[var(--text)] mb-2 uppercase tracking-wider">
          {t('advisor.situationAssessment')}
        </h3>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          {analysis.situationAssessment}
        </p>
      </div>

      {/* Options */}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">
          {t('advisor.options')} ({analysis.options.length})
        </h3>
        <div className="space-y-3">
          {analysis.options.map((option) => (
            <div
              key={option.id}
              className={`
                rounded-xl border p-4 transition-all
                ${
                  option.recommended
                    ? 'border-[var(--green)] bg-[var(--green)]/5'
                    : 'border-[var(--border)]'
                }
              `}
              style={option.recommended ? undefined : { background: 'var(--bg2)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {option.recommended && (
                    <CheckCircle2 size={16} className="text-[var(--green)]" />
                  )}
                  <h4
                    className={`text-sm font-semibold ${
                      option.recommended ? 'text-[var(--green)]' : 'text-[var(--text)]'
                    }`}
                  >
                    {t(option.titleKey)}
                  </h4>
                  {option.recommended && (
                    <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)]">
                      {t('advisor.recommended')}
                    </span>
                  )}
                </div>
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono"
                  style={{
                    background: `${RISK_COLORS[option.riskLevel]}15`,
                    color: RISK_COLORS[option.riskLevel],
                  }}
                >
                  {t(`advisor.risk.${option.riskLevel}`)}
                </div>
              </div>

              <p className="text-xs text-[var(--text2)] mb-3 leading-relaxed">
                {option.description}
              </p>

              {/* Key metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="px-2 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <p className="text-[9px] text-[var(--text3)] uppercase">{t('advisor.npv')}</p>
                  <p className="text-xs font-mono font-semibold text-[var(--text)]">
                    {formatSEK(option.npv)}
                  </p>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <p className="text-[9px] text-[var(--text3)] uppercase">{t('advisor.initialCost')}</p>
                  <p className="text-xs font-mono font-semibold text-[var(--text)]">
                    {formatSEK(option.initialCost)}
                  </p>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <p className="text-[9px] text-[var(--text3)] uppercase">{t('advisor.irr')}</p>
                  <p className="text-xs font-mono font-semibold text-[var(--text)]">
                    {option.irr > 0 ? `${option.irr}%` : '-'}
                  </p>
                </div>
                <div className="px-2 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <p className="text-[9px] text-[var(--text3)] uppercase">{t('advisor.timeframe')}</p>
                  <p className="text-[10px] font-medium text-[var(--text)]">
                    {option.timeframe}
                  </p>
                </div>
              </div>

              {/* Pros & Cons */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--green)] mb-1 uppercase">
                    {t('advisor.pros')}
                  </p>
                  <ul className="space-y-0.5">
                    {option.pros.map((pro, i) => (
                      <li key={i} className="text-[10px] text-[var(--text2)] flex items-start gap-1">
                        <span className="text-[var(--green)] mt-0.5 flex-shrink-0">+</span>
                        {pro}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--amber)] mb-1 uppercase">
                    {t('advisor.cons')}
                  </p>
                  <ul className="space-y-0.5">
                    {option.cons.map((con, i) => (
                      <li key={i} className="text-[10px] text-[var(--text2)] flex items-start gap-1">
                        <span className="text-[var(--amber)] mt-0.5 flex-shrink-0">-</span>
                        {con}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-xl border border-[var(--green)]/30 p-4 bg-[var(--green)]/5">
        <h3 className="text-xs font-semibold text-[var(--green)] mb-2 uppercase tracking-wider flex items-center gap-2">
          <CheckCircle2 size={14} />
          {t('advisor.recommendation')}
        </h3>
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          {analysis.recommendation}
        </p>
      </div>

      {/* Risk Factors */}
      {analysis.riskFactors.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle size={14} className="text-[var(--amber)]" />
            {t('advisor.riskFactors')}
          </h3>
          <div className="space-y-2">
            {analysis.riskFactors.map((risk, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border border-[var(--border)]"
                style={{ background: 'var(--bg2)' }}
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: RISK_COLORS[risk.level] }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-[var(--text)]">{risk.name}</p>
                    <span
                      className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${RISK_COLORS[risk.level]}15`,
                        color: RISK_COLORS[risk.level],
                      }}
                    >
                      {t(`advisor.risk.${risk.level}`)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5 leading-relaxed">
                    {risk.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stand Data Used */}
      <div>
        <button
          onClick={() => setExpandedStandData(!expandedStandData)}
          className="flex items-center gap-1.5 text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
          aria-expanded={expandedStandData}
        >
          <Info size={12} />
          {t('advisor.basedOnStandData')}
          {expandedStandData ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {expandedStandData && (
          <div className="mt-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg2)]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(analysis.standDataUsed).map(([key, val]) => (
                <div key={key}>
                  <p className="text-[9px] text-[var(--text3)] uppercase">{key}</p>
                  <p className="text-xs font-mono text-[var(--text)]">{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
