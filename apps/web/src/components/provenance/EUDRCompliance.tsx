import { useState } from 'react';
import {
  Shield,
  CheckCircle2,
  Circle,
  Download,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import type { TimberBatch, EUDRChecklistItem, DueDiligenceStatement } from '@/hooks/useProvenance';

interface EUDRComplianceProps {
  batch: TimberBatch;
  checklist: EUDRChecklistItem[];
  dueDiligence: DueDiligenceStatement;
}

export function EUDRCompliance({ batch: _batch, checklist, dueDiligence }: EUDRComplianceProps) {
  const [showDDS, setShowDDS] = useState(false);
  const passedCount = checklist.filter((c) => c.passed).length;
  const totalCount = checklist.length;
  const score = Math.round((passedCount / totalCount) * 100);

  return (
    <div className="space-y-4">
      {/* Header / score */}
      <div
        className="rounded-xl border p-4"
        style={{
          borderColor: score === 100 ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)',
          background: score === 100 ? 'rgba(74,222,128,0.03)' : 'rgba(251,191,36,0.03)',
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield size={18} style={{ color: score === 100 ? '#4ade80' : '#fbbf24' }} />
            <h3 className="text-sm font-semibold text-[var(--text)]">EUDR Compliance</h3>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-bold font-mono"
              style={{ color: score === 100 ? '#4ade80' : '#fbbf24' }}
            >
              {score}%
            </span>
            <span className="text-[10px] text-[var(--text3)]">
              ({passedCount}/{totalCount})
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${score}%`,
              background: score === 100 ? '#4ade80' : '#fbbf24',
            }}
          />
        </div>

        {score === 100 && (
          <div className="flex items-center gap-1.5 mt-3">
            <Sparkles size={12} className="text-[#4ade80]" />
            <p className="text-[11px] text-[#4ade80] font-medium">
              BeetleSense hanterar din EUDR-compliance automatiskt
            </p>
          </div>
        )}
      </div>

      {/* Checklist */}
      <div
        className="rounded-xl border border-[var(--border)] overflow-hidden"
        style={{ background: 'var(--bg)' }}
      >
        <div className="px-4 py-3 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <h4 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
            EUDR Kravlista
          </h4>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {checklist.map((item) => (
            <div key={item.id} className="flex items-start gap-3 px-4 py-2.5">
              {item.passed ? (
                <CheckCircle2 size={15} className="text-[#4ade80] flex-shrink-0 mt-0.5" />
              ) : (
                <Circle size={15} className="text-[var(--text3)] flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium ${item.passed ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                  {item.label_sv}
                </p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">{item.source}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Due Diligence Statement */}
      <div
        className="rounded-xl border border-[var(--border)]"
        style={{ background: 'var(--bg)' }}
      >
        <button
          onClick={() => setShowDDS(!showDDS)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[var(--bg2)] transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-[var(--green)]" />
            <span className="text-xs font-semibold text-[var(--text)]">
              Due Diligence-utlåtande
            </span>
          </div>
          {showDDS ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </button>

        {showDDS && (
          <div className="px-4 pb-4 border-t border-[var(--border)]">
            <div className="mt-3 space-y-3">
              {/* Meta */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Operatör</p>
                  <p className="text-xs font-mono text-[var(--text)]">{dueDiligence.operatorName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Datum</p>
                  <p className="text-xs font-mono text-[var(--text)]">{dueDiligence.date}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Risknivå</p>
                  <p className="text-xs font-mono text-[#4ade80] uppercase">{dueDiligence.riskLevel}</p>
                </div>
              </div>

              {/* Country risk */}
              <div className="rounded-lg p-2.5 border border-[#4ade80]/20" style={{ background: 'rgba(74,222,128,0.03)' }}>
                <p className="text-[10px] text-[var(--text3)]">Landrisk</p>
                <p className="text-xs text-[var(--text)]">{dueDiligence.countryRisk}</p>
              </div>

              {/* Statement body */}
              <div
                className="rounded-lg border border-[var(--border)] p-3 max-h-40 overflow-y-auto"
                style={{ background: 'var(--bg2)' }}
              >
                <p className="text-[11px] text-[var(--text2)] leading-relaxed whitespace-pre-wrap">
                  {dueDiligence.summary_sv}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg2)] transition-colors">
                  <Download size={13} />
                  Ladda ner PDF
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg2)] transition-colors">
                  <ExternalLink size={13} />
                  Skicka till myndighet
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
