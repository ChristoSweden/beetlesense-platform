import React from 'react';
import { BarChart3, TrendingUp, Download, Lightbulb } from 'lucide-react';
import { useEnergyMarket } from '../../hooks/useEnergyMarket';
import EnergyPriceWidget from './EnergyPriceWidget';
import CarbonPriceWidget from './CarbonPriceWidget';

function Sparkline({ data, color = '#4ade80' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h}><polyline points={points} fill="none" stroke={color} strokeWidth="1.5" /></svg>
  );
}

export default function MarketOverview() {
  const market = useEnergyMarket(50);

  if (market.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: 'var(--green)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const timberEstimate = 450; // kr/m3fub average
  const carbonAnnual = market.carbonForestValue?.annualValueSek || 0;
  const energyWoodVal = market.biomassValue?.energyWoodPriceKrM3 || 0;
  const totalTimber = timberEstimate * 300; // 300 m3 harvest
  const totalCarbon = carbonAnnual;
  const totalEnergy = energyWoodVal * 80; // 80 m3 energy wood
  const totalEcosystem = 25000; // estimated ecosystem services
  const grandTotal = totalTimber + totalCarbon + totalEnergy + totalEcosystem;

  const breakdown = [
    { label: 'Virke', value: totalTimber, color: '#4ade80', pct: Math.round((totalTimber / grandTotal) * 100) },
    { label: 'Kolkredit', value: totalCarbon, color: '#60a5fa', pct: Math.round((totalCarbon / grandTotal) * 100) },
    { label: 'Energived', value: totalEnergy, color: '#facc15', pct: Math.round((totalEnergy / grandTotal) * 100) },
    { label: 'Ekosystem', value: totalEcosystem, color: '#a78bfa', pct: Math.round((totalEcosystem / grandTotal) * 100) },
  ];

  const bestRevenue = breakdown.reduce((a, b) => a.value > b.value ? a : b);

  return (
    <div className="space-y-6">
      {/* Insight banner */}
      <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid var(--border)' }}>
        <Lightbulb size={20} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>Bästa intäktsmix just nu</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text2)' }}>
            {bestRevenue.label} dominerar din intäktspotential ({bestRevenue.pct}%).
            {market.optimalSellTime && ` Elpriset toppar kl ${market.optimalSellTime.hour}:00 (${market.optimalSellTime.reason}).`}
            {market.carbonPrice && ` Kolkreditpriset är €${market.carbonPrice.priceEurTonne}/ton — historiskt högt.`}
          </div>
        </div>
      </div>

      {/* Revenue breakdown bar */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} style={{ color: 'var(--green)' }} />
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Total skogsintäkt</span>
          </div>
          <div className="text-xl font-bold" style={{ color: 'var(--green)' }}>
            {Math.round(grandTotal / 1000)} tkr/år
          </div>
        </div>
        {/* Stacked bar */}
        <div className="flex rounded-full overflow-hidden h-4 mb-3">
          {breakdown.map(b => (
            <div key={b.label} style={{ width: `${b.pct}%`, background: b.color }} title={`${b.label}: ${b.pct}%`} />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {breakdown.map(b => (
            <div key={b.label} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                <span className="text-xs" style={{ color: 'var(--text3)' }}>{b.label}</span>
              </div>
              <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{Math.round(b.value / 1000)} tkr</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>{b.pct}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Widgets grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EnergyPriceWidget
          spotPrices={market.spotPrices}
          biomassValue={market.biomassValue}
          area={market.area}
          onAreaChange={market.setArea}
        />
        <CarbonPriceWidget
          carbonPrice={market.carbonPrice}
          carbonForestValue={market.carbonForestValue}
          carbonHistory={market.carbonHistory}
          eurSek={market.eurSek}
        />
      </div>

      {/* Historical prices table */}
      <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} style={{ color: 'var(--green)' }} />
            <span className="font-semibold" style={{ color: 'var(--text)' }}>Elpris 12 mån ({market.area})</span>
          </div>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all hover:opacity-80" style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--green)' }}>
            <Download size={12} /> Exportera
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text3)' }}>
                <th className="text-left pb-2 font-medium text-xs">Månad</th>
                <th className="text-right pb-2 font-medium text-xs">Snitt</th>
                <th className="text-right pb-2 font-medium text-xs">Min</th>
                <th className="text-right pb-2 font-medium text-xs">Max</th>
                <th className="text-right pb-2 font-medium text-xs">Trend</th>
              </tr>
            </thead>
            <tbody>
              {market.historicalPrices.slice(-6).map((p, i) => (
                <tr key={p.month} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-1.5" style={{ color: 'var(--text2)' }}>{p.month}</td>
                  <td className="text-right font-medium" style={{ color: 'var(--text)' }}>{p.avgOreKwh.toFixed(1)}</td>
                  <td className="text-right" style={{ color: 'var(--text3)' }}>{p.minOreKwh.toFixed(1)}</td>
                  <td className="text-right" style={{ color: 'var(--text3)' }}>{p.maxOreKwh.toFixed(1)}</td>
                  <td className="text-right">
                    <Sparkline data={market.historicalPrices.slice(Math.max(0, i - 3), i + 1).map(x => x.avgOreKwh)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
