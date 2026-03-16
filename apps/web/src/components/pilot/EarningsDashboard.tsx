import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_JOBS } from '@/lib/demoData';
import { Wallet, TrendingUp, Clock, Loader2 } from 'lucide-react';

// ─── Types ───

interface Earning {
  id: string;
  job_title: string;
  completed_at: string;
  amount_sek: number;
  status: 'pending' | 'paid';
}

interface MonthlyTotal {
  month: string;
  label: string;
  total: number;
}

// ─── Component ───

export function EarningsDashboard() {
  const { profile } = useAuthStore();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // Demo mode — show realistic earnings history
    if (isDemo()) {
      const demoEarnings: Earning[] = [
        { id: 'e1', job_title: 'Health check — Ekbacken', completed_at: '2026-03-12', amount_sek: 1830, status: 'paid' },
        { id: 'e2', job_title: 'Beetle survey — Granudden', completed_at: '2026-03-02', amount_sek: 3190, status: 'paid' },
        { id: 'e3', job_title: 'Full inventory — Norra Skogen', completed_at: '2026-02-20', amount_sek: 4250, status: 'paid' },
        { id: 'e4', job_title: 'Spring assessment — Tallmon', completed_at: '2026-02-10', amount_sek: 6710, status: 'paid' },
        { id: 'e5', job_title: 'Emergency survey — Granudden', completed_at: '2026-01-28', amount_sek: 4500, status: 'paid' },
        { id: 'e6', job_title: 'Boar damage scan — Björklund', completed_at: '2026-01-15', amount_sek: 5500, status: 'paid' },
        { id: 'e7', job_title: 'Winter baseline — Ekbacken', completed_at: '2025-12-18', amount_sek: 2830, status: 'paid' },
        { id: 'e8', job_title: 'Species ID — Tallmon', completed_at: '2025-11-20', amount_sek: 5690, status: 'paid' },
      ];
      setEarnings(demoEarnings);
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from('pilot_earnings')
        .select('*')
        .eq('pilot_id', profile!.id)
        .order('completed_at', { ascending: false });

      if (!error && data) {
        setEarnings(data as Earning[]);
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  const totalAllTime = useMemo(
    () => earnings.reduce((sum, e) => sum + e.amount_sek, 0),
    [earnings],
  );

  const thisMonth = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return earnings
      .filter((e) => e.completed_at.startsWith(monthKey))
      .reduce((sum, e) => sum + e.amount_sek, 0);
  }, [earnings]);

  const pendingPayout = useMemo(
    () => earnings.filter((e) => e.status === 'pending').reduce((sum, e) => sum + e.amount_sek, 0),
    [earnings],
  );

  const monthlyData: MonthlyTotal[] = useMemo(() => {
    const now = new Date();
    const months: MonthlyTotal[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('sv-SE', { month: 'short' });
      const total = earnings
        .filter((e) => e.completed_at.startsWith(key))
        .reduce((sum, e) => sum + e.amount_sek, 0);
      months.push({ month: key, label, total });
    }

    return months;
  }, [earnings]);

  const maxMonthly = Math.max(...monthlyData.map((m) => m.total), 1);

  const fmtSEK = (v: number) =>
    v.toLocaleString('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Summary Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={Wallet}
          label="Total Earned"
          value={fmtSEK(totalAllTime)}
          color="var(--green)"
        />
        <SummaryCard
          icon={TrendingUp}
          label="This Month"
          value={fmtSEK(thisMonth)}
          color="var(--green)"
        />
        <SummaryCard
          icon={Clock}
          label="Pending Payout"
          value={fmtSEK(pendingPayout)}
          color="var(--amber)"
        />
      </div>

      {/* ─── Bar Chart (CSS-only) ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-4">
          Last 6 Months
        </h3>

        <div className="flex items-end gap-2 h-36">
          {monthlyData.map((m) => {
            const pct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] font-mono text-[var(--text3)]">
                  {m.total > 0 ? fmtSEK(m.total) : ''}
                </span>
                <div className="w-full flex justify-center" style={{ height: '100px' }}>
                  <div
                    className="w-full max-w-8 rounded-t-md bg-[var(--green)]/60 hover:bg-[var(--green)]/80 transition-colors relative"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      alignSelf: 'flex-end',
                    }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text3)] capitalize">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Earnings Table ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Earnings History
          </h3>
        </div>

        {earnings.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet size={20} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-xs text-[var(--text3)]">No earnings yet. Complete missions to start earning.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[10px] text-[var(--text3)] uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Job</th>
                  <th className="text-left px-4 py-2 font-medium">Completed</th>
                  <th className="text-right px-4 py-2 font-medium">Amount</th>
                  <th className="text-right px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {earnings.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--bg3)] transition-colors">
                    <td className="px-4 py-3 text-xs text-[var(--text)]">{e.job_title}</td>
                    <td className="px-4 py-3 text-xs text-[var(--text3)] font-mono">
                      {new Date(e.completed_at).toLocaleDateString('sv-SE')}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--text)] text-right font-mono font-medium">
                      {fmtSEK(e.amount_sek)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          e.status === 'paid'
                            ? 'bg-[var(--green)]/10 text-[var(--green)]'
                            : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {e.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Summary Card ───

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <p className="text-xl font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-xs text-[var(--text3)]">{label}</p>
    </div>
  );
}
