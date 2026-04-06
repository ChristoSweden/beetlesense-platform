import { useState, useEffect, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import {
  fetchEntries,
  computeSummary,
  type FinancialEntry,
  type FinancialSummary,
} from '@/services/financialService';

function formatSEK(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M kr`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k kr`;
  return `${Math.round(value)} kr`;
}

/** Pure-CSS sparkline showing 6 months of net profit */
function Sparkline({ data }: { data: FinancialSummary['monthlyData'] }) {
  const netValues = data.map((d) => d.income - d.expense);
  const max = Math.max(...netValues.map(Math.abs), 1);

  return (
    <div className="flex items-end gap-1 h-8">
      {netValues.map((v, i) => (
        <div
          key={i}
          className={`w-2 rounded-sm transition-all duration-500 ${v >= 0 ? 'bg-[var(--green)]' : 'bg-red-400'}`}
          style={{
            height: `${(Math.abs(v) / max) * 100}%`,
            minHeight: v !== 0 ? '3px' : '1px',
            opacity: v === 0 ? 0.3 : 1,
          }}
        />
      ))}
    </div>
  );
}

export const ProfitSummaryWidget = memo(function ProfitSummaryWidget() {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchEntries()
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch((err) => console.error('ProfitSummaryWidget fetch error:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => computeSummary(entries), [entries]);

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5 animate-pulse">
        <div className="h-4 w-32 bg-[var(--border2)] rounded mb-3" />
        <div className="h-8 w-40 bg-[var(--border2)] rounded mb-2" />
        <div className="h-3 w-48 bg-[var(--border2)] rounded" />
      </div>
    );
  }

  const netPositive = summary.netProfit >= 0;

  return (
    <div className="rounded-xl border border-[var(--border2)] bg-[var(--bg2)] p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wider">
            Net Profit (YTD)
          </p>
          <p className={`text-2xl font-bold mt-1 ${netPositive ? 'text-[var(--green)]' : 'text-red-500'}`}>
            {netPositive ? '+' : ''}{formatSEK(summary.netProfit)}
          </p>
        </div>
        <Sparkline data={summary.monthlyData} />
      </div>

      {/* Breakdown */}
      <div className="flex items-center gap-4 text-xs mb-3">
        <div className="flex items-center gap-1">
          <TrendingUp size={12} className="text-[var(--green)]" />
          <span className="text-[var(--text2)]">Income:</span>
          <span className="font-semibold text-[var(--green)]">{formatSEK(summary.totalIncome)}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingDown size={12} className="text-red-400" />
          <span className="text-[var(--text2)]">Expenses:</span>
          <span className="font-semibold text-red-500">{formatSEK(summary.totalExpenses)}</span>
        </div>
      </div>

      {/* Link to full page */}
      <Link
        to="/owner/profit-tracker"
        className="flex items-center gap-1 text-xs font-medium text-[var(--green)] hover:underline"
      >
        View details
        <ChevronRight size={14} />
      </Link>
    </div>
  );
});
