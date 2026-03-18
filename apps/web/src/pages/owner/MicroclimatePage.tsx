import { useState, useMemo } from 'react';
import {
  Thermometer,
  PanelLeftClose,
  PanelLeftOpen,
  Bug,
  TrendingUp,
  MapPin,
  BarChart3,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useMicroclimate } from '@/hooks/useMicroclimate';
import { ParcelClimateCard } from '@/components/microclimate/ParcelClimateCard';
import { BeetleRiskModel } from '@/components/microclimate/BeetleRiskModel';
import { GrowingDegreeDays } from '@/components/microclimate/GrowingDegreeDays';
import type { BeetleRiskLevel, ForecastDay } from '@/hooks/useMicroclimate';

// ─── Helpers ───

function riskColor(level: BeetleRiskLevel): string {
  switch (level) {
    case 'low': return '#4ade80';
    case 'medium': return '#fbbf24';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
  }
}

// ─── 14-Day Forecast with Beetle Overlay ───

function ForecastOverlay({ forecast }: { forecast: ForecastDay[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            14-dagarsprognos med barkborrerisk
          </h3>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {forecast.map((day) => {
            const date = new Date(day.date);
            const dayLabel = date.toLocaleDateString('sv-SE', { weekday: 'short' }).slice(0, 2);
            const dateLabel = date.getDate();
            return (
              <div
                key={day.date}
                className={`flex-shrink-0 w-14 flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all ${
                  day.beetleFlightRisk
                    ? 'border-[var(--red)]/40 bg-[var(--red)]/5'
                    : 'border-[var(--border)] bg-[var(--bg)]'
                }`}
              >
                <span className="text-[8px] text-[var(--text3)] uppercase">{dayLabel}</span>
                <span className="text-[10px] font-mono text-[var(--text2)]">{dateLabel}</span>
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-mono font-semibold text-[var(--text)]">
                    {Math.round(day.tempMax)}°
                  </span>
                  <span className="text-[9px] font-mono text-[var(--text3)]">
                    {Math.round(day.tempMin)}°
                  </span>
                </div>
                {day.precipitation > 0 && (
                  <span className="text-[8px] font-mono text-[#60a5fa]">
                    {day.precipitation.toFixed(1)}mm
                  </span>
                )}
                {day.beetleFlightRisk ? (
                  <Bug size={10} className="text-[var(--red)]" />
                ) : (
                  <div className="w-2.5 h-2.5" />
                )}
                <span className="text-[7px] font-mono text-[var(--text3)]">
                  +{day.gddContribution.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1">
            <Bug size={10} className="text-[var(--red)]" />
            <span className="text-[9px] text-[var(--text3)]">Flygväder (&gt;18°C, torrt, svag vind)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-[var(--text3)]">+GDD = dagligt bidrag</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Historical Temp Chart ───

function HistoricalChart({ data }: { data: { date: string; min: number; max: number; avg: number }[] }) {
  if (data.length < 2) return null;

  const width = 480;
  const height = 120;
  const margin = { top: 8, right: 8, bottom: 20, left: 30 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const allTemps = data.flatMap((d) => [d.min, d.max]);
  const minT = Math.floor(Math.min(...allTemps) - 2);
  const maxT = Math.ceil(Math.max(...allTemps) + 2);
  const range = maxT - minT || 1;

  function x(i: number): number { return margin.left + (i / (data.length - 1)) * plotW; }
  function y(v: number): number { return margin.top + plotH - ((v - minT) / range) * plotH; }

  const maxLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.max)}`).join(' ');
  const minLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.min)}`).join(' ');
  const avgLine = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.avg)}`).join(' ');

  // Fill between min and max
  const areaPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(d.max)}`)
    .concat(data.slice().reverse().map((d, i) => `L${x(data.length - 1 - i)},${y(d.min)}`))
    .join(' ') + 'Z';

  // 18°C threshold line
  const threshold18Y = y(18);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Thermometer size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Temperaturhistorik — 30 dagar
          </h3>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '140px' }}>
          {/* Grid */}
          {[minT, Math.round((minT + maxT) / 2), maxT].map((v) => (
            <g key={v}>
              <line x1={margin.left} y1={y(v)} x2={width - margin.right} y2={y(v)}
                stroke="var(--border)" strokeWidth="0.5" />
              <text x={margin.left - 4} y={y(v) + 3} textAnchor="end"
                fill="var(--text3)" fontSize="8" fontFamily="monospace">{v}°</text>
            </g>
          ))}

          {/* 18°C threshold */}
          {18 >= minT && 18 <= maxT && (
            <>
              <line x1={margin.left} y1={threshold18Y} x2={width - margin.right} y2={threshold18Y}
                stroke="#ef4444" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5" />
              <text x={width - margin.right + 2} y={threshold18Y + 3}
                fill="#ef4444" fontSize="7" fontFamily="monospace">18°C</text>
            </>
          )}

          {/* Area fill */}
          <path d={areaPath} fill="var(--green)" opacity="0.08" />

          {/* Lines */}
          <path d={maxLine} fill="none" stroke="#f97316" strokeWidth="1" opacity="0.6" />
          <path d={minLine} fill="none" stroke="#60a5fa" strokeWidth="1" opacity="0.6" />
          <path d={avgLine} fill="none" stroke="var(--green)" strokeWidth="1.5" />

          {/* Date labels (every 7 days) */}
          {data.filter((_, i) => i % 7 === 0).map((d, idx) => {
            const i = idx * 7;
            return (
              <text key={d.date} x={x(i)} y={height - 4} textAnchor="middle"
                fill="var(--text3)" fontSize="7" fontFamily="monospace">
                {new Date(d.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
              </text>
            );
          })}
        </svg>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#f97316]" />
            <span className="text-[9px] text-[var(--text3)]">Max</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[var(--green)]" />
            <span className="text-[9px] text-[var(--text3)]">Medel</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#60a5fa]" />
            <span className="text-[9px] text-[var(--text3)]">Min</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-[#ef4444]" style={{ borderTop: '1px dashed #ef4444' }} />
            <span className="text-[9px] text-[var(--text3)]">18°C svärmningströskel</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Regional Comparison ───

function RegionalComparison({ parcels }: { parcels: { parcelName: string; beetleRiskScore: number; beetleRiskLevel: BeetleRiskLevel; gddCurrent: number; currentTemp: number }[] }) {
  const sorted = [...parcels].sort((a, b) => b.beetleRiskScore - a.beetleRiskScore);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={14} className="text-[var(--text2)]" />
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            Regional jämförelse
          </h3>
        </div>
        <div className="space-y-2">
          {sorted.map((p) => {
            const color = riskColor(p.beetleRiskLevel);
            return (
              <div
                key={p.parcelName}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[var(--text)] truncate">{p.parcelName}</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color }}>
                      {p.beetleRiskScore}/100
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${p.beetleRiskScore}%`, background: color }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] text-[var(--text3)]">{p.currentTemp}°C</span>
                    <span className="text-[9px] text-[var(--text3)]">GDD: {p.gddCurrent}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page Component ───

export default function MicroclimatePage() {
  const {
    parcels,
    predictions,
    gddComparisons,
    selectedParcelId,
    setSelectedParcelId,
    loading,
  } = useMicroclimate();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<'parcels' | 'regional' | 'gdd'>('parcels');

  const selectedParcel = useMemo(
    () => parcels.find((p) => p.parcelId === selectedParcelId) ?? parcels[0],
    [parcels, selectedParcelId],
  );
  const selectedPrediction = useMemo(
    () => predictions.find((p) => p.parcelId === selectedParcelId) ?? predictions[0],
    [predictions, selectedParcelId],
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="animate-pulse flex flex-col items-center gap-3">
          <Thermometer size={32} className="text-[var(--green)]" />
          <span className="text-sm text-[var(--text3)]">Laddar mikroklimatdata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full relative">
      {/* Left sidebar */}
      <div
        className={`absolute top-0 left-0 bottom-0 z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 xl:w-[28rem] border-r border-[var(--border)] overflow-y-auto`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Link to="/owner/dashboard" className="p-1 rounded hover:bg-[var(--bg3)] transition-colors">
                <ArrowLeft size={16} className="text-[var(--text3)]" />
              </Link>
              <Thermometer size={18} className="text-[var(--green)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                Mikroklimat & Barkborredetektion
              </h1>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:flex hidden items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg3)] transition-colors"
              aria-label="Stäng sidopanel"
            >
              <PanelLeftClose size={16} className="text-[var(--text3)]" />
            </button>
          </div>
          <p className="text-xs text-[var(--text3)] mb-4 ml-8">
            Per-skifte granulering med svärmningsprognos
          </p>

          {/* View tabs */}
          <div className="flex gap-1 mb-4 p-1 rounded-lg bg-[var(--bg)]">
            {([
              { key: 'parcels', label: 'Skiften', icon: MapPin },
              { key: 'regional', label: 'Regional', icon: BarChart3 },
              { key: 'gdd', label: 'GDD', icon: TrendingUp },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[11px] font-medium transition-colors ${
                  view === key
                    ? 'bg-[var(--surface)] text-[var(--green)] shadow-sm'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Parcels view */}
          {view === 'parcels' && (
            <div className="space-y-3">
              {/* Parcel climate cards */}
              {parcels.map((parcel) => (
                <ParcelClimateCard
                  key={parcel.parcelId}
                  parcel={parcel}
                  isSelected={parcel.parcelId === selectedParcelId}
                  onClick={() => setSelectedParcelId(parcel.parcelId)}
                />
              ))}

              {/* Selected parcel details */}
              {selectedParcel && (
                <>
                  {/* 14-day forecast */}
                  <ForecastOverlay forecast={selectedParcel.forecast14d} />

                  {/* Historical temperature */}
                  <HistoricalChart data={selectedParcel.tempHistory30d} />

                  {/* Beetle risk model */}
                  {selectedPrediction && (
                    <BeetleRiskModel
                      prediction={selectedPrediction}
                      parcelName={selectedParcel.parcelName}
                    />
                  )}
                </>
              )}
            </div>
          )}

          {/* Regional comparison view */}
          {view === 'regional' && (
            <div className="space-y-3">
              <RegionalComparison parcels={parcels} />

              {/* All parcel beetle risk models */}
              {predictions.map((pred) => {
                const parcel = parcels.find((p) => p.parcelId === pred.parcelId);
                return (
                  <BeetleRiskModel
                    key={pred.parcelId}
                    prediction={pred}
                    parcelName={parcel?.parcelName ?? ''}
                  />
                );
              })}
            </div>
          )}

          {/* GDD view */}
          {view === 'gdd' && (
            <div className="space-y-3">
              <GrowingDegreeDays comparisons={gddComparisons} />

              {/* Forecast GDD summary */}
              <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
                <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">
                  GDD-prognos per skifte
                </h3>
                <div className="space-y-2">
                  {parcels.map((p) => (
                    <div
                      key={p.parcelId}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                    >
                      <div>
                        <span className="text-xs font-medium text-[var(--text)]">{p.parcelName}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-[var(--text3)]">{p.elevation}m ö.h.</span>
                          <span className="text-[9px] text-[var(--text3)]">{p.sprucePct}% gran</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono font-bold text-[var(--text)]">{p.gddCurrent}</span>
                        <span className="text-[9px] text-[var(--text3)]"> GDD</span>
                        {p.daysUntilGDD600 !== null ? (
                          <p className="text-[9px] text-[var(--yellow)]">~{p.daysUntilGDD600}d till 600</p>
                        ) : (
                          <p className="text-[9px] text-[var(--red)]">Tröskel uppnådd</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main area (placeholder for map or expanded view) */}
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        {/* Sidebar toggle */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            style={{ background: 'var(--surface)' }}
            aria-label="Öppna sidopanel"
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        {/* Summary dashboard when sidebar is closed */}
        <div className={`transition-opacity ${sidebarOpen ? 'opacity-40' : 'opacity-100'} max-w-2xl mx-auto p-8`}>
          <div className="text-center mb-8">
            <Bug size={40} className="text-[var(--green)] mx-auto mb-3" />
            <h2 className="text-xl font-serif font-bold text-[var(--text)] mb-1">Mikroklimat & Svärmningsmodell</h2>
            <p className="text-sm text-[var(--text3)]">
              Per-skifte klimatdata och barkborreriskmodell baserad på GDD-ackumulation, temperatur och stressfaktorer.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-4">
            {parcels.slice(0, 3).map((p) => {
              const color = riskColor(p.beetleRiskLevel);
              return (
                <div
                  key={p.parcelId}
                  className="p-4 rounded-xl border border-[var(--border)] text-center"
                  style={{ background: 'var(--bg2)' }}
                >
                  <p className="text-sm font-semibold text-[var(--text)]">{p.parcelName}</p>
                  <p className="text-3xl font-bold font-mono mt-2" style={{ color }}>{p.beetleRiskScore}</p>
                  <p className="text-[10px] text-[var(--text3)] mt-1">Riskscore</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
