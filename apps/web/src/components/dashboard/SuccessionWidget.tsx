import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { HeartHandshake, ChevronRight, Users, Clock } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

interface SuccessionPlan {
  id: string;
  status: 'draft' | 'active' | 'complete';
  heirs_count: number;
  updated_at: string;
}

const DEMO_SUCCESSION_PLAN: SuccessionPlan = {
  id: 'sp-demo-1',
  status: 'active',
  heirs_count: 2,
  updated_at: '2026-03-10T14:30:00Z',
};

export function SuccessionWidget() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<SuccessionPlan | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSuccessionPlan() {
      if (isSupabaseConfigured && !isDemo()) {
        try {
          const { data, error } = await supabase
            .from('succession_plans')
            .select('id, status, heirs_count, updated_at')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!cancelled && !error && data) {
            setPlan(data as SuccessionPlan);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to demo data
        }
      }

      // Demo fallback
      if (!cancelled) {
        setPlan(DEMO_SUCCESSION_PLAN);
        setLoading(false);
      }
    }

    fetchSuccessionPlan();
    return () => { cancelled = true; };
  }, []);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'draft': return t('succession.widget.statusDraft');
      case 'active': return t('succession.widget.statusActive');
      case 'complete': return t('succession.widget.statusComplete');
      default: return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'draft': return '#fbbf24';
      case 'active': return '#4ade80';
      case 'complete': return '#60a5fa';
      default: return 'var(--text3)';
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <HeartHandshake size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--text)]">
            {t('succession.widget.title')}
          </span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-2/3 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg3)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <HeartHandshake size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-xs font-semibold text-[var(--text)]">
            {t('succession.widget.title')}
          </span>
        </div>
      </div>

      {plan ? (
        <>
          {/* Plan details */}
          <div className="p-3 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
            {/* Status badge */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-[var(--text3)]">
                {t('succession.widget.planStatus')}
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: statusColor(plan.status),
                  background: `${statusColor(plan.status)}15`,
                }}
              >
                {statusLabel(plan.status)}
              </span>
            </div>

            {/* Heirs & last updated */}
            <div className="flex items-center gap-4 text-[11px] text-[var(--text3)]">
              <div className="flex items-center gap-1.5">
                <Users size={11} className="text-[var(--green)]" />
                <span>
                  {plan.heirs_count} {t('succession.widget.heirs').toLowerCase()}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={11} />
                <span>
                  {new Date(plan.updated_at).toLocaleDateString('sv-SE')}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/owner/succession"
            className="flex items-center justify-between w-full p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <span className="text-xs font-medium text-[var(--green)]">
              {t('succession.widget.viewPlan')}
            </span>
            <ChevronRight size={14} className="text-[var(--green)]" />
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs text-[var(--text3)] mb-3">
            {t('succession.widget.description')}
          </p>

          <Link
            to="/owner/succession"
            className="flex items-center justify-between w-full p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <span className="text-xs font-medium text-[var(--green)]">
              {t('succession.widget.startPlanning')}
            </span>
            <ChevronRight size={14} className="text-[var(--green)]" />
          </Link>
        </>
      )}
    </div>
  );
}
