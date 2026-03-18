import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Route, ChevronRight, TreePine, DollarSign, Truck, MapPin, Calendar } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

interface HarvestPlan {
  id: string;
  name: string;
  area_hectares: number;
  volume_m3: number;
  estimated_value_sek: number;
  progress_pct: number;
  trucks_booked: number;
  road_condition: string;
  estimated_delivery: string;
  status: string;
}

const DEMO_HARVEST_PLAN: HarvestPlan = {
  id: 'hp-demo-1',
  name: 'Norra Gran (avd. 12)',
  area_hectares: 85,
  volume_m3: 4500,
  estimated_value_sek: 1800000,
  progress_pct: 62,
  trucks_booked: 3,
  road_condition: 'God bärighet',
  estimated_delivery: '2026-04-05',
  status: 'active',
};

export function LogisticsWidget() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<HarvestPlan | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchActivePlan() {
      // Try Supabase first
      if (isSupabaseConfigured && !isDemo()) {
        try {
          const { data, error } = await supabase
            .from('harvest_plans')
            .select('id, name, area_hectares, volume_m3, estimated_value_sek, progress_pct, trucks_booked, road_condition, estimated_delivery, status')
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!cancelled && !error && data) {
            setPlan(data as HarvestPlan);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to demo data
        }
      }

      // Demo fallback
      if (!cancelled) {
        setPlan(DEMO_HARVEST_PLAN);
        setLoading(false);
      }
    }

    fetchActivePlan();
    return () => { cancelled = true; };
  }, []);

  const hasActivePlan = plan !== null && plan.status === 'active';

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Route size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('logistics.widget.title')}
          </h3>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-2/3 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg3)]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Route size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('logistics.widget.title')}
          </h3>
        </div>
      </div>

      {hasActivePlan && plan ? (
        <div className="p-3 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <TreePine size={12} className="text-[var(--green)]" />
              <span className="text-xs font-medium text-[var(--text)]">
                {plan.name}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
              {t('logistics.widget.active')}
            </span>
          </div>

          {/* Area / volume / value */}
          <div className="flex items-center gap-3 text-[11px] text-[var(--text3)] mb-2">
            <span>{plan.area_hectares} ha</span>
            <span>~{plan.volume_m3.toLocaleString()} m{'\u00B3'}</span>
            <div className="flex items-center gap-1">
              <DollarSign size={10} />
              <span>~{(plan.estimated_value_sek / 1_000_000).toFixed(1)}M kr</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] text-[var(--text3)] mb-1">
              <span>{t('logistics.widget.progress')}</span>
              <span className="font-mono text-[var(--text2)]">{plan.progress_pct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--green)] transition-all"
                style={{ width: `${plan.progress_pct}%` }}
              />
            </div>
          </div>

          {/* Details row */}
          <div className="grid grid-cols-3 gap-2 text-[10px] text-[var(--text3)]">
            <div className="flex items-center gap-1">
              <Truck size={10} className="text-[var(--text3)]" />
              <span>{plan.trucks_booked} {t('logistics.widget.vehicles')}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin size={10} className="text-[var(--text3)]" />
              <span>{plan.road_condition}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={10} className="text-[var(--text3)]" />
              <span>{new Date(plan.estimated_delivery).toLocaleDateString('sv-SE')}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
          <TreePine size={14} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text3)]">
            {t('logistics.widget.noActivePlan')}
          </span>
        </div>
      )}

      <Link
        to="/owner/harvest-logistics"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {hasActivePlan ? t('logistics.widget.viewPlan') : t('logistics.widget.planHarvest')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}
