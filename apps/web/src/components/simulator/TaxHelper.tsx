import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, ChevronDown, ChevronUp, Landmark, PiggyBank } from 'lucide-react';
import { formatSEK } from '@/services/timberPriceService';
import type { TaxEstimate } from '@/services/operationCostCalculator';

interface TaxHelperProps {
  netBeforeTax: number;
  tax: TaxEstimate;
  skogskontoPercent: number;
  onSkogskontoChange: (percent: number) => void;
}

/**
 * TaxHelper — Simplified Swedish forest tax explainer.
 * Provides a skogskonto allocation slider and shows tax impact.
 */
export function TaxHelper({
  netBeforeTax,
  tax,
  skogskontoPercent,
  onSkogskontoChange,
}: TaxHelperProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (netBeforeTax <= 0) return null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(234, 179, 8, 0.1)', color: 'var(--yellow, #eab308)' }}
          >
            <Landmark size={16} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">
              {t('simulator.tax.title')}
            </h3>
            <p className="text-[10px] text-[var(--text3)]">
              {t('simulator.tax.subtitle')}
            </p>
          </div>
        </div>

        {/* Skogskonto Slider */}
        <div
          className="rounded-lg border border-[var(--border)] p-3"
          style={{ background: 'var(--bg)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank size={13} className="text-[var(--text3)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
              {t('simulator.tax.skogskontoTitle')}
            </p>
          </div>

          <p className="text-xs text-[var(--text2)] mb-3">
            {t('simulator.tax.skogskontoDesc')}
          </p>

          {/* Slider */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text3)]">
                {t('simulator.tax.allocate')}
              </span>
              <span className="text-xs font-mono font-semibold text-[var(--text)]">
                {skogskontoPercent}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={skogskontoPercent}
              onChange={(e) => onSkogskontoChange(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-[var(--green)]
                [&::-webkit-slider-thumb]:bg-[var(--bg2)]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(74,222,128,0.4)]
                [&::-moz-range-thumb]:w-4
                [&::-moz-range-thumb]:h-4
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:border-2
                [&::-moz-range-thumb]:border-[var(--green)]
                [&::-moz-range-thumb]:bg-[var(--bg2)]
                [&::-moz-range-thumb]:cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--green) 0%, var(--green) ${(skogskontoPercent / 60) * 100}%, var(--bg3) ${(skogskontoPercent / 60) * 100}%, var(--bg3) 100%)`,
              }}
              aria-label={t('simulator.tax.skogskontoSliderLabel')}
              aria-valuetext={`${skogskontoPercent}% to skogskonto`}
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[10px] text-[var(--text3)]">0%</span>
              <span className="text-[10px] text-[var(--text3)]">60% max</span>
            </div>
          </div>

          {/* Impact numbers */}
          <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-[var(--border)]">
            <div>
              <p className="text-[10px] text-[var(--text3)]">
                {t('simulator.tax.deferredAmount')}
              </p>
              <p className="text-sm font-mono font-semibold text-[var(--text)]">
                {formatSEK(tax.skogskontoDeposit)}
              </p>
              <p className="text-[9px] text-[var(--text3)]">
                {t('simulator.tax.maxAllowed')}: {formatSEK(tax.skogskontoMax)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)]">
                {t('simulator.tax.taxSaved')}
              </p>
              <p className="text-sm font-mono font-semibold text-[var(--green)]">
                {tax.taxSavedBySkogskonto > 0 ? '+' : ''}{formatSEK(tax.taxSavedBySkogskonto)}
              </p>
              <p className="text-[9px] text-[var(--text3)]">
                {t('simulator.tax.deferredNotRemoved')}
              </p>
            </div>
          </div>
        </div>

        {/* Rantefordelning summary */}
        {tax.rantefordelning > 0 && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg)' }}>
            <Info size={13} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[var(--text2)]">
                {t('simulator.tax.rantefordelningNote', {
                  amount: formatSEK(tax.rantefordelning),
                  saved: formatSEK(tax.taxSavedByRantefordelning),
                })}
              </p>
            </div>
          </div>
        )}

        {/* Tax summary row */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-[var(--text3)]">{t('simulator.tax.totalTax')}</p>
            <p className="text-lg font-mono font-bold" style={{ color: 'var(--yellow, #eab308)' }}>
              {formatSEK(tax.incomeTax)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[var(--text3)]">{t('simulator.tax.effectiveRate')}</p>
            <p className="text-lg font-mono font-bold text-[var(--text)]">
              {(tax.effectiveRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Expand explainer */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-[10px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? t('simulator.tax.hideExplainer') : t('simulator.tax.showExplainer')}
        </button>
      </div>

      {/* Expanded: Tax explainer */}
      {expanded && (
        <div className="border-t border-[var(--border)] p-4 space-y-3">
          <div>
            <p className="text-xs font-semibold text-[var(--text)] mb-1">
              {t('simulator.tax.explainer.skogskontoTitle')}
            </p>
            <p className="text-[11px] text-[var(--text2)] leading-relaxed">
              {t('simulator.tax.explainer.skogskontoBody')}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text)] mb-1">
              {t('simulator.tax.explainer.rantefordelningTitle')}
            </p>
            <p className="text-[11px] text-[var(--text2)] leading-relaxed">
              {t('simulator.tax.explainer.rantefordelningBody')}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text)] mb-1">
              {t('simulator.tax.explainer.marginalTitle')}
            </p>
            <p className="text-[11px] text-[var(--text2)] leading-relaxed">
              {t('simulator.tax.explainer.marginalBody')}
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="border-t border-[var(--border)] px-4 py-3">
        <div className="flex items-start gap-1.5">
          <Info size={11} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
          <p className="text-[9px] text-[var(--text3)] leading-relaxed">
            {t('simulator.tax.disclaimer')}
          </p>
        </div>
      </div>
    </div>
  );
}
