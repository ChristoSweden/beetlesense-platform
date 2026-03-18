/**
 * LongRotationPage — Long-Rotation Economics & Financial Planning.
 *
 * Features:
 * - NPV comparison: 60-year vs 80-year vs 100-year vs 120-year rotation
 * - Interactive sliders for discount rate, timber price growth, carbon price growth
 * - Visual timeline showing harvest events, thinning, carbon income streams
 * - Total value comparison chart (timber + carbon + biodiversity + recreation + hunting)
 * - Key insight: "120-year rotation yields X% more total value than 80-year"
 * - Non-timber values: hunting leases, recreation, biodiversity subsidies
 *
 * Also includes the existing strategy-based analysis (traditional, extended,
 * continuous cover, carbon-focused) in the "Strategies" tab.
 */
import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Timer,
  TreePine,
  BarChart3,
  Sliders,
  Info,
  Leaf,
  Target,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  type StandParams,
  type RevenueStreamConfig,
  type SensitivityParams,
  type StrategyId,
  DEMO_STAND,
  DEFAULT_STREAMS,
  DEFAULT_SENSITIVITY,
  DISCOUNT_RATE_OPTIONS,
  ALL_STRATEGIES,
  STRATEGY_COLORS,
  runAllStrategies,
  formatKr,
} from '@/services/longRotationService';
import { StrategyComparison } from '@/components/rotation/StrategyComparison';
import { SensitivityPanel } from '@/components/rotation/SensitivityPanel';
import { useLongRotation, type RotationLength, type RotationNPV } from '@/hooks/useLongRotation';
import { formatSEK, formatCO2, type TreeSpecies } from '@/services/carbonService';

// ─── Rotation Comparison SVG Chart ───

function RotationComparisonChart({ rotations, selectedRotation }: {
  rotations: RotationNPV[];
  selectedRotation: RotationLength;
}) {
  const w = 650;
  const h = 300;
  const pad = { top: 30, right: 20, bottom: 50, left: 80 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const maxNPV = Math.max(...rotations.map(r => r.totalNPV));
  const barW = plotW / rotations.length * 0.6;
  const gap = plotW / rotations.length;

  const streamColors: Record<string, string> = {
    timber: '#4ade80',
    carbon: '#a78bfa',
    biodiversity: '#fbbf24',
    hunting: '#f97316',
    recreation: '#60a5fa',
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-label="Rotation NPV comparison">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => (
        <g key={frac}>
          <line x1={pad.left} y1={pad.top + plotH * (1 - frac)} x2={pad.left + plotW} y2={pad.top + plotH * (1 - frac)}
            stroke="var(--border)" strokeWidth="0.5" />
          <text x={pad.left - 8} y={pad.top + plotH * (1 - frac) + 4} textAnchor="end"
            className="text-[8px] fill-[var(--text3)] font-mono">
            {formatKr(maxNPV * frac)}
          </text>
        </g>
      ))}

      {/* Stacked bars */}
      {rotations.map((r, i) => {
        const cx = pad.left + gap * i + gap / 2;
        const x = cx - barW / 2;
        const streams = [
          { key: 'timber', val: r.timberNPV },
          { key: 'carbon', val: r.carbonNPV },
          { key: 'biodiversity', val: r.biodiversityNPV },
          { key: 'hunting', val: r.huntingNPV },
          { key: 'recreation', val: r.recreationNPV },
        ];

        let yOffset = pad.top + plotH;
        const isSelected = r.rotation === selectedRotation;

        return (
          <g key={r.rotation}>
            {/* Selection highlight */}
            {isSelected && (
              <rect x={x - 4} y={pad.top} width={barW + 8} height={plotH}
                fill="var(--green)" opacity="0.03" rx="4" />
            )}
            {streams.map(s => {
              const segH = Math.max(0, (s.val / maxNPV) * plotH);
              yOffset -= segH;
              return (
                <rect key={s.key} x={x} y={yOffset} width={barW} height={segH}
                  fill={streamColors[s.key]} opacity={isSelected ? 0.8 : 0.5} rx="2" />
              );
            })}
            {/* Total label */}
            <text x={cx} y={pad.top + plotH - (r.totalNPV / maxNPV) * plotH - 6}
              textAnchor="middle" className="text-[9px] fill-[var(--text)] font-mono font-semibold">
              {formatKr(r.totalNPV)}
            </text>
            {/* Rotation label */}
            <text x={cx} y={h - 20} textAnchor="middle"
              className={`text-[10px] font-semibold ${isSelected ? 'fill-[var(--green)]' : 'fill-[var(--text2)]'}`}>
              {r.rotation} yr
            </text>
            <text x={cx} y={h - 8} textAnchor="middle" className="text-[8px] fill-[var(--text3)]">
              {formatKr(r.npvPerHa)}/ha
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${pad.left}, ${pad.top - 18})`}>
        {Object.entries(streamColors).map(([key, color], i) => (
          <g key={key} transform={`translate(${i * 90}, 0)`}>
            <rect x="0" y="0" width="8" height="6" fill={color} opacity="0.7" rx="1" />
            <text x="12" y="6" className="text-[7px] fill-[var(--text2)] capitalize">{key}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Timeline Chart ───

function TimelineChart({ events, rotation }: {
  events: { year: number; type: string; revenueSEK: number; label: string }[];
  rotation: number;
}) {
  const w = 650;
  const h = 180;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const maxRev = Math.max(...events.map(e => Math.abs(e.revenueSEK)), 1);

  function toX(year: number) { return pad.left + (year / rotation) * plotW; }

  const typeColors: Record<string, string> = {
    plant: '#ef4444',
    thin: '#fbbf24',
    harvest: '#4ade80',
    carbon_income: '#a78bfa',
    biodiversity_payment: '#60a5fa',
  };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-label="Timeline chart">
      {/* Baseline */}
      <line x1={pad.left} y1={pad.top + plotH / 2} x2={pad.left + plotW} y2={pad.top + plotH / 2}
        stroke="var(--border)" strokeWidth="1" />

      {/* Year marks */}
      {[0, 20, 40, 60, 80, 100, 120].filter(y => y <= rotation).map(yr => (
        <g key={yr}>
          <line x1={toX(yr)} y1={pad.top + plotH / 2 - 3} x2={toX(yr)} y2={pad.top + plotH / 2 + 3}
            stroke="var(--border)" strokeWidth="1" />
          <text x={toX(yr)} y={h - 8} textAnchor="middle" className="text-[8px] fill-[var(--text3)] font-mono">
            {yr}
          </text>
        </g>
      ))}

      {/* Events */}
      {events.map((e, i) => {
        const x = toX(e.year);
        const barH = Math.min((Math.abs(e.revenueSEK) / maxRev) * (plotH / 2 - 5), plotH / 2 - 5);
        const isPositive = e.revenueSEK >= 0;
        const y = isPositive ? pad.top + plotH / 2 - barH : pad.top + plotH / 2;

        return (
          <g key={i}>
            <rect x={x - 3} y={y} width={6} height={barH} rx="1"
              fill={typeColors[e.type] || 'var(--text3)'} opacity="0.7" />
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${pad.left}, ${pad.top - 8})`}>
        {[
          { key: 'thin', label: 'Thinning' },
          { key: 'harvest', label: 'Harvest' },
          { key: 'carbon_income', label: 'Carbon' },
          { key: 'biodiversity_payment', label: 'Biodiversity' },
        ].map((item, i) => (
          <g key={item.key} transform={`translate(${i * 85}, 0)`}>
            <rect x="0" y="0" width="6" height="6" fill={typeColors[item.key]} opacity="0.7" rx="1" />
            <text x="10" y="6" className="text-[7px] fill-[var(--text2)]">{item.label}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ─── Species Options ───

const SPECIES_OPTIONS: { value: TreeSpecies; labelEn: string; labelSv: string }[] = [
  { value: 'spruce', labelEn: 'Norway Spruce', labelSv: 'Gran' },
  { value: 'pine', labelEn: 'Scots Pine', labelSv: 'Tall' },
  { value: 'birch', labelEn: 'Birch', labelSv: 'Bjork' },
  { value: 'mixed', labelEn: 'Mixed', labelSv: 'Blandskog' },
];

// ─── Main Component ───

type TabId = 'rotation_npv' | 'timeline' | 'strategies' | 'sensitivity';

export default function LongRotationPage() {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';

  // ── Long-rotation economics (new hook) ──
  const {
    config,
    updateConfig,
    selectedRotation,
    setSelectedRotation,
    comparison,
    timeline,
    growthCurve: _growthCurve,
    selectedDetail,
    rotationOptions,
  } = useLongRotation();

  // ── Existing strategy analysis ──
  const [stand, setStand] = useState<StandParams>(DEMO_STAND);
  const [streams, setStreams] = useState<RevenueStreamConfig>(DEFAULT_STREAMS);
  const [sensitivity, setSensitivity] = useState<SensitivityParams>(DEFAULT_SENSITIVITY);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('traditional');

  const strategies = useMemo(
    () => runAllStrategies(stand, streams, sensitivity, 120),
    [stand, streams, sensitivity],
  );

  const _selectedStrategyResult = useMemo(
    () => strategies.find(s => s.id === selectedStrategy) ?? strategies[0],
    [strategies, selectedStrategy],
  );

  // Tab
  const [activeTab, setActiveTab] = useState<TabId>('rotation_npv');

  const handleStandChange = useCallback((field: keyof StandParams, value: number | TreeSpecies) => {
    setStand(prev => ({ ...prev, [field]: value }));
  }, []);

  const _handleStreamToggle = useCallback((stream: keyof RevenueStreamConfig) => {
    setStreams(prev => ({ ...prev, [stream]: !prev[stream] }));
  }, []);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'rotation_npv', label: 'Rotation NPV', icon: <BarChart3 size={14} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
    { id: 'strategies', label: 'Strategies', icon: <TreePine size={14} /> },
    { id: 'sensitivity', label: 'Sensitivity', icon: <Sliders size={14} /> },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--green)]/10 border border-[var(--green)]/20">
            <Timer size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h1 className="text-lg font-serif font-bold text-[var(--text)]">
              Long-Rotation Economics
            </h1>
            <p className="text-xs text-[var(--text3)] mt-0.5">
              NPV comparison across rotation lengths — the economics Sodra does not want you to see
            </p>
          </div>
        </div>

        {/* Key Insight Banner */}
        <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-4 mb-6">
          <div className="flex items-start gap-3">
            <Sparkles size={18} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[var(--green)]">
                {comparison.insight}
              </p>
              <p className="text-xs text-[var(--text2)] mt-1">
                Total additional value: {formatSEK(comparison.gainAbsolute)} over standard 80-year rotation.
                Includes timber, carbon credits, biodiversity subsidies, hunting leases, and recreation income.
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {comparison.rotations.map(r => (
            <button
              key={r.rotation}
              onClick={() => setSelectedRotation(r.rotation)}
              className={`rounded-xl border p-3 text-left transition-all ${
                r.rotation === selectedRotation
                  ? 'border-[var(--green)]/50 bg-[var(--green)]/5 ring-1 ring-[var(--green)]/20'
                  : 'border-[var(--border)] hover:border-[var(--green)]/20'
              }`}
              style={r.rotation === selectedRotation ? undefined : { background: 'var(--bg2)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text3)]">
                  {r.rotation}-year
                </span>
                {r.rotation === comparison.bestRotation && (
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[var(--green)]/20 text-[var(--green)]">
                    BEST
                  </span>
                )}
              </div>
              <p className={`text-lg font-bold font-mono ${
                r.rotation === selectedRotation ? 'text-[var(--green)]' : 'text-[var(--text)]'
              }`}>
                {formatKr(r.totalNPV)}
              </p>
              <p className="text-[9px] text-[var(--text3)]">
                {formatKr(r.npvPerHa)}/ha &middot; {formatCO2(r.totalCarbonStored)} t CO₂
              </p>
            </button>
          ))}
        </div>

        {/* Interactive Controls */}
        <div className="rounded-xl border border-[var(--border)] p-4 mb-6" style={{ background: 'var(--bg2)' }}>
          <h2 className="text-xs font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Sliders size={14} className="text-[var(--green)]" />
            Economic Parameters
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Discount Rate Slider */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">
                Discount Rate: {(config.discountRate * 100).toFixed(1)}%
              </label>
              <input
                type="range"
                min={10}
                max={50}
                value={config.discountRate * 1000}
                onChange={e => updateConfig({ discountRate: Number(e.target.value) / 1000 })}
                className="w-full accent-[var(--green)]"
              />
              <div className="flex justify-between text-[9px] text-[var(--text3)]">
                <span>1%</span><span>5%</span>
              </div>
            </div>

            {/* Timber Price Growth */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">
                Timber Price Growth: {(config.timberPriceGrowth * 100).toFixed(1)}%/yr
              </label>
              <input
                type="range"
                min={0}
                max={30}
                value={config.timberPriceGrowth * 1000}
                onChange={e => updateConfig({ timberPriceGrowth: Number(e.target.value) / 1000 })}
                className="w-full accent-[var(--green)]"
              />
              <div className="flex justify-between text-[9px] text-[var(--text3)]">
                <span>0%</span><span>3%</span>
              </div>
            </div>

            {/* Carbon Price Growth */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">
                Carbon Price Growth: {(config.carbonPriceGrowth * 100).toFixed(1)}%/yr
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={config.carbonPriceGrowth * 1000}
                onChange={e => updateConfig({ carbonPriceGrowth: Number(e.target.value) / 1000 })}
                className="w-full accent-[var(--green)]"
              />
              <div className="flex justify-between text-[9px] text-[var(--text3)]">
                <span>0%</span><span>5%</span>
              </div>
            </div>

            {/* Species */}
            <div>
              <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">
                Species
              </label>
              <select
                value={config.species}
                onChange={e => updateConfig({ species: e.target.value as TreeSpecies })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg)] focus:border-[var(--green)] focus:outline-none"
              >
                {SPECIES_OPTIONS.map(sp => (
                  <option key={sp.value} value={sp.value}>
                    {isSv ? sp.labelSv : sp.labelEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Additional params */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3 pt-3 border-t border-[var(--border)]">
            <div>
              <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">Site Index (SI)</label>
              <input
                type="number"
                min={14}
                max={36}
                value={config.siteIndex}
                onChange={e => updateConfig({ siteIndex: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-mono text-[var(--text)] bg-[var(--bg)] focus:border-[var(--green)] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--text2)] block mb-1">Area (ha)</label>
              <input
                type="number"
                min={1}
                max={500}
                value={config.areaHa}
                onChange={e => updateConfig({ areaHa: Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs font-mono text-[var(--text)] bg-[var(--bg)] focus:border-[var(--green)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 mb-4 border-b border-[var(--border)]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="rounded-xl border border-[var(--border)] p-4 sm:p-5" style={{ background: 'var(--bg2)' }}>

          {/* ── Rotation NPV Comparison ── */}
          {activeTab === 'rotation_npv' && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                NPV Comparison by Rotation Length
              </h3>
              <p className="text-[10px] text-[var(--text3)] mb-4">
                Total net present value across all revenue streams. Click rotation cards above to explore details.
              </p>

              {/* Stacked bar chart */}
              <RotationComparisonChart
                rotations={comparison.rotations}
                selectedRotation={selectedRotation}
              />

              {/* Selected rotation detail */}
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <h4 className="text-xs font-semibold text-[var(--text)] mb-3">
                  {selectedRotation}-Year Rotation Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)] mb-0.5">Timber NPV</p>
                    <p className="text-sm font-bold font-mono text-[var(--green)]">{formatKr(selectedDetail.timberNPV)}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)] mb-0.5">Carbon NPV</p>
                    <p className="text-sm font-bold font-mono text-purple-400">{formatKr(selectedDetail.carbonNPV)}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)] mb-0.5">Biodiversity</p>
                    <p className="text-sm font-bold font-mono text-amber-400">{formatKr(selectedDetail.biodiversityNPV)}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)] mb-0.5">Hunting</p>
                    <p className="text-sm font-bold font-mono text-orange-400">{formatKr(selectedDetail.huntingNPV)}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)] mb-0.5">Recreation</p>
                    <p className="text-sm font-bold font-mono text-blue-400">{formatKr(selectedDetail.recreationNPV)}</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--green)]/30 p-2.5">
                    <p className="text-[9px] text-[var(--text3)] mb-0.5">CO₂ at End</p>
                    <p className="text-sm font-bold font-mono text-[var(--green)]">{formatCO2(selectedDetail.totalCarbonStored)} t</p>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)]">Total Harvest Volume</p>
                    <p className="text-sm font-bold font-mono text-[var(--text)]">{formatCO2(selectedDetail.totalHarvestVolume)} m³</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)]">Avg Timber Diameter</p>
                    <p className="text-sm font-bold font-mono text-[var(--text)]">{selectedDetail.avgTimberDiameter} cm</p>
                  </div>
                  <div className="rounded-lg bg-[var(--bg)] border border-[var(--border)] p-2.5">
                    <p className="text-[9px] text-[var(--text3)]">Sawlog Fraction</p>
                    <p className="text-sm font-bold font-mono text-[var(--text)]">{(selectedDetail.sawlogFraction * 100).toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Timeline ── */}
          {activeTab === 'timeline' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text)]">
                    {selectedRotation}-Year Management Timeline
                  </h3>
                  <p className="text-[10px] text-[var(--text3)]">
                    Harvest events, thinning, carbon income, and subsidy payments over the rotation
                  </p>
                </div>
                <div className="flex gap-1">
                  {rotationOptions.map(r => (
                    <button
                      key={r}
                      onClick={() => setSelectedRotation(r)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-medium border transition-colors ${
                        selectedRotation === r
                          ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                          : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                      }`}
                    >
                      {r} yr
                    </button>
                  ))}
                </div>
              </div>

              <TimelineChart events={timeline} rotation={selectedRotation} />

              {/* Event list */}
              <div className="mt-4 pt-3 border-t border-[var(--border)]">
                <div className="space-y-1.5 max-h-72 overflow-y-auto">
                  {timeline.map((evt, i) => {
                    const _typeColors: Record<string, string> = {
                      plant: 'text-red-400',
                      thin: 'text-amber-400',
                      harvest: 'text-[var(--green)]',
                      carbon_income: 'text-purple-400',
                      biodiversity_payment: 'text-blue-400',
                    };
                    return (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span className="font-mono text-[var(--text3)] w-10">Y{evt.year}</span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          evt.type === 'plant' ? 'bg-red-400' :
                          evt.type === 'thin' ? 'bg-amber-400' :
                          evt.type === 'harvest' ? 'bg-[var(--green)]' :
                          evt.type === 'carbon_income' ? 'bg-purple-400' :
                          'bg-blue-400'
                        }`} />
                        <span className="text-[var(--text)]">{isSv ? evt.labelSv : evt.label}</span>
                        {evt.volumeM3 && (
                          <span className="text-[var(--text3)]">({formatCO2(evt.volumeM3)} m³)</span>
                        )}
                        <span className={`font-mono ml-auto ${evt.revenueSEK >= 0 ? 'text-[var(--green)]' : 'text-red-400'}`}>
                          {evt.revenueSEK >= 0 ? '+' : ''}{formatSEK(evt.revenueSEK)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Strategies (existing) ── */}
          {activeTab === 'strategies' && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                {t('rotation.comparison.title', { defaultValue: 'Strategy Comparison' })}
              </h3>
              <p className="text-[10px] text-[var(--text3)] mb-3">
                Traditional vs Extended vs Continuous Cover vs Carbon-Focused management strategies.
              </p>

              {/* Quick stand params */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
                <div>
                  <label className="text-[9px] text-[var(--text3)] block mb-0.5">Species</label>
                  <select
                    value={stand.species}
                    onChange={e => handleStandChange('species', e.target.value as TreeSpecies)}
                    className="w-full px-2 py-1 rounded border border-[var(--border)] text-[10px] text-[var(--text)] bg-[var(--bg2)]"
                  >
                    {SPECIES_OPTIONS.map(sp => (
                      <option key={sp.value} value={sp.value}>{isSv ? sp.labelSv : sp.labelEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-[var(--text3)] block mb-0.5">Discount Rate</label>
                  <div className="flex gap-1">
                    {DISCOUNT_RATE_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => setSensitivity(prev => ({ ...prev, discountRate: opt.value }))}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                          sensitivity.discountRate === opt.value
                            ? 'border-[var(--green)]/30 bg-[var(--green)]/10 text-[var(--green)]'
                            : 'border-[var(--border)] text-[var(--text3)]'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategy cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {strategies.map(s => (
                  <div key={s.id} className={`rounded-xl border p-3 cursor-pointer transition-all ${
                    selectedStrategy === s.id
                      ? 'border-[var(--green)]/50 bg-[var(--green)]/5'
                      : 'border-[var(--border)]'
                  }`}
                    style={selectedStrategy === s.id ? undefined : { background: 'var(--bg)' }}
                    onClick={() => setSelectedStrategy(s.id)}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: STRATEGY_COLORS[s.id] }} />
                      <p className="text-[10px] font-medium text-[var(--text)]">{isSv ? s.labelSv : s.label}</p>
                    </div>
                    <p className="text-base font-bold font-mono text-[var(--text)]">{formatKr(s.totalNPV)}</p>
                    <p className="text-[9px] font-mono" style={{ color: STRATEGY_COLORS[s.id] }}>
                      IRR {s.irr.toFixed(1)}% &middot; {formatCO2(s.endCO2Stored)} t CO₂
                    </p>
                  </div>
                ))}
              </div>

              <StrategyComparison strategies={strategies} />
            </div>
          )}

          {/* ── Sensitivity ── */}
          {activeTab === 'sensitivity' && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                {t('rotation.sensitivity.title', { defaultValue: 'Sensitivity Analysis' })}
              </h3>
              <p className="text-[10px] text-[var(--text3)] mb-4">
                How changes in timber prices, carbon prices, and discount rates affect NPV.
              </p>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] text-[var(--text2)]">Strategy:</span>
                <select
                  value={selectedStrategy}
                  onChange={e => setSelectedStrategy(e.target.value as StrategyId)}
                  className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text)] bg-[var(--bg)] focus:border-[var(--green)] focus:outline-none"
                >
                  {ALL_STRATEGIES.map(id => {
                    const s = strategies.find(st => st.id === id);
                    return (
                      <option key={id} value={id}>
                        {s ? (isSv ? s.labelSv : s.label) : id}
                      </option>
                    );
                  })}
                </select>
              </div>
              <SensitivityPanel
                stand={stand}
                strategy={selectedStrategy}
                streams={streams}
                sensitivity={sensitivity}
                onSensitivityChange={setSensitivity}
              />
            </div>
          )}
        </div>

        {/* Non-timber values info */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-[var(--text)]">Hunting Leases</span>
            </div>
            <p className="text-[10px] text-[var(--text3)]">
              55 SEK/ha/year from Jaktlag (hunting teams). Older, multi-aged forests attract higher lease values
              due to better game habitat. Jägareförbundet benchmark data.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Leaf size={14} className="text-blue-400" />
              <span className="text-xs font-semibold text-[var(--text)]">Biodiversity Subsidies</span>
            </div>
            <p className="text-[10px] text-[var(--text3)]">
              LONA grants + EU biodiversity payments. Up to 1,800 SEK/ha/year for forests managed
              with extended rotation or continuous cover. Multiplier increases with rotation length.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <TreePine size={14} className="text-[var(--green)]" />
              <span className="text-xs font-semibold text-[var(--text)]">Recreation Value</span>
            </div>
            <p className="text-[10px] text-[var(--text3)]">
              80 SEK/ha/year from trail access, mushroom/berry permits, forest bathing tourism.
              Continuous cover and older forests yield 50% premium. Growing market segment.
            </p>
          </div>
        </div>

        {/* Methodology note */}
        <div className="mt-6 p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-start gap-2">
            <Info size={14} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-xs font-semibold text-[var(--text)] mb-1">
                Methodology
              </h4>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">
                NPV calculations use Faustmann (1849) Land Expectation Value with Swedish-calibrated
                Chapman-Richards growth functions from SLU Heureka yield tables. Timber prices from
                Skogforsk 2024 averages; carbon credits at 800 SEK/tonne (voluntary market mid-range).
                Dimension premium of up to 34% for timber harvested at 120+ years based on Swedish
                sawmill premium schedules. Biodiversity payments based on LONA/EU subsidy schedules.
                All values in SEK, discounted at user-selected rate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
