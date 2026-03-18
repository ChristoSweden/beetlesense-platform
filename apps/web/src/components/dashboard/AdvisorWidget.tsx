import { useTranslation } from 'react-i18next';
import { BrainCircuit, ChevronRight, TreePine, Bug, Axe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDecisionLog } from '@/services/advisorService';

export function AdvisorWidget() {
  const { t } = useTranslation();
  const decisions = getDecisionLog();
  const lastDecision = decisions[0] ?? null;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--green)' }}
          >
            <BrainCircuit size={18} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">
              {t('advisor.widgetTitle')}
            </h3>
            <p className="text-[10px] text-[var(--text3)]">
              {t('advisor.widgetSubtitle')}
            </p>
          </div>
        </div>

        {/* Last decision summary */}
        {lastDecision && (
          <div className="mt-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">
              {t('advisor.lastDecision')}
            </p>
            <p className="text-[11px] text-[var(--text)] font-medium">
              {lastDecision.standName}: {t(`advisor.decisions.${lastDecision.decisionType}`, lastDecision.question)}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {new Date(lastDecision.date).toLocaleDateString('sv-SE')}
            </p>
          </div>
        )}

        {/* CTA */}
        <Link
          to="/owner/advisor"
          className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[var(--green)] text-[#030d05] text-xs font-medium hover:brightness-110 transition-all"
        >
          <BrainCircuit size={14} />
          {t('advisor.getAdvice')}
        </Link>
      </div>

      {/* Quick access to common decisions */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <p className="text-[10px] text-[var(--text3)] mb-2 uppercase tracking-wider">
          {t('advisor.quickDecisions')}
        </p>
        <div className="space-y-1">
          <Link
            to="/owner/advisor?decision=thinning"
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg3)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <TreePine size={12} className="text-[var(--green)]" />
              <span className="text-[10px] text-[var(--text)]">{t('advisor.decisions.thinning')}</span>
            </div>
            <ChevronRight size={12} className="text-[var(--text3)]" />
          </Link>
          <Link
            to="/owner/advisor?decision=beetle_damage"
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg3)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Bug size={12} className="text-[var(--amber)]" />
              <span className="text-[10px] text-[var(--text)]">{t('advisor.decisions.beetleDamage')}</span>
            </div>
            <ChevronRight size={12} className="text-[var(--text3)]" />
          </Link>
          <Link
            to="/owner/advisor?decision=final_felling"
            className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg3)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Axe size={12} className="text-[var(--text2)]" />
              <span className="text-[10px] text-[var(--text)]">{t('advisor.decisions.finalFelling')}</span>
            </div>
            <ChevronRight size={12} className="text-[var(--text3)]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
