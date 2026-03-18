import React from 'react';
import { Leaf, TrendingUp, TrendingDown, Euro } from 'lucide-react';
import type { CarbonPrice, CarbonValuation, CarbonPriceHistory } from '../../services/carbonPriceService';
import type { ExchangeRate } from '../../services/currencyService';

interface Props {
  carbonPrice: CarbonPrice | null;
  carbonForestValue: CarbonValuation | null;
  carbonHistory: CarbonPriceHistory[];
  eurSek: ExchangeRate | null;
}

function Sparkline({ data, color = '#4ade80' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 140;
  const h = 36;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={(data.length - 1) / (data.length - 1) * w} cy={h - ((data[data.length - 1] - min) / range) * h} r="3" fill={color} />
    </svg>
  );
}

export default function CarbonPriceWidget({ carbonPrice, carbonForestValue, carbonHistory, eurSek }: Props) {
  const histPrices = carbonHistory.map(h => h.priceEur);
  const isUp = carbonPrice ? carbonPrice.change24h > 0 : false;

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Leaf size={18} style={{ color: '#4ade80' }} />
          <span className="font-semibold" style={{ color: 'var(--text)' }}>EU ETS Kolkredit</span>
        </div>
        <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{
          background: isUp ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)',
          color: isUp ? '#4ade80' : '#f87171',
        }}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {carbonPrice ? `${isUp ? '+' : ''}${carbonPrice.changePercent24h.toFixed(1)}%` : '—'}
        </div>
      </div>

      {carbonPrice && (
        <div className="flex items-end gap-4 mb-3">
          <div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
              €{carbonPrice.priceEurTonne.toFixed(2)}
            </div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>per tonne CO₂</div>
          </div>
          <div className="flex-1">
            <Sparkline data={histPrices} color={isUp ? '#4ade80' : '#f87171'} />
            <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>12 mån trend</div>
          </div>
        </div>
      )}

      {carbonForestValue && (
        <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text2)' }}>
            Din skog ({carbonForestValue.hectares} ha)
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>
                {carbonForestValue.annualSequestrationTonnes} ton
              </div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>CO₂ per år</div>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>
                {Math.round(carbonForestValue.annualValueSek / 1000)} tkr
              </div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>Årligt värde</div>
            </div>
          </div>
          <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: 'rgba(74,222,128,0.08)', color: 'var(--text2)' }}>
            10-års projicerat värde: <strong style={{ color: 'var(--green)' }}>
              {Math.round(carbonForestValue.tenYearProjectedValueSek / 1000)} tkr
            </strong>
          </div>
        </div>
      )}

      {eurSek && (
        <div className="flex items-center justify-between mt-3 pt-3 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text3)' }}>
          <div className="flex items-center gap-1">
            <Euro size={12} />
            EUR/SEK: <span style={{ color: 'var(--text2)' }}>{eurSek.rate.toFixed(4)}</span>
          </div>
          <span style={{ color: eurSek.change24h > 0 ? '#f87171' : '#4ade80' }}>
            {eurSek.change24h > 0 ? '+' : ''}{eurSek.changePercent.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
