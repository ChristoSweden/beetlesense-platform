/**
 * ActiveHedges — Portfolio view of all active hedging positions.
 * Shows per-hedge cards with type, volume, locked price, mark-to-market P&L,
 * total hedge ratio, expiry dates, close/roll actions, and a P&L chart.
 */

import { useState } from 'react';
import {
  Lock,
  Shield,
  TrendingUp,
  TrendingDown,
  RotateCw,
  X,
  Activity,
} from 'lucide-react';
import type { ActiveHedge, PnlHistoryPoint } from '@/hooks/useTimberHedging';

interface Props {
  hedges: ActiveHedge[];
  hedgeRatioPct: number;
  totalPnlSEK: number;
  pnlHistory: PnlHistoryPoint[];
  onClose: (hedgeId: string) => void;
  onRollForward: (hedgeId: string) => void;
}

function formatSEK(val: number): string {
  return val.toLocaleString('sv-SE');
}

export function ActiveHedges({
  hedges,
  hedgeRatioPct,
  totalPnlSEK,
  pnlHistory,
  onClose,
  onRollForward,
}: Props) {
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'close' | 'roll' } | null>(null);

  const activeHedges = hedges.filter((h) => h.status === 'active');

  // Simple SVG P&L chart
  const chartWidth = 400;
  const chartHeight = 100;
  const values = pnlHistory.map((p) => p.totalPnlSEK);
  const maxVal = Math.max(...values.map(Math.abs), 1);
  const midY = chartHeight / 2;

  const points = pnlHistory
    .map((p, i) => {
      const x = (i / Math.max(pnlHistory.length - 1, 1)) * chartWidth;
      const y = midY - (p.totalPnlSEK / maxVal) * (chartHeight / 2 - 5);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPath = pnlHistory
    .map((p, i) => {
      const x = (i / Math.max(pnlHistory.length - 1, 1)) * chartWidth;
      const y = midY - (p.totalPnlSEK / maxVal) * (chartHeight / 2 - 5);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const lastPoint = pnlHistory[pnlHistory.length - 1];

  return (
    <div className="space-y-5">
      {/* Portfolio summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] text-[var(--text3)]">Hedgekvot</p>
          <p className="text-xl font-mono font-semibold text-[var(--text)]">{hedgeRatioPct}%</p>
          <p className="text-[10px] text-[var(--text3)]">av avverkningsplan skyddad</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] text-[var(--text3)]">Total P&L</p>
          <p className={`text-xl font-mono font-semibold ${totalPnlSEK >= 0 ? 'text-[var(--green)]' : 'text-red-400'}`}>
            {totalPnlSEK >= 0 ? '+' : ''}{formatSEK(totalPnlSEK)} SEK
          </p>
          <p className="text-[10px] text-[var(--text3)]">mark-to-market</p>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3 sm:col-span-1 col-span-2" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] text-[var(--text3)]">Aktiva hedgar</p>
          <p className="text-xl font-mono font-semibold text-[var(--text)]">{activeHedges.length}</p>
          <p className="text-[10px] text-[var(--text3)]">positioner</p>
        </div>
      </div>

      {/* P&L chart */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-[var(--text3)]" />
            <h3 className="text-xs font-semibold text-[var(--text)]">P&L over tid</h3>
          </div>
          {lastPoint && (
            <span className={`text-xs font-mono ${lastPoint.totalPnlSEK >= 0 ? 'text-[var(--green)]' : 'text-red-400'}`}>
              {lastPoint.totalPnlSEK >= 0 ? '+' : ''}{formatSEK(lastPoint.totalPnlSEK)} SEK
            </span>
          )}
        </div>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-24" preserveAspectRatio="none">
          {/* Zero line */}
          <line x1="0" y1={midY} x2={chartWidth} y2={midY} stroke="var(--border)" strokeWidth="1" strokeDasharray="4 4" />
          {/* Area fill */}
          <path
            d={`${areaPath} L ${chartWidth} ${midY} L 0 ${midY} Z`}
            fill={totalPnlSEK >= 0 ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)'}
          />
          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={totalPnlSEK >= 0 ? '#4ade80' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[9px] text-[var(--text3)]">{pnlHistory[0]?.date}</span>
          <span className="text-[9px] text-[var(--text3)]">{lastPoint?.date}</span>
        </div>
      </div>

      {/* Hedge cards */}
      <div className="space-y-3">
        {activeHedges.map((hedge) => {
          const isProfit = hedge.pnlSEK >= 0;
          const isConfirming = confirmAction?.id === hedge.id;

          return (
            <div
              key={hedge.id}
              className="rounded-xl border border-[var(--border)] p-4"
              style={{ background: 'var(--bg2)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    hedge.type === 'forward' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                  }`}>
                    {hedge.type === 'forward' ? (
                      <Lock size={16} className="text-blue-400" />
                    ) : (
                      <Shield size={16} className="text-purple-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">{hedge.label}</p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {hedge.type === 'forward' ? 'Terminskontrakt' : 'Prisforsakring'} &middot; {hedge.counterparty}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${isProfit ? 'text-[var(--green)]' : 'text-red-400'}`}>
                  {isProfit ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span className="text-sm font-mono font-semibold">
                    {isProfit ? '+' : ''}{formatSEK(hedge.pnlSEK)} SEK
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Volym</p>
                  <p className="text-xs font-mono text-[var(--text)]">{hedge.volumeM3} m³</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">
                    {hedge.type === 'forward' ? 'Last pris' : 'Prisgolv'}
                  </p>
                  <p className="text-xs font-mono text-[var(--text)]">{hedge.lockedPriceSEK} SEK/m³</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Spotpris nu</p>
                  <p className="text-xs font-mono text-[var(--text2)]">{hedge.currentSpotSEK} SEK/m³</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Leveransperiod</p>
                  <p className="text-xs text-[var(--text)]">{hedge.deliveryWindow}</p>
                </div>
              </div>

              {/* Insurance-specific info */}
              {hedge.type === 'insurance' && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg mb-3" style={{ background: 'var(--bg3)' }}>
                  <p className="text-[10px] text-[var(--text3)]">
                    Premie betald: <span className="font-mono text-[var(--text)]">{formatSEK(hedge.premiumPaidSEK || 0)} SEK</span>
                  </p>
                  <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                  <p className={`text-[10px] font-medium ${hedge.isInTheMoney ? 'text-amber-400' : 'text-[var(--green)]'}`}>
                    {hedge.isInTheMoney
                      ? 'In-the-money (forsakringen betalar ut)'
                      : 'Out-of-money (bra — priset ar over golv)'}
                  </p>
                </div>
              )}

              {/* P&L per m³ for forwards */}
              {hedge.type === 'forward' && hedge.pnlPerM3SEK !== 0 && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg mb-3" style={{ background: 'var(--bg3)' }}>
                  <p className="text-[10px] text-[var(--text3)]">
                    P&L per m³:{' '}
                    <span className={`font-mono font-semibold ${isProfit ? 'text-[var(--green)]' : 'text-red-400'}`}>
                      {isProfit ? '+' : ''}{hedge.pnlPerM3SEK} SEK
                    </span>
                  </p>
                  <span className="text-[10px] text-[var(--text3)]">&middot;</span>
                  <p className="text-[10px] text-[var(--text3)]">
                    Utgar: {hedge.expiresAt}
                  </p>
                </div>
              )}

              {/* Actions */}
              {isConfirming ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/30" style={{ background: 'rgba(251,191,36,0.05)' }}>
                  <p className="text-xs text-amber-400 flex-1">
                    {confirmAction.action === 'close'
                      ? 'Ar du saker? Detta stanger hedgen och realiserar P&L.'
                      : 'Rulla framåt 3 manader?'}
                  </p>
                  <button
                    onClick={() => {
                      if (confirmAction.action === 'close') onClose(hedge.id);
                      else onRollForward(hedge.id);
                      setConfirmAction(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-xs font-semibold text-white hover:brightness-110 transition"
                  >
                    Bekrafta
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition"
                  >
                    Avbryt
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmAction({ id: hedge.id, action: 'close' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition"
                  >
                    <X size={12} />
                    Stang hedge
                  </button>
                  <button
                    onClick={() => setConfirmAction({ id: hedge.id, action: 'roll' })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition"
                  >
                    <RotateCw size={12} />
                    Rulla framat
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {activeHedges.length === 0 && (
          <div className="text-center py-8 text-[var(--text3)]">
            <Lock size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Inga aktiva hedgar</p>
            <p className="text-xs mt-1">Teckna ett terminskontrakt eller prisforsakring for att komma igang.</p>
          </div>
        )}
      </div>
    </div>
  );
}
