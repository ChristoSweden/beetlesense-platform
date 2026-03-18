/**
 * BuyerComparison — Multi-buyer price comparison table.
 *
 * Shows all Swedish timber buyers side-by-side with color-coded best/worst
 * prices, transport cost estimates, net price after transport, sparklines,
 * and volume-based price tiers.
 */

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, Phone, ChevronDown, ChevronUp, Crown } from 'lucide-react';
import {
  useTimberMarket,
  TIMBER_ASSORTMENTS,
  estimateTransport,
  type TimberAssortment,
  type BuyerPrice,
  type BuyerInfo,
} from '@/hooks/useTimberMarket';

// ─── Mini sparkline (inline SVG) ───

function Sparkline({ data, color, width = 64, height = 20 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last point */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 2) - 1}
        r={2}
        fill={color}
      />
    </svg>
  );
}

// ─── Volume tier badge ───

function VolumeTierInfo({ tiers }: { tiers: { minVolume: number; bonus: number }[] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {tiers.filter(t => t.bonus > 0).map((t) => (
        <span
          key={t.minVolume}
          className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--green)]/10 text-[var(--green)]"
        >
          +{t.bonus} kr &ge;{t.minVolume} m&sup3;
        </span>
      ))}
    </div>
  );
}

// ─── Component ───

interface BuyerComparisonProps {
  buyers?: BuyerInfo[];
  prices?: BuyerPrice[];
}

export function BuyerComparison({ buyers: externalBuyers, prices: externalPrices }: BuyerComparisonProps = {}) {
  const { t: _t, i18n } = useTranslation();
  const lang = i18n.language;
  const market = useTimberMarket();
  const buyers = externalBuyers ?? market.buyers;
  const prices = externalPrices ?? market.prices;

  const [selectedAssortment, setSelectedAssortment] = useState<TimberAssortment>('talltimmer');
  const [sortBy, setSortBy] = useState<'net' | 'gross' | 'distance'>('net');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedBuyer, setExpandedBuyer] = useState<string | null>(null);

  const assortmentMeta = TIMBER_ASSORTMENTS.find((a) => a.id === selectedAssortment)!;

  // Build comparison rows
  const rows = useMemo(() => {
    return buyers.map((buyer) => {
      const priceEntry = prices.find(
        (p) => p.buyerId === buyer.id && p.assortment === selectedAssortment,
      );
      const grossPrice = priceEntry?.currentPrice ?? 0;
      const transportCost = estimateTransport(buyer.distanceKm);
      const netPrice = grossPrice - transportCost;
      const history = priceEntry?.history ?? [];
      const volumeTiers = priceEntry?.volumeTiers ?? [];

      // 12-month change
      const firstPrice = history[0] ?? grossPrice;
      const changePercent = firstPrice > 0
        ? Math.round(((grossPrice - firstPrice) / firstPrice) * 1000) / 10
        : 0;

      return {
        buyer,
        grossPrice,
        transportCost,
        netPrice,
        history,
        volumeTiers,
        changePercent,
      };
    });
  }, [buyers, prices, selectedAssortment]);

  // Sort
  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      switch (sortBy) {
        case 'net': return a.netPrice - b.netPrice;
        case 'gross': return a.grossPrice - b.grossPrice;
        case 'distance': return a.buyer.distanceKm - b.buyer.distanceKm;
      }
    });
    return sortDir === 'desc' ? sorted.reverse() : sorted;
  }, [rows, sortBy, sortDir]);

  // Best/worst for highlighting
  const bestNet = Math.max(...rows.map((r) => r.netPrice));
  const worstNet = Math.min(...rows.map((r) => r.netPrice));

  function handleSort(col: 'net' | 'gross' | 'distance') {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />;
  };

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">
              {lang === 'sv' ? 'Koparprisjamforelse' : 'Buyer Price Comparison'}
            </h3>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {lang === 'sv' ? '6 kopare, nettopris efter transport' : '6 buyers, net price after transport'}
            </p>
          </div>

          {/* Assortment selector */}
          <div className="flex gap-1.5 flex-wrap">
            {TIMBER_ASSORTMENTS.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedAssortment(a.id)}
                className={`
                  flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all
                  ${selectedAssortment === a.id
                    ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                    : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                  }
                `}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                {lang === 'sv' ? a.nameSv : a.nameEn}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)]" style={{ background: 'var(--bg3)' }}>
              <th className="text-left px-4 py-2.5 text-[var(--text3)] font-medium">
                {lang === 'sv' ? 'Kopare' : 'Buyer'}
              </th>
              <th className="text-right px-3 py-2.5 text-[var(--text3)] font-medium">
                {lang === 'sv' ? '12 man' : '12 mo.'}
              </th>
              <th
                className="text-right px-3 py-2.5 text-[var(--text3)] font-medium cursor-pointer hover:text-[var(--green)] transition-colors"
                onClick={() => handleSort('gross')}
              >
                <span className="inline-flex items-center gap-0.5">
                  {lang === 'sv' ? 'Bruttopris' : 'Gross'} <SortIcon col="gross" />
                </span>
              </th>
              <th
                className="text-right px-3 py-2.5 text-[var(--text3)] font-medium cursor-pointer hover:text-[var(--green)] transition-colors"
                onClick={() => handleSort('distance')}
              >
                <span className="inline-flex items-center gap-0.5">
                  <Truck size={10} /> km <SortIcon col="distance" />
                </span>
              </th>
              <th className="text-right px-3 py-2.5 text-[var(--text3)] font-medium">
                {lang === 'sv' ? 'Transport' : 'Transport'}
              </th>
              <th
                className="text-right px-4 py-2.5 text-[var(--text3)] font-medium cursor-pointer hover:text-[var(--green)] transition-colors"
                onClick={() => handleSort('net')}
              >
                <span className="inline-flex items-center gap-0.5">
                  {lang === 'sv' ? 'Nettopris' : 'Net'} <SortIcon col="net" />
                </span>
              </th>
              <th className="px-3 py-2.5 text-[var(--text3)] font-medium text-center">
                {lang === 'sv' ? '12 man trend' : '12mo trend'}
              </th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => {
              const isBest = row.netPrice === bestNet;
              const isWorst = row.netPrice === worstNet && rows.length > 1;
              const isExpanded = expandedBuyer === row.buyer.id;

              return (
                <tr key={row.buyer.id} className="group">
                  <td colSpan={8} className="p-0">
                    <div
                      className={`
                        border-b border-[var(--border)] transition-colors
                        ${isBest ? 'bg-[var(--green)]/5' : ''}
                        ${isWorst ? 'bg-red-500/5' : ''}
                      `}
                    >
                      {/* Main row */}
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto_auto_auto] items-center">
                        {/* Buyer name */}
                        <div className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isBest && <Crown size={12} className="text-[var(--green)]" />}
                            <div>
                              <p className="font-semibold text-[var(--text)]">{row.buyer.name}</p>
                              <p className="text-[9px] text-[var(--text3)] flex items-center gap-1 mt-0.5">
                                <MapPin size={8} />
                                {row.buyer.terminalCity}
                                <span className="text-[var(--text3)]/60">
                                  &middot; {row.buyer.type === 'local' ? (lang === 'sv' ? 'Lokalt sagverk' : 'Local sawmill') : (lang === 'sv' ? 'Storkopare' : 'Major buyer')}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* 12mo change */}
                        <div className="px-3 py-3 text-right">
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                              row.changePercent > 0
                                ? 'bg-[var(--green)]/10 text-[var(--green)]'
                                : row.changePercent < 0
                                ? 'bg-red-500/10 text-red-400'
                                : 'text-[var(--text3)]'
                            }`}
                          >
                            {row.changePercent > 0 ? '+' : ''}{row.changePercent}%
                          </span>
                        </div>

                        {/* Gross */}
                        <div className="px-3 py-3 text-right font-mono text-[var(--text)]">
                          {row.grossPrice} <span className="text-[var(--text3)]">kr</span>
                        </div>

                        {/* Distance */}
                        <div className="px-3 py-3 text-right font-mono text-[var(--text2)]">
                          {row.buyer.distanceKm} km
                        </div>

                        {/* Transport cost */}
                        <div className="px-3 py-3 text-right font-mono text-red-400">
                          -{row.transportCost} kr
                        </div>

                        {/* Net price */}
                        <div className="px-4 py-3 text-right">
                          <span
                            className={`font-mono font-semibold text-sm ${
                              isBest ? 'text-[var(--green)]' : isWorst ? 'text-red-400' : 'text-[var(--text)]'
                            }`}
                          >
                            {row.netPrice} kr
                          </span>
                          <span className="block text-[8px] text-[var(--text3)] font-mono">
                            /m&sup3;fub
                          </span>
                        </div>

                        {/* Sparkline */}
                        <div className="px-3 py-3 flex justify-center">
                          <Sparkline data={row.history} color={assortmentMeta.color} />
                        </div>

                        {/* Expand + Contact */}
                        <div className="px-3 py-3 flex items-center gap-2">
                          <button
                            onClick={() => setExpandedBuyer(isExpanded ? null : row.buyer.id)}
                            className="text-[10px] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                            aria-label="Toggle details"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button
                            className="text-[10px] font-medium px-2.5 py-1 rounded-lg border border-[var(--green)]/30 text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors whitespace-nowrap"
                          >
                            <Phone size={10} className="inline mr-1" />
                            {lang === 'sv' ? 'Kontakta' : 'Contact'}
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 border-t border-[var(--border)]/50">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* All assortment prices for this buyer */}
                            <div>
                              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-2">
                                {lang === 'sv' ? 'Alla sortiment' : 'All assortments'}
                              </p>
                              <div className="space-y-1.5">
                                {TIMBER_ASSORTMENTS.map((a) => {
                                  const p = prices.find((x) => x.buyerId === row.buyer.id && x.assortment === a.id);
                                  const net = (p?.currentPrice ?? 0) - row.transportCost;
                                  return (
                                    <div key={a.id} className="flex items-center justify-between text-[10px]">
                                      <span className="flex items-center gap-1.5 text-[var(--text2)]">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                                        {lang === 'sv' ? a.nameSv : a.nameEn}
                                      </span>
                                      <span className="font-mono text-[var(--text)]">
                                        {p?.currentPrice ?? '—'} kr
                                        <span className="text-[var(--text3)] ml-2">
                                          (netto {net > 0 ? net : '—'} kr)
                                        </span>
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Volume tiers */}
                            <div>
                              <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-2">
                                {lang === 'sv' ? 'Volymbonusar' : 'Volume bonuses'}
                              </p>
                              <VolumeTierInfo tiers={row.volumeTiers} />
                              <p className="text-[9px] text-[var(--text3)] mt-2">
                                {lang === 'sv'
                                  ? 'Storre volymer ger hogre pris per m3fub.'
                                  : 'Larger volumes yield higher price per m3fub.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="p-4 flex items-center justify-between" style={{ background: 'var(--bg3)' }}>
        <p className="text-[10px] text-[var(--text3)]">
          {lang === 'sv'
            ? `Visar ${rows.length} kopare for ${assortmentMeta.nameSv}. Priser i kr/m3fub.`
            : `Showing ${rows.length} buyers for ${assortmentMeta.nameEn}. Prices in SEK/m3fub.`}
        </p>
        <p className="text-[10px] text-[var(--green)] font-medium">
          {lang === 'sv' ? 'Basta netto: ' : 'Best net: '}
          <span className="font-mono">{bestNet} kr/m&sup3;fub</span>
        </p>
      </div>
    </div>
  );
}
