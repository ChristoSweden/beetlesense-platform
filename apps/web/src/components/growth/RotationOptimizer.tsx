import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, Target, TrendingUp, ArrowRight } from 'lucide-react';
import type { ParcelData } from '@/services/growthModelService';
import {
  analyzeRotations,
  findOptimalNPVRotation,
} from '@/services/growthModelService';

interface RotationOptimizerProps {
  parcel: ParcelData;
  onRotationChange: (age: number) => void;
  rotationAge: number;
}

function formatSEK(n: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(n);
}

export function RotationOptimizer({
  parcel,
  onRotationChange,
  rotationAge,
}: RotationOptimizerProps) {
  const { t } = useTranslation();
  const [selectedRate, setSelectedRate] = useState<'2.5' | '3.5' | '4.5'>('3.5');

  const analyses = useMemo(
    () => analyzeRotations(parcel, 'rcp60', 40, 120),
    [parcel],
  );

  const optimal = useMemo(
    () => findOptimalNPVRotation(analyses, selectedRate),
    [analyses, selectedRate],
  );

  const current = analyses.find((a) => a.rotationAge === rotationAge);
  const npvKey = `npv${selectedRate.replace('.', '')}` as 'npv25' | 'npv35' | 'npv45';

  // NPV sparkline data
  const maxNPV = Math.max(...analyses.map((a) => a[npvKey]));
  const minNPV = Math.min(...analyses.map((a) => a[npvKey]));
  const npvRange = maxNPV - minNPV || 1;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
          <SlidersHorizontal size={16} className="text-[var(--green)]" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {t('growth.rotation.title')}
          </h3>
          <p className="text-[10px] text-[var(--text3)]">
            {t('growth.rotation.subtitle')}
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[var(--text3)]">
            {t('growth.rotation.period')}
          </span>
          <span className="text-sm font-mono font-semibold text-[var(--green)]">
            {rotationAge} {t('growth.units.years')}
          </span>
        </div>
        <input
          type="range"
          min={40}
          max={120}
          step={1}
          value={rotationAge}
          onChange={(e) => onRotationChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--green) 0%, var(--green) ${
              ((rotationAge - 40) / 80) * 100
            }%, var(--bg3) ${((rotationAge - 40) / 80) * 100}%, var(--bg3) 100%)`,
          }}
        />
        <div className="flex justify-between text-[9px] text-[var(--text3)] mt-0.5">
          <span>40</span>
          <span>80</span>
          <span>120</span>
        </div>
      </div>

      {/* Metrics at selected rotation */}
      {current && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
            <p className="text-[10px] text-[var(--text3)]">
              {t('growth.rotation.harvestVolume')}
            </p>
            <p className="text-lg font-mono font-semibold text-[var(--text)]">
              {Math.round(current.volume)}
            </p>
            <p className="text-[9px] text-[var(--text3)]">m³sk/ha</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
            <p className="text-[10px] text-[var(--text3)]">MAI</p>
            <p className="text-lg font-mono font-semibold text-[var(--text)]">
              {current.mai.toFixed(1)}
            </p>
            <p className="text-[9px] text-[var(--text3)]">m³sk/ha/{t('growth.units.year')}</p>
          </div>
          <div className="rounded-lg border border-[var(--border)] p-2.5 text-center">
            <p className="text-[10px] text-[var(--text3)]">NPV</p>
            <p className="text-sm font-mono font-semibold text-[var(--green)]">
              {formatSEK(current[npvKey])}
            </p>
            <p className="text-[9px] text-[var(--text3)]">@{selectedRate}%</p>
          </div>
        </div>
      )}

      {/* Discount rate selector */}
      <div className="mb-4">
        <p className="text-[10px] text-[var(--text3)] mb-1.5">
          {t('growth.rotation.discountRate')}
        </p>
        <div className="flex gap-1">
          {(['2.5', '3.5', '4.5'] as const).map((rate) => (
            <button
              key={rate}
              onClick={() => setSelectedRate(rate)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-mono font-medium transition-colors ${
                selectedRate === rate
                  ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                  : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)] hover:text-[var(--text2)]'
              }`}
            >
              {rate}%
            </button>
          ))}
        </div>
      </div>

      {/* NPV mini-chart */}
      <div className="mb-4">
        <p className="text-[10px] text-[var(--text3)] mb-1.5">
          {t('growth.rotation.npvCurve')}
        </p>
        <div className="relative h-12 rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--bg)]">
          <svg viewBox={`0 0 ${analyses.length} 48`} className="w-full h-full" preserveAspectRatio="none">
            {/* NPV line */}
            <path
              d={analyses
                .map((a, i) => {
                  const y = 44 - ((a[npvKey] - minNPV) / npvRange) * 40;
                  return `${i === 0 ? 'M' : 'L'} ${i} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#4ade80"
              strokeWidth={0.8}
            />
            {/* Selected position */}
            {current && (
              <circle
                cx={rotationAge - 40}
                cy={44 - ((current[npvKey] - minNPV) / npvRange) * 40}
                r={1.5}
                fill="#4ade80"
              />
            )}
            {/* Optimal marker */}
            {optimal && (
              <line
                x1={optimal.rotationAge - 40}
                y1={0}
                x2={optimal.rotationAge - 40}
                y2={48}
                stroke="#4ade80"
                strokeWidth={0.5}
                strokeDasharray="2 2"
                opacity={0.5}
              />
            )}
          </svg>
        </div>
      </div>

      {/* Optimal comparison */}
      {optimal && current && (
        <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Target size={12} className="text-[var(--green)]" />
            <span className="text-[10px] font-semibold text-[var(--green)]">
              {t('growth.rotation.optimalAge')}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="text-center">
              <p className="text-[10px] text-[var(--text3)]">{t('growth.rotation.yourPlan')}</p>
              <p className="font-mono font-semibold text-[var(--text)]">{rotationAge} {t('growth.units.yr')}</p>
              <p className="text-[9px] text-[var(--text3)] font-mono">{formatSEK(current[npvKey])}</p>
            </div>
            <ArrowRight size={14} className="text-[var(--text3)]" />
            <div className="text-center">
              <p className="text-[10px] text-[var(--text3)]">{t('growth.rotation.climateOptimal')}</p>
              <p className="font-mono font-semibold text-[var(--green)]">{optimal.rotationAge} {t('growth.units.yr')}</p>
              <p className="text-[9px] text-[var(--green)] font-mono">{formatSEK(optimal[npvKey])}</p>
            </div>

            {optimal[npvKey] > current[npvKey] && (
              <div className="flex items-center gap-1 ml-auto bg-[var(--green)]/10 text-[var(--green)] px-2 py-1 rounded-full">
                <TrendingUp size={10} />
                <span className="text-[10px] font-mono">
                  +{formatSEK(optimal[npvKey] - current[npvKey])}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
