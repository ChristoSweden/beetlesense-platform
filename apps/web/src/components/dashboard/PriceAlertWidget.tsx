import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, ChevronRight, Bell } from 'lucide-react';
import {
  getTopSellSignal,
  getBestPrice,
  SPECIES_CONFIG,
  formatSEK,
} from '@/services/priceAlertService';
import type { Species } from '@/services/priceAlertService';

const SIGNAL_LABELS: Record<string, { label: string; color: string }> = {
  strong_sell: { label: 'Strong Sell', color: '#4ade80' },
  sell: { label: 'Sell', color: '#4ade80' },
  hold: { label: 'Hold', color: '#fbbf24' },
  wait: { label: 'Wait', color: '#9ca3af' },
};

function TrendIcon({ trend }: { trend: 'rising' | 'falling' | 'stable' }) {
  if (trend === 'rising') return <TrendingUp size={14} className="text-green-500" />;
  if (trend === 'falling') return <TrendingDown size={14} className="text-red-400" />;
  return <Minus size={14} className="text-gray-400" />;
}

/**
 * PriceAlertWidget — Compact dashboard widget showing the top sell signal
 * or current best price with trend. Links to the full Price Alerts page.
 */
export function PriceAlertWidget() {
  const topSignal = getTopSellSignal();
  const bestSpruce = getBestPrice('spruce');

  // Determine the "hero" species to show as top price
  const topSpecies: Species = 'spruce';
  const topPrice = bestSpruce;
  const config = SPECIES_CONFIG[topSpecies];

  const hasSignal = topSignal && (topSignal.signal === 'strong_sell' || topSignal.signal === 'sell');
  const signalInfo = topSignal ? SIGNAL_LABELS[topSignal.signal] : null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4 relative overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Pulsing accent for strong sell */}
      {hasSignal && (
        <div
          className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
          style={{
            background: '#4ade80',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Price Alerts</h3>
        </div>
        <Link
          to="/owner/price-alerts"
          className="flex items-center gap-1 text-[10px] font-medium text-[var(--green)] hover:underline"
        >
          View all <ChevronRight size={12} />
        </Link>
      </div>

      {hasSignal && topSignal ? (
        /* Active sell signal card */
        <div className="space-y-3">
          <div
            className="rounded-lg p-3 border"
            style={{
              background: `${signalInfo?.color ?? '#4ade80'}08`,
              borderColor: `${signalInfo?.color ?? '#4ade80'}30`,
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{
                  background: `${signalInfo?.color ?? '#4ade80'}20`,
                  color: signalInfo?.color ?? '#4ade80',
                }}
              >
                {signalInfo?.label}
              </span>
              <span className="text-[10px] text-[var(--text3)]">
                {topSignal.readyVolume} m³ {SPECIES_CONFIG[topSignal.species].nameEn.toLowerCase()}
              </span>
            </div>

            <p className="text-xs text-[var(--text2)] mb-2">
              {topSignal.parcelName} — {formatSEK(topSignal.currentPrice)} SEK/m³
            </p>

            <p className="text-lg font-bold text-[var(--text)]">
              {formatSEK(topSignal.estimatedRevenue)} SEK
            </p>
            <p className="text-[10px] text-[var(--text3)]">Estimated revenue</p>
          </div>

          <Link
            to="/owner/timber-sale"
            className="block w-full text-center py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
          >
            Start Sale
          </Link>
        </div>
      ) : (
        /* No active signal — show top price with trend */
        <div className="space-y-2">
          <p className="text-xs text-[var(--text3)]">
            Prices stable. We'll notify you when they hit your target.
          </p>

          {topPrice && (
            <div className="flex items-center justify-between rounded-lg p-3 border border-[var(--border)] bg-[var(--bg)]">
              <div>
                <p className="text-[10px] text-[var(--text3)]">{config.nameEn} (best)</p>
                <p className="text-base font-bold text-[var(--text)]">
                  {formatSEK(topPrice.currentPrice)} SEK/m³
                </p>
              </div>
              <div className="flex items-center gap-1">
                <TrendIcon trend={topPrice.trend} />
                <span
                  className="text-xs font-semibold"
                  style={{
                    color:
                      topPrice.changePercent > 0
                        ? '#4ade80'
                        : topPrice.changePercent < 0
                          ? '#f87171'
                          : 'var(--text3)',
                  }}
                >
                  {topPrice.changePercent > 0 ? '+' : ''}
                  {topPrice.changePercent}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export default PriceAlertWidget;
