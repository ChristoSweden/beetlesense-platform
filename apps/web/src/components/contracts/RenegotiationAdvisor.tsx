/**
 * RenegotiationAdvisor — When/how to renegotiate contracts, checklist, letter template.
 */

import { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Circle,
  Copy,
  Check,
  FileText,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { RenegotiationWindow } from '@/hooks/useContractAnalysis';
import { formatSEK } from '@/hooks/useContractAnalysis';

interface Props {
  windows: RenegotiationWindow[];
}

const CONDITION_STYLES = {
  favorable: { color: '#4ade80', bg: '#4ade8015', icon: TrendingUp },
  neutral: { color: '#fbbf24', bg: '#fbbf2415', icon: AlertTriangle },
  unfavorable: { color: '#f87171', bg: '#f8717115', icon: AlertTriangle },
};

export function RenegotiationAdvisor({ windows }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(windows[0]?.contractId ?? null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string, contractId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(contractId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="space-y-4">
      {windows.map((w) => {
        const isExpanded = expandedId === w.contractId;
        const style = CONDITION_STYLES[w.marketCondition];
        const ConditionIcon = style.icon;

        return (
          <div
            key={w.contractId}
            className="rounded-xl border border-[var(--border)] overflow-hidden"
            style={{ background: 'var(--bg2)' }}
          >
            {/* Header — always visible */}
            <button
              className="w-full p-4 text-left hover:bg-[var(--bg3)]/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : w.contractId)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg3)] flex items-center justify-center">
                    <FileText size={18} className="text-[var(--text2)]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">{w.buyer}</h4>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-mono text-[var(--text3)] flex items-center gap-1">
                        <Calendar size={10} />
                        {w.daysUntilExpiry} dagar kvar
                      </span>
                      <span
                        className="text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: style.bg, color: style.color }}
                      >
                        <ConditionIcon size={10} className="inline mr-1" />
                        {w.marketConditionSv}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text3)]">Potentiell besparing/år</p>
                  <p className="text-sm font-mono font-bold text-[var(--green)]">
                    {formatSEK(w.estimatedSavings)}
                  </p>
                </div>
              </div>
            </button>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-[var(--border)] p-4 space-y-5">
                {/* Market conditions */}
                <div
                  className="rounded-lg p-3 border"
                  style={{ background: style.bg, borderColor: `${style.color}30` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <ConditionIcon size={14} style={{ color: style.color }} />
                    <span className="text-xs font-semibold" style={{ color: style.color }}>
                      Marknadsläge
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                    {w.marketCondition === 'favorable'
                      ? 'Spotmarknadspriserna ligger betydligt över dina avtalsvillkor. Det är ett starkt läge att förhandla om bättre priser eller avsluta avtalet för att sälja oberoende.'
                      : w.marketCondition === 'neutral'
                      ? 'Priserna ligger något över avtalsnivåerna. Överväg omförhandling av specifika sortiment där skillnaden är störst.'
                      : 'Marknadspriserna ligger nära dina avtalsvillkor. Avvakta med omförhandling tills priserna stiger.'}
                  </p>
                </div>

                {/* Checklist */}
                <div>
                  <h5 className="text-xs font-semibold text-[var(--text)] mb-3">
                    Förhandlingschecklista
                  </h5>
                  <div className="space-y-2">
                    {w.checklist.map((item, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        {item.done ? (
                          <CheckCircle size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
                        ) : (
                          <Circle size={14} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
                        )}
                        <span
                          className={`text-[11px] ${
                            item.done ? 'text-[var(--text2)]' : 'text-[var(--text3)]'
                          }`}
                        >
                          {item.item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Template letter */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-xs font-semibold text-[var(--text)]">
                      Brevmall — Omförhandling
                    </h5>
                    <button
                      onClick={() => handleCopy(w.templateLetter, w.contractId)}
                      className="flex items-center gap-1 text-[10px] font-medium text-[var(--green)] hover:text-[var(--green)]/80 transition-colors"
                    >
                      {copiedId === w.contractId ? (
                        <>
                          <Check size={12} />
                          Kopierat
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          Kopiera
                        </>
                      )}
                    </button>
                  </div>
                  <div
                    className="rounded-lg border border-[var(--border)] p-4 font-mono text-[11px] text-[var(--text2)] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto"
                    style={{ background: 'var(--bg)' }}
                  >
                    {w.templateLetter}
                  </div>
                </div>

                {/* AI advisor CTA */}
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-[var(--green)]/30 text-sm font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
                >
                  <Sparkles size={16} />
                  Boka AI-rådgivning — personlig förhandlingsstrategi
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* General negotiation tips */}
      <div
        className="rounded-xl border border-[var(--border)] p-4"
        style={{ background: 'var(--bg2)' }}
      >
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <MessageSquare size={14} className="text-[var(--green)]" />
          Förhandlingstips
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              title: 'Timing',
              desc: 'Kontakta köparen 3–6 månader före avtalsförfall. Undvik sista minuten.',
            },
            {
              title: 'Konkurrerande bud',
              desc: 'Begär alltid offerter från minst 2 andra köpare. Transparens ger bättre villkor.',
            },
            {
              title: 'Marknadsdata',
              desc: 'Använd BeetleSense prisanalys som förhandlingsunderlag. Konkreta siffror ger styrka.',
            },
            {
              title: 'Flexibilitet',
              desc: 'Förhandla om kortare bindningstid, volymflexibilitet, och fler prisjusteringstillfällen.',
            },
          ].map((tip) => (
            <div
              key={tip.title}
              className="rounded-lg border border-[var(--border)] p-3"
              style={{ background: 'var(--bg)' }}
            >
              <p className="text-[11px] font-semibold text-[var(--text)] mb-1">{tip.title}</p>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
