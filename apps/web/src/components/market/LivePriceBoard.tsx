/**
 * LivePriceBoard — Real-time timber price comparison across all Swedish buyers.
 *
 * Full-width table with assortments as rows and buyers as columns.
 * Best price highlighted green, worst in subtle red. Region filter,
 * index/SEK toggle, refresh button, and source links.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Filter,
  BarChart3,
} from 'lucide-react';
import {
  useTimberPrices,
  type Region,
  type PriceByBuyer,
} from '@/hooks/useTimberPrices';

// ─── Constants ───

const REGIONS: { value: Region | ''; label: string }[] = [
  { value: '', label: 'Alla regioner' },
  { value: 'Gotaland', label: 'Gotaland' },
  { value: 'Svealand', label: 'Svealand' },
  { value: 'Norrland', label: 'Norrland' },
];

const ASSORTMENT_ORDER = [
  'Talltimmer',
  'Grantimmer',
  'Massaved tall',
  'Massaved gran',
  'Bjorkmassa',
];

const ASSORTMENT_LABELS: Record<string, { sv: string; en: string; icon: string }> = {
  'Talltimmer': { sv: 'Talltimmer', en: 'Pine sawlog', icon: '🌲' },
  'Grantimmer': { sv: 'Grantimmer', en: 'Spruce sawlog', icon: '🌲' },
  'Massaved tall': { sv: 'Massaved tall', en: 'Pine pulpwood', icon: '📦' },
  'Massaved gran': { sv: 'Massaved gran', en: 'Spruce pulpwood', icon: '📦' },
  'Bjorkmassa': { sv: 'Bjorkmassa', en: 'Birch pulpwood', icon: '🌳' },
};

// ─── Component ───

export default function LivePriceBoard() {
  const { t: _t, i18n } = useTranslation();
  const [regionFilter, setRegionFilter] = useState<Region | ''>('');
  const [showAsIndex, setShowAsIndex] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    byAssortment,
    byBuyer,
    bestPrices,
    lastUpdated,
    isLoading,
    error,
    isDemo,
    refresh,
  } = useTimberPrices(regionFilter || undefined);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  // Compute averages per assortment for index mode
  const assortmentAverages = useMemo(() => {
    const avgs: Record<string, number> = {};
    for (const a of byAssortment) {
      avgs[a.assortment] = a.average || 1;
    }
    return avgs;
  }, [byAssortment]);

  // Sort buyers by name
  const sortedBuyers = useMemo(
    () => [...byBuyer].sort((a, b) => a.buyer.localeCompare(b.buyer)),
    [byBuyer]
  );

  // Compute per-assortment best and worst across current buyers
  const assortmentExtremes = useMemo(() => {
    const extremes: Record<string, { best: number; worst: number }> = {};
    for (const assortment of ASSORTMENT_ORDER) {
      const prices = sortedBuyers
        .map((b) => b.assortments[assortment])
        .filter((p) => p != null && p > 0);
      if (prices.length > 0) {
        extremes[assortment] = {
          best: Math.max(...prices),
          worst: Math.min(...prices),
        };
      }
    }
    return extremes;
  }, [sortedBuyers]);

  const formatPrice = (price: number | undefined, assortment: string) => {
    if (price == null || price === 0) return '-';
    if (showAsIndex) {
      const avg = assortmentAverages[assortment];
      if (!avg) return '-';
      return Math.round((price / avg) * 100).toString();
    }
    return price.toLocaleString('sv-SE');
  };

  const getCellStyle = (price: number | undefined, assortment: string) => {
    if (price == null || price === 0) return '';
    const ext = assortmentExtremes[assortment];
    if (!ext) return '';
    if (price === ext.best && ext.best !== ext.worst) return 'bg-emerald-900/40 text-emerald-300 font-semibold';
    if (price === ext.worst && ext.best !== ext.worst) return 'bg-red-900/20 text-red-300/80';
    return '';
  };

  const getTrendIcon = (buyer: PriceByBuyer, assortment: string) => {
    // Simulated trend based on price position relative to average
    const price = buyer.assortments[assortment];
    const avg = assortmentAverages[assortment];
    if (!price || !avg) return <Minus className="w-3 h-3 text-zinc-500 inline" />;
    const ratio = price / avg;
    if (ratio > 1.02) return <TrendingUp className="w-3 h-3 text-emerald-400 inline" />;
    if (ratio < 0.98) return <TrendingDown className="w-3 h-3 text-red-400 inline" />;
    return <Minus className="w-3 h-3 text-zinc-500 inline" />;
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '-';
    try {
      const date = new Date(ts);
      return date.toLocaleDateString('sv-SE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#0a1f0d] border border-emerald-900/30 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin" />
          <span className="text-emerald-200/70 text-sm">Hamtar virkespriser...</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-emerald-900/20 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0a1f0d] border border-emerald-900/30 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-emerald-900/30 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-emerald-100 font-semibold text-lg">Virkespriser</h2>
          {isDemo && (
            <span className="text-[10px] uppercase tracking-wider bg-amber-900/40 text-amber-300 px-2 py-0.5 rounded-full">
              Demo
            </span>
          )}
          {error && (
            <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Uppskattade
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Region filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-emerald-500" />
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as Region | '')}
              className="bg-[#061208] border border-emerald-900/40 rounded px-2 py-1 text-xs text-emerald-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {REGIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Index toggle */}
          <button
            onClick={() => setShowAsIndex(!showAsIndex)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${
              showAsIndex
                ? 'bg-emerald-800/40 border-emerald-600 text-emerald-200'
                : 'bg-transparent border-emerald-900/40 text-emerald-400/70 hover:border-emerald-700'
            }`}
            title={showAsIndex ? 'Visa SEK/m3fub' : 'Visa som index (100 = snitt)'}
          >
            {showAsIndex ? 'Index' : 'SEK/m3fub'}
          </button>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-emerald-900/40 text-emerald-400/70 hover:border-emerald-700 hover:text-emerald-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Uppdatera
          </button>
        </div>
      </div>

      {/* Price Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-emerald-900/30">
              <th className="text-left px-3 py-2.5 text-emerald-400/70 text-xs font-medium uppercase tracking-wider sticky left-0 bg-[#0a1f0d] z-10 min-w-[140px]">
                Sortiment
              </th>
              {sortedBuyers.map((buyer) => (
                <th
                  key={buyer.buyer}
                  className="text-center px-2 py-2.5 text-emerald-400/70 text-xs font-medium uppercase tracking-wider min-w-[90px]"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{buyer.buyer}</span>
                    <span className="text-[9px] text-emerald-600 normal-case tracking-normal font-normal">
                      {buyer.region}
                    </span>
                  </div>
                </th>
              ))}
              <th className="text-center px-2 py-2.5 text-emerald-400/70 text-xs font-medium uppercase tracking-wider min-w-[80px]">
                Snitt
              </th>
              <th className="text-center px-2 py-2.5 text-emerald-400/70 text-xs font-medium uppercase tracking-wider min-w-[90px]">
                Spann
              </th>
            </tr>
          </thead>
          <tbody>
            {ASSORTMENT_ORDER.map((assortment, rowIdx) => {
              const assortmentData = byAssortment.find((a) => a.assortment === assortment);
              const label = ASSORTMENT_LABELS[assortment];

              return (
                <tr
                  key={assortment}
                  className={`border-b border-emerald-900/20 hover:bg-emerald-900/10 transition-colors ${
                    rowIdx % 2 === 0 ? '' : 'bg-emerald-950/20'
                  }`}
                >
                  {/* Assortment name */}
                  <td className="px-3 py-2.5 text-emerald-100 font-medium sticky left-0 bg-inherit z-10">
                    <div className="flex flex-col">
                      <span>{i18n.language === 'sv' ? label?.sv : label?.en}</span>
                      {showAsIndex && (
                        <span className="text-[10px] text-emerald-500/60">100 = snitt</span>
                      )}
                    </div>
                  </td>

                  {/* Buyer prices */}
                  {sortedBuyers.map((buyer) => {
                    const price = buyer.assortments[assortment];
                    const cellStyle = getCellStyle(price, assortment);
                    const isBuyer = buyer.is_estimated;

                    return (
                      <td
                        key={buyer.buyer}
                        className={`text-center px-2 py-2.5 tabular-nums ${cellStyle || 'text-emerald-200'}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span className={isBuyer ? 'opacity-70' : ''}>
                            {formatPrice(price, assortment)}
                          </span>
                          {price != null && price > 0 && getTrendIcon(buyer, assortment)}
                        </div>
                        {isBuyer && price != null && price > 0 && (
                          <span className="text-[8px] text-amber-500/60 block">~uppsk.</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Average */}
                  <td className="text-center px-2 py-2.5 text-emerald-300/80 font-medium tabular-nums">
                    {assortmentData ? (
                      showAsIndex ? '100' : assortmentData.average.toLocaleString('sv-SE')
                    ) : '-'}
                  </td>

                  {/* Range */}
                  <td className="text-center px-2 py-2.5 text-emerald-400/60 text-xs tabular-nums">
                    {assortmentData && assortmentData.range[0] > 0 ? (
                      <>
                        {showAsIndex
                          ? `${Math.round((assortmentData.range[0] / assortmentData.average) * 100)}-${Math.round((assortmentData.range[1] / assortmentData.average) * 100)}`
                          : `${assortmentData.range[0]}-${assortmentData.range[1]}`
                        }
                      </>
                    ) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with source links and timestamps */}
      <div className="px-4 py-3 border-t border-emerald-900/30 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-[10px] text-emerald-500/60">
          <span>Kallor:</span>
          {sortedBuyers.map((buyer, i) => (
            <span key={buyer.buyer}>
              {buyer.source_url ? (
                <a
                  href={buyer.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400/60 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                >
                  {buyer.buyer}
                </a>
              ) : (
                <span>{buyer.buyer}</span>
              )}
              {i < sortedBuyers.length - 1 && <span className="text-emerald-700 mx-0.5">{' | '}</span>}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 text-[10px] text-emerald-500/60">
          {lastUpdated && (
            <span>Senast uppdaterad: {formatTimestamp(lastUpdated)}</span>
          )}
          {showAsIndex && (
            <span className="text-emerald-600">(Index: 100 = genomsnittspris)</span>
          )}
        </div>
      </div>

      {/* Best price summary bar */}
      <div className="px-4 py-2.5 bg-emerald-950/40 border-t border-emerald-900/20">
        <div className="flex items-center gap-2 mb-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-emerald-300 font-medium">Basta pris per sortiment</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {ASSORTMENT_ORDER.map((assortment) => {
            const best = bestPrices[assortment];
            if (!best || best.price === 0) return null;
            return (
              <div
                key={assortment}
                className="flex items-center gap-1.5 text-xs bg-emerald-900/20 rounded px-2 py-1"
              >
                <span className="text-emerald-400/70">{ASSORTMENT_LABELS[assortment]?.sv}:</span>
                <span className="text-emerald-200 font-semibold tabular-nums">
                  {best.price.toLocaleString('sv-SE')} kr
                </span>
                <span className="text-emerald-500/60">({best.buyer})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
