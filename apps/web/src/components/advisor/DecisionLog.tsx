import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Trash2,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { SavedDecision } from '@/services/advisorService';

interface DecisionLogProps {
  decisions: SavedDecision[];
  onUpdateOutcome: (id: string, followed: boolean | null, outcome: string | null) => void;
  onRemove: (id: string) => void;
}

export function DecisionLog({ decisions, onUpdateOutcome, onRemove }: DecisionLogProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState('');

  const filtered = decisions.filter(
    (d) =>
      d.standName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.question.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (decisions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--bg3)] flex items-center justify-center mb-3">
          <Clock size={20} className="text-[var(--text3)]" />
        </div>
        <p className="text-sm font-medium text-[var(--text)]">{t('advisor.noDecisions')}</p>
        <p className="text-xs text-[var(--text3)] mt-1">{t('advisor.noDecisionsDesc')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('advisor.searchDecisions')}
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
        />
      </div>

      {/* Decision list */}
      <div className="space-y-2">
        {filtered.map((decision) => {
          const isExpanded = expandedId === decision.id;
          return (
            <div
              key={decision.id}
              className="rounded-xl border border-[var(--border)] overflow-hidden"
              style={{ background: 'var(--bg2)' }}
            >
              {/* Header row */}
              <button
                onClick={() => {
                  setExpandedId(isExpanded ? null : decision.id);
                  setOutcomeText(decision.outcome ?? '');
                }}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--bg3)] transition-colors"
              >
                {/* Status icon */}
                <div className="flex-shrink-0">
                  {decision.followed === true && (
                    <CheckCircle2 size={16} className="text-[var(--green)]" />
                  )}
                  {decision.followed === false && (
                    <XCircle size={16} className="text-[var(--amber)]" />
                  )}
                  {decision.followed === null && (
                    <HelpCircle size={16} className="text-[var(--text3)]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-[var(--text)] truncate">
                      {decision.standName}: {t(`advisor.decisions.${decision.decisionType}`, decision.question)}
                    </p>
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">
                    {new Date(decision.date).toLocaleDateString('sv-SE')} &middot; {t(decision.recommendedOption)}
                  </p>
                </div>

                {/* Expand toggle */}
                {isExpanded ? (
                  <ChevronUp size={14} className="text-[var(--text3)]" />
                ) : (
                  <ChevronDown size={14} className="text-[var(--text3)]" />
                )}
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-[var(--border)] p-3 space-y-3">
                  {/* Outcome tracking */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--text)] mb-2 uppercase">
                      {t('advisor.outcomeTracking')}
                    </p>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-[var(--text3)]">{t('advisor.didYouFollow')}</span>
                      <button
                        onClick={() => onUpdateOutcome(decision.id, true, decision.outcome)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          decision.followed === true
                            ? 'bg-[var(--green)]/15 text-[var(--green)]'
                            : 'bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)]'
                        }`}
                      >
                        {t('common.yes')}
                      </button>
                      <button
                        onClick={() => onUpdateOutcome(decision.id, false, decision.outcome)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          decision.followed === false
                            ? 'bg-[var(--amber)]/15 text-[var(--amber)]'
                            : 'bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)]'
                        }`}
                      >
                        {t('common.no')}
                      </button>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={outcomeText}
                        onChange={(e) => setOutcomeText(e.target.value)}
                        placeholder={t('advisor.outcomeNote')}
                        className="flex-1 px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--bg)] text-[10px] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
                      />
                      <button
                        onClick={() => onUpdateOutcome(decision.id, decision.followed, outcomeText)}
                        className="px-2 py-1.5 rounded bg-[var(--green)]/15 text-[var(--green)] text-[10px] font-medium hover:bg-[var(--green)]/25 transition-colors"
                      >
                        {t('common.save')}
                      </button>
                    </div>

                    {decision.outcome && (
                      <p className="text-[10px] text-[var(--text2)] mt-1.5 italic">
                        {t('advisor.note')}: {decision.outcome}
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => onRemove(decision.id)}
                      className="flex items-center gap-1 text-[10px] text-[var(--text3)] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={10} />
                      {t('common.delete')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && searchQuery && (
        <p className="text-xs text-[var(--text3)] text-center py-4">
          {t('common.noResults')}
        </p>
      )}
    </div>
  );
}
