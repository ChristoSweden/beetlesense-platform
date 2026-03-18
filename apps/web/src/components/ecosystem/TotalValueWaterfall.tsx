import { useMemo } from 'react';
import type { EcosystemSummary } from '@/hooks/useEcosystemServices';

interface WaterfallBar {
  label: string;
  value: number;
  color: string;
  isTotal?: boolean;
}

interface TotalValueWaterfallProps {
  summary: EcosystemSummary;
}

export function TotalValueWaterfall({ summary }: TotalValueWaterfallProps) {
  const bars = useMemo(() => {
    // Aggregate all services across all parcels
    const serviceMap = new Map<string, { nameSv: string; value: number; color: string }>();

    summary.analyses.forEach(a => {
      a.services.forEach(s => {
        const existing = serviceMap.get(s.id);
        if (existing) {
          existing.value += s.annualValueSEK;
        } else {
          serviceMap.set(s.id, { nameSv: s.nameSv, value: s.annualValueSEK, color: s.color });
        }
      });
    });

    const result: WaterfallBar[] = [
      { label: 'Virke', value: summary.totalTimberValueSEK, color: '#92400e' },
    ];

    // Add each service in order (carbon first, then by value descending)
    const carbon = serviceMap.get('carbon');
    if (carbon) {
      result.push({ label: carbon.nameSv, value: carbon.value, color: carbon.color });
      serviceMap.delete('carbon');
    }

    const sortedServices = Array.from(serviceMap.entries()).sort((a, b) => b[1].value - a[1].value);
    for (const [, svc] of sortedServices) {
      result.push({ label: svc.nameSv, value: svc.value, color: svc.color });
    }

    const totalValue = result.reduce((s, b) => s + b.value, 0);
    result.push({ label: 'Total', value: totalValue, color: '#4ade80', isTotal: true });

    return result;
  }, [summary]);

  const totalValue = bars[bars.length - 1]?.value ?? 0;
  const maxBarValue = totalValue;
  const timberValue = bars[0]?.value ?? 0;
  const timberPct = totalValue > 0 ? Math.round((timberValue / totalValue) * 100) : 0;

  // Running cumulative for waterfall positioning
  const waterfallData = useMemo(() => {
    let cumulative = 0;
    return bars.map((bar) => {
      if (bar.isTotal) {
        return { ...bar, start: 0, end: bar.value };
      }
      const start = cumulative;
      cumulative += bar.value;
      return { ...bar, start, end: cumulative };
    });
  }, [bars]);

  const formatSEK = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return String(n);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
        Total skogsvärde — vattenfallsdiagram
      </h3>
      <p className="text-[10px] text-[var(--text3)] mb-5">
        Alla intäktskällor aggregerade över dina {summary.analyses.length} skiften
      </p>

      {/* Waterfall chart */}
      <div className="space-y-2 mb-5">
        {waterfallData.map((bar, i) => {
          const widthPct = maxBarValue > 0 ? (bar.value / maxBarValue) * 100 : 0;
          const leftPct = maxBarValue > 0 ? (bar.start / maxBarValue) * 100 : 0;
          const isTotal = bar.isTotal;

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-28 flex-shrink-0 text-right">
                <span className={`text-xs ${isTotal ? 'font-bold text-[var(--text)]' : 'text-[var(--text2)]'}`}>
                  {isTotal ? '= ' : '+ '}{bar.label}
                </span>
              </div>
              <div className="flex-1 h-7 rounded relative" style={{ background: 'var(--bg)' }}>
                <div
                  className="absolute top-0 h-full rounded transition-all duration-700 ease-out flex items-center"
                  style={{
                    left: isTotal ? '0%' : `${leftPct}%`,
                    width: `${Math.max(widthPct, 1)}%`,
                    background: isTotal
                      ? `linear-gradient(90deg, ${bar.color}30, ${bar.color}60)`
                      : `${bar.color}cc`,
                    borderLeft: isTotal ? `3px solid ${bar.color}` : undefined,
                    borderRight: isTotal ? `3px solid ${bar.color}` : undefined,
                  }}
                >
                  {widthPct > 8 && (
                    <span className="px-2 text-[10px] font-mono font-semibold text-white whitespace-nowrap drop-shadow">
                      {formatSEK(bar.value)}
                    </span>
                  )}
                </div>
                {widthPct <= 8 && (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text3)]"
                    style={{ left: `${leftPct + widthPct + 1}%` }}
                  >
                    {formatSEK(bar.value)}
                  </span>
                )}
              </div>
              <div className="w-20 flex-shrink-0 text-right">
                <span className={`text-xs font-mono ${isTotal ? 'font-bold text-[var(--green)]' : 'text-[var(--text2)]'}`}>
                  {bar.value.toLocaleString('sv-SE')}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Impact statement */}
      <div
        className="rounded-lg p-4 border border-[var(--green)]/20"
        style={{ background: 'var(--green)', color: '#030d05' }}
      >
        <p className="text-sm font-bold mb-1">
          Din skog ar vard {totalValue.toLocaleString('sv-SE')} SEK/ar
        </p>
        <p className="text-xs opacity-80">
          Varav bara {timberPct}% ar virke. Ekosystemtjanster och kollagring star for de resterande{' '}
          {100 - timberPct}% av vardet.
        </p>
      </div>

      {/* Percentage breakdown */}
      <div className="mt-4 flex items-center gap-2">
        {waterfallData.filter(b => !b.isTotal).map((bar, i) => {
          const pct = totalValue > 0 ? Math.round((bar.value / totalValue) * 100) : 0;
          return (
            <div
              key={i}
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: bar.color,
                minWidth: pct > 0 ? '4px' : '0',
              }}
              title={`${bar.label}: ${pct}%`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {waterfallData.filter(b => !b.isTotal).map((bar, i) => {
          const pct = totalValue > 0 ? Math.round((bar.value / totalValue) * 100) : 0;
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: bar.color }} />
              <span className="text-[10px] text-[var(--text3)]">{bar.label} {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
