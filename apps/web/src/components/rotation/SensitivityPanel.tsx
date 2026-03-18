/**
 * SensitivityPanel — Interactive sensitivity analysis with sliders,
 * tornado chart, and break-even analysis.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Sliders, Info } from 'lucide-react';
import {
  type StandParams,
  type StrategyId,
  type RevenueStreamConfig,
  type SensitivityParams,
  type SensitivityResult,
  runSensitivityAnalysis,
  calculateBreakEvens,
  formatKr,
} from '@/services/longRotationService';

interface Props {
  stand: StandParams;
  strategy: StrategyId;
  streams: RevenueStreamConfig;
  sensitivity: SensitivityParams;
  onSensitivityChange: (s: SensitivityParams) => void;
}

const TORNADO_WIDTH = 600;
const TORNADO_HEIGHT = 160;
const PADDING = { top: 15, right: 20, bottom: 25, left: 100 };

function TornadoChart({ results, isSv }: { results: SensitivityResult[]; isSv: boolean }) {
  const innerW = TORNADO_WIDTH - PADDING.left - PADDING.right;
  const innerH = TORNADO_HEIGHT - PADDING.top - PADDING.bottom;
  const barH = Math.min(30, innerH / results.length - 4);

  // Find global min/max
  const allValues = results.flatMap(r => [r.lowNPV, r.highNPV, r.baseNPV]);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;

  const xScale = (v: number) => PADDING.left + ((v - min) / range) * innerW;

  return (
    <svg viewBox={`0 0 ${TORNADO_WIDTH} ${TORNADO_HEIGHT}`} className="w-full" style={{ minWidth: 400 }}>
      {/* Base line */}
      {results.length > 0 && (
        <line
          x1={xScale(results[0].baseNPV)}
          x2={xScale(results[0].baseNPV)}
          y1={PADDING.top - 5}
          y2={TORNADO_HEIGHT - PADDING.bottom + 5}
          stroke="var(--text3)"
          strokeWidth={1}
          strokeDasharray="4,2"
        />
      )}

      {results.map((r, i) => {
        const y = PADDING.top + i * (barH + 8);
        const xLow = xScale(r.lowNPV);
        const xHigh = xScale(r.highNPV);
        const xBase = xScale(r.baseNPV);

        return (
          <g key={r.variable}>
            {/* Label */}
            <text
              x={PADDING.left - 6}
              y={y + barH / 2 + 4}
              textAnchor="end"
              fill="var(--text2)"
              fontSize={10}
            >
              {isSv ? r.variableSv : r.variable}
            </text>

            {/* Low bar (left of base) */}
            <rect
              x={Math.min(xLow, xBase)}
              y={y}
              width={Math.abs(xBase - xLow)}
              height={barH}
              fill="#ef4444"
              opacity={0.6}
              rx={2}
            />

            {/* High bar (right of base) */}
            <rect
              x={Math.min(xBase, xHigh)}
              y={y}
              width={Math.abs(xHigh - xBase)}
              height={barH}
              fill="#4ade80"
              opacity={0.6}
              rx={2}
            />

            {/* Low value label */}
            <text
              x={xLow - 4}
              y={y + barH / 2 + 3}
              textAnchor="end"
              fill="var(--text3)"
              fontSize={8}
              fontFamily="monospace"
            >
              {formatKr(r.lowNPV)}
            </text>

            {/* High value label */}
            <text
              x={xHigh + 4}
              y={y + barH / 2 + 3}
              textAnchor="start"
              fill="var(--text3)"
              fontSize={8}
              fontFamily="monospace"
            >
              {formatKr(r.highNPV)}
            </text>

            {/* Impact label */}
            <text
              x={TORNADO_WIDTH - 5}
              y={y + barH / 2 + 3}
              textAnchor="end"
              fill="var(--text)"
              fontSize={9}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {'\u0394'} {formatKr(r.impact)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function SensitivityPanel({ stand, strategy, streams, sensitivity, onSensitivityChange }: Props) {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';

  const sensitivityResults = useMemo(
    () => runSensitivityAnalysis(stand, strategy, streams, sensitivity),
    [stand, strategy, streams, sensitivity]
  );

  const breakEvens = useMemo(
    () => calculateBreakEvens(stand, streams, sensitivity),
    [stand, streams, sensitivity]
  );

  return (
    <div className="space-y-5">
      {/* Interactive sliders */}
      <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Sliders size={14} className="text-[var(--green)]" />
          <h4 className="text-xs font-semibold text-[var(--text)]">
            {t('rotation.sensitivity.sliders')}
          </h4>
        </div>

        <div className="space-y-4">
          {/* Timber price slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-[var(--text2)]">
                {t('rotation.sensitivity.timberPrice')}
              </label>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {sensitivity.timberPriceFactor > 1 ? '+' : ''}{Math.round((sensitivity.timberPriceFactor - 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={60}
              max={140}
              value={Math.round(sensitivity.timberPriceFactor * 100)}
              onChange={e => onSensitivityChange({
                ...sensitivity,
                timberPriceFactor: Number(e.target.value) / 100,
              })}
              className="w-full h-1.5 rounded-full appearance-none bg-[var(--bg3)] accent-[var(--green)]"
            />
            <div className="flex justify-between text-[8px] text-[var(--text3)] mt-0.5">
              <span>-40%</span>
              <span>0</span>
              <span>+40%</span>
            </div>
          </div>

          {/* Carbon price slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-[var(--text2)]">
                {t('rotation.sensitivity.carbonPrice')}
              </label>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {sensitivity.carbonPriceFactor > 1 ? '+' : ''}{Math.round((sensitivity.carbonPriceFactor - 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={200}
              value={Math.round(sensitivity.carbonPriceFactor * 100)}
              onChange={e => onSensitivityChange({
                ...sensitivity,
                carbonPriceFactor: Number(e.target.value) / 100,
              })}
              className="w-full h-1.5 rounded-full appearance-none bg-[var(--bg3)] accent-[var(--green)]"
            />
            <div className="flex justify-between text-[8px] text-[var(--text3)] mt-0.5">
              <span>-70%</span>
              <span>0</span>
              <span>+100%</span>
            </div>
          </div>

          {/* Discount rate slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-medium text-[var(--text2)]">
                {t('rotation.sensitivity.discountRate')}
              </label>
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {(sensitivity.discountRate * 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={Math.round(sensitivity.discountRate * 1000)}
              onChange={e => onSensitivityChange({
                ...sensitivity,
                discountRate: Number(e.target.value) / 1000,
              })}
              className="w-full h-1.5 rounded-full appearance-none bg-[var(--bg3)] accent-[var(--green)]"
            />
            <div className="flex justify-between text-[8px] text-[var(--text3)] mt-0.5">
              <span>0.5%</span>
              <span>3%</span>
              <span>6%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tornado chart */}
      <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <h4 className="text-xs font-semibold text-[var(--text)] mb-3">
          {t('rotation.sensitivity.tornadoTitle')}
        </h4>
        <p className="text-[10px] text-[var(--text3)] mb-3">
          {t('rotation.sensitivity.tornadoDesc')}
        </p>
        <div className="overflow-x-auto">
          <TornadoChart results={sensitivityResults} isSv={isSv} />
        </div>
        {sensitivityResults.length > 0 && (
          <p className="text-[10px] text-[var(--text2)] mt-2">
            {t('rotation.sensitivity.mostImpact', {
              variable: isSv ? sensitivityResults[0].variableSv : sensitivityResults[0].variable,
              impact: formatKr(sensitivityResults[0].impact),
            })}
          </p>
        )}
      </div>

      {/* Break-even analysis */}
      {breakEvens.length > 0 && (
        <div className="p-4 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <h4 className="text-xs font-semibold text-[var(--text)] mb-3">
            {t('rotation.sensitivity.breakEvenTitle')}
          </h4>
          <div className="space-y-2">
            {breakEvens.map((be, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--bg2)]">
                <Info size={12} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-[var(--text2)] leading-relaxed">
                    {isSv ? be.labelSv : be.label}
                  </p>
                  <p className="text-xs font-mono font-semibold text-[var(--green)] mt-1">
                    {be.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
