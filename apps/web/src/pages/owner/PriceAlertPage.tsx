import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Bell, DollarSign } from 'lucide-react';
import {
  getPriceAlerts,
  getSellSignals,
  getPriceHistory,
  SPECIES_CONFIG,
  REGIONS,
  formatSEK,
  type PriceAlert,
  type SellSignal,
  type Species,
} from '@/services/priceAlertService';

const SIGNAL_CONFIG = {
  strong_sell: { label: 'Strong Sell', color: '#16a34a', bg: '#f0fdf4' },
  sell: { label: 'Sell', color: '#22c55e', bg: '#f0fdf4' },
  hold: { label: 'Hold', color: '#f59e0b', bg: '#fffbeb' },
  wait: { label: 'Wait', color: '#6b7280', bg: '#f3f4f6' },
};

const TREND_ICON = {
  rising: <TrendingUp size={12} className="text-green-600" />,
  falling: <TrendingDown size={12} className="text-red-500" />,
  stable: <Minus size={12} className="text-gray-400" />,
};

export default function PriceAlertPage() {
  const [selectedRegion, setSelectedRegion] = useState<string>('Sm\u00e5land');
  const [activeTab, setActiveTab] = useState<'prices' | 'signals' | 'history'>('prices');

  const allPrices = useMemo(() => getPriceAlerts(), []);
  const signals = useMemo(() => getSellSignals(), []);
  const history = useMemo(() => getPriceHistory(), []);

  const regionalPrices = useMemo(
    () => allPrices.filter(p => p.region === selectedRegion),
    [allPrices, selectedRegion],
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-blue-500/10">
              <Bell size={18} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Price Alerts</h1>
              <p className="text-[11px] text-[var(--text3)]">Timber prices and sell signals</p>
            </div>
          </div>
        </div>

        {/* Top sell signal */}
        {signals.filter(s => s.signal === 'strong_sell' || s.signal === 'sell').length > 0 && (
          <div className="rounded-xl p-4 mb-5 border border-green-200" style={{ background: '#f0fdf4' }}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={16} className="text-green-700" />
              <span className="text-sm font-semibold text-green-800">Active sell signal</span>
            </div>
            {signals.filter(s => s.signal === 'strong_sell' || s.signal === 'sell').slice(0, 1).map(s => (
              <p key={s.id} className="text-xs text-green-700">{s.reasoning}</p>
            ))}
          </div>
        )}

        {/* Region selector */}
        <div className="flex gap-2 mb-5">
          {REGIONS.map(region => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                selectedRegion === region
                  ? 'bg-[var(--green)] text-white'
                  : 'border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)]'
              }`}
              style={selectedRegion !== region ? { background: 'var(--bg2)' } : undefined}
            >
              {region}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 rounded-lg p-1 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          {(['prices', 'signals', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-[var(--green)] text-white'
                  : 'text-[var(--text2)] hover:text-[var(--text)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Prices tab */}
        {activeTab === 'prices' && (
          <div className="space-y-3">
            {regionalPrices.map(price => {
              const spec = SPECIES_CONFIG[price.species];
              return (
                <div key={price.id} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: spec.color }} />
                      <span className="text-sm font-semibold text-[var(--text)]">{spec.nameSv} ({spec.nameEn})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {TREND_ICON[price.trend]}
                      <span className={`text-xs font-medium ${price.changePercent > 0 ? 'text-green-600' : price.changePercent < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {price.changePercent > 0 ? '+' : ''}{price.changePercent}%
                      </span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-[var(--text)] mb-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                    {formatSEK(price.currentPrice)} <span className="text-xs font-normal text-[var(--text3)]">SEK/m\u00B3fub</span>
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
                    <span>5-yr avg: {formatSEK(price.historicalAvg)}</span>
                    <span className={price.aboveAverage ? 'text-green-600' : 'text-red-500'}>
                      {price.aboveAverage ? '+' : ''}{price.percentAboveAvg}% vs avg
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Signals tab */}
        {activeTab === 'signals' && (
          <div className="space-y-3">
            {signals.map(signal => {
              const sc = SIGNAL_CONFIG[signal.signal];
              const spec = SPECIES_CONFIG[signal.species];
              return (
                <div key={signal.id} className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-[var(--text)]">{signal.parcelName}</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: sc.color, background: sc.bg }}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Species</p>
                      <p className="text-xs font-medium text-[var(--text)]">{spec.nameSv}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Volume</p>
                      <p className="text-xs font-medium text-[var(--text)]">{signal.readyVolume} m\u00B3</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Est. revenue</p>
                      <p className="text-xs font-medium text-[var(--green)]">{formatSEK(signal.estimatedRevenue)} kr</p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text3)] leading-relaxed">{signal.reasoning}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* History tab */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div className="rounded-xl p-4 border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
              <h3 className="text-xs font-semibold text-[var(--text)] mb-3">12-Month Price History</h3>
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-wider text-[var(--text3)] pb-2 border-b border-[var(--border)]">
                  <span>Month</span>
                  <span className="text-right">Spruce</span>
                  <span className="text-right">Pine</span>
                  <span className="text-right">Birch</span>
                </div>
                {history.map(point => (
                  <div key={point.month} className="grid grid-cols-4 gap-2 text-xs py-1.5">
                    <span className="text-[var(--text2)]">{point.label}</span>
                    <span className="text-right text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>{point.spruce}</span>
                    <span className="text-right text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>{point.pine}</span>
                    <span className="text-right text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>{point.birch}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[var(--text3)] mt-3">Prices in SEK/m\u00B3fub</p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center mt-6 italic">
          Demo data. In production, prices are sourced from regional timber markets updated weekly.
        </p>
      </div>
    </div>
  );
}
