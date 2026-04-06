import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Banknote, TrendingUp, Info, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';
import { formatSEK } from '@/services/timberPriceService';
import { useTimberValue } from '@/hooks/useTimberValue';
import { ValueAtRisk } from './ValueAtRisk';
import { ScenarioSlider } from './ScenarioSlider';

interface TimberValueEstimatorProps {
  onOpenCompanion?: () => void;
}

/**
 * Animated count-up hook. Increments from 0 to the target value over
 * a given duration, using requestAnimationFrame for smoothness.
 */
function useCountUp(target: number, duration: number = 1200, enabled: boolean = true): number {
  const [value, setValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled || target <= 0) {
      setValue(target);
      return;
    }

    startTimeRef.current = null;
    setValue(0);

    function animate(timestamp: number) {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, enabled]);

  return value;
}

/**
 * TimberValueEstimator — prominent dashboard card showing the estimated
 * standing timber value of the user's forest holdings in Swedish kronor.
 *
 * Features:
 *  - Animated count-up of total value on mount
 *  - Species breakdown table with volumes, sawlog/pulp ratios, and values
 *  - Value at Risk section for detected threats
 *  - Trend indicator (change since last assessment)
 *  - Interactive damage scenario slider
 *  - Disclaimer about estimate methodology
 */
export function TimberValueEstimator({ onOpenCompanion }: TimberValueEstimatorProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const {
    totalValue,
    speciesBreakdown,
    valueAtRisk,
    valueAtRiskDescription,
    trend,
    priceDate: _priceDate,
    isLoading,
  } = useTimberValue();

  const displayValue = useCountUp(totalValue, 1200, !isLoading);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-32 rounded bg-[var(--bg3)] mb-3" />
        <div className="h-8 w-48 rounded bg-[var(--bg3)] mb-2" />
        <div className="h-3 w-40 rounded bg-[var(--bg3)]" />
      </div>
    );
  }

  const isSv = i18n.language === 'sv';

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header / Primary Value */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--green)' }}
            >
              <Banknote size={18} />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-[var(--text)]">
                {t('timberValue.title')}
              </h3>
              <p className="text-[10px] text-[var(--text3)]">
                {t('timberValue.standingTimber')}
              </p>
            </div>
          </div>

          {/* Trend badge */}
          {trend.changePercent !== 0 && (
            <div className="flex items-center gap-1 bg-[var(--green)]/10 text-[var(--green)] px-2 py-0.5 rounded-full">
              <TrendingUp size={10} />
              <span className="text-[10px] font-mono">
                +{trend.changePercent}%
              </span>
            </div>
          )}
        </div>

        {/* Big number */}
        <p className="text-3xl font-semibold font-mono text-[var(--text)] mt-3 tracking-tight">
          {formatSEK(displayValue)}
        </p>

        {/* Trend detail */}
        {trend.changeAbsolute > 0 && (
          <p className="text-[10px] text-[var(--text3)] mt-1">
            {t('timberValue.trendSince')}: <span className="text-[var(--green)] font-mono">+{formatSEK(trend.changeAbsolute)}</span>
          </p>
        )}

        {/* Value at Risk */}
        <ValueAtRisk
          totalValue={totalValue}
          valueAtRisk={valueAtRisk}
          descriptionKey={valueAtRiskDescription as 'plotB' | 'general'}
          onAskAi={onOpenCompanion}
        />

        {/* Expand/collapse toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-[10px] text-[var(--green)] hover:text-[var(--green2)] transition-colors"
          aria-expanded={expanded}
          aria-controls="timber-value-details"
        >
          {expanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          {expanded ? t('timberValue.hideDetails') : t('timberValue.showDetails')}
        </button>
      </div>

      {/* Action link */}
      <div className="px-4 pb-3">
        <Link
          to="/owner/timber-sale"
          className="flex items-center justify-between w-full p-2.5 rounded-lg border border-[var(--border)] hover:bg-[var(--green)]/5 transition-colors"
        >
          <span className="text-xs font-medium text-[var(--green)]">Start a timber sale</span>
          <ChevronRight size={14} className="text-[var(--green)]" />
        </Link>
      </div>

      {/* Expanded: Species Breakdown + Scenario Slider */}
      {expanded && (
        <div id="timber-value-details" className="border-t border-[var(--border)] p-4">
          {/* Species breakdown table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[var(--text3)] uppercase tracking-wider">
                  <th className="text-left pb-2 font-medium">{t('timberValue.species')}</th>
                  <th className="text-right pb-2 font-medium">{t('timberValue.volumeUnit')}</th>
                  <th className="text-right pb-2 font-medium">{t('timberValue.sawlog')}</th>
                  <th className="text-right pb-2 font-medium">{t('timberValue.pulpwood')}</th>
                  <th className="text-right pb-2 font-medium">{t('timberValue.estValue')}</th>
                </tr>
              </thead>
              <tbody className="text-[var(--text2)]">
                {speciesBreakdown.map((entry) => (
                  <tr key={entry.species} className="border-t border-[var(--border)]">
                    <td className="py-2 font-medium text-[var(--text)]">
                      {isSv ? entry.nameSv : entry.nameEn}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {new Intl.NumberFormat('sv-SE').format(entry.volumeM3sk)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {Math.round(entry.sawlogRatio * 100)}%
                    </td>
                    <td className="py-2 text-right font-mono">
                      {Math.round(entry.pulpRatio * 100)}%
                    </td>
                    <td className="py-2 text-right font-mono text-[var(--text)]">
                      {formatSEK(entry.totalValue)}
                    </td>
                  </tr>
                ))}
                {/* Total row */}
                <tr className="border-t border-[var(--border2)]">
                  <td className="py-2 font-semibold text-[var(--text)]" colSpan={4}>
                    {t('timberValue.total')}
                  </td>
                  <td className="py-2 text-right font-mono font-semibold text-[var(--green)]">
                    {formatSEK(totalValue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Scenario slider */}
          <ScenarioSlider
            speciesBreakdown={speciesBreakdown}
            totalValue={totalValue}
          />

          {/* Disclaimer */}
          <div className="flex items-start gap-1.5 mt-3 pt-3 border-t border-[var(--border)]">
            <Info size={11} className="text-[var(--text3)] mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-[var(--text3)] leading-relaxed">
              {t('timberValue.disclaimer')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
