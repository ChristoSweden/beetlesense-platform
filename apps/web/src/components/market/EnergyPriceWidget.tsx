import React from 'react';
import { Zap, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react';
import type { SpotPrice, BiomassValue, EnergyArea } from '../../services/energyPriceService';

interface Props {
  spotPrices: SpotPrice[];
  biomassValue: BiomassValue | null;
  area: EnergyArea;
  onAreaChange: (area: EnergyArea) => void;
}

const AREAS: EnergyArea[] = ['SE1', 'SE2', 'SE3', 'SE4'];

function Sparkline({ data, color = '#4ade80' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function EnergyPriceWidget({ spotPrices, biomassValue, area, onAreaChange }: Props) {
  const currentHour = new Date().getHours();
  const currentPrice = spotPrices.find(p => p.hour === currentHour);
  const avgPrice = spotPrices.length > 0
    ? spotPrices.reduce((s, p) => s + p.priceOreKwh, 0) / spotPrices.length
    : 0;
  const isAboveAvg = currentPrice ? currentPrice.priceOreKwh > avgPrice : false;
  const priceData = spotPrices.map(p => p.priceOreKwh);

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={18} style={{ color: '#facc15' }} />
          <span className="font-semibold" style={{ color: 'var(--text)' }}>Elpris / Electricity</span>
        </div>
        <div className="flex gap-1">
          {AREAS.map(a => (
            <button
              key={a}
              onClick={() => onAreaChange(a)}
              className="px-2 py-0.5 text-xs rounded transition-all"
              style={{
                background: a === area ? 'var(--green)' : 'transparent',
                color: a === area ? '#030d05' : 'var(--text3)',
                border: `1px solid ${a === area ? 'var(--green)' : 'var(--border)'}`,
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-end gap-4 mb-3">
        <div>
          <div className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
            {currentPrice?.priceOreKwh.toFixed(1) || '—'}
          </div>
          <div className="text-xs" style={{ color: 'var(--text3)' }}>öre/kWh just nu</div>
        </div>
        <div className="flex-1">
          <Sparkline data={priceData} color={isAboveAvg ? '#f87171' : '#4ade80'} />
          <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>24h prisförlopp</div>
        </div>
        <div className="flex items-center gap-1 text-sm" style={{ color: isAboveAvg ? '#f87171' : '#4ade80' }}>
          {isAboveAvg ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {isAboveAvg ? 'Över' : 'Under'} snitt
        </div>
      </div>

      {biomassValue && (
        <div className="pt-3 mt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text2)' }}>
            <ArrowUpDown size={12} className="inline mr-1" />
            Energived baserat på elpris
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>{biomassValue.energyWoodPriceKrM3}</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>kr/m³ Energived</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>{biomassValue.grotPriceKrM3}</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>kr/m³ GROT</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold" style={{ color: 'var(--green)' }}>{biomassValue.brannvedPriceKrM3}</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>kr/m³ Brännved</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
