import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import { formatSEK, type TimberSpecies } from '@/services/timberPriceService';
import { applyDamageScenario } from '@/hooks/useTimberValue';
import type { SpeciesValuation } from '@/services/timberPriceService';

interface ScenarioSliderProps {
  speciesBreakdown: SpeciesValuation[];
  totalValue: number;
  targetSpecies?: TimberSpecies;
}

/**
 * Interactive slider letting forest owners explore "what if X% of your spruce
 * is damaged?" scenarios. The estimated value updates in real-time as the
 * slider moves, showing the financial impact of inaction.
 */
export function ScenarioSlider({
  speciesBreakdown,
  totalValue: _totalValue,
  targetSpecies = 'spruce',
}: ScenarioSliderProps) {
  const { t, i18n } = useTranslation();
  const [damagePercent, setDamagePercent] = useState(0);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDamagePercent(Number(e.target.value));
  }, []);

  const { adjustedTotal, lostValue } = applyDamageScenario(
    speciesBreakdown,
    damagePercent,
    targetSpecies,
  );

  const speciesName =
    i18n.language === 'sv'
      ? speciesBreakdown.find((s) => s.species === targetSpecies)?.nameSv ?? targetSpecies
      : speciesBreakdown.find((s) => s.species === targetSpecies)?.nameEn ?? targetSpecies;

  // Don't render if no target species in breakdown
  const hasTarget = speciesBreakdown.some((s) => s.species === targetSpecies);
  if (!hasTarget) return null;

  return (
    <div className="rounded-lg border border-[var(--border)] p-3 mt-3" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-2 mb-2">
        <SlidersHorizontal size={13} className="text-[var(--text3)]" />
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text3)]">
          {t('timberValue.scenarioAnalysis')}
        </p>
      </div>

      <p className="text-xs text-[var(--text2)] mb-3">
        {t('timberValue.scenarioQuestion', { species: speciesName })}
      </p>

      {/* Slider */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={damagePercent}
          onChange={handleChange}
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
            background: `linear-gradient(to right, var(--green) 0%, var(--red) ${damagePercent}%, var(--bg3) ${damagePercent}%, var(--bg3) 100%)`,
          }}
          aria-label={t('timberValue.scenarioSliderLabel')}
          aria-valuetext={`${damagePercent}% damage to ${speciesName}`}
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--text3)]">0%</span>
          <span className="text-xs font-mono font-semibold text-[var(--text)]">
            {damagePercent}%
          </span>
          <span className="text-[10px] text-[var(--text3)]">100%</span>
        </div>
      </div>

      {/* Result */}
      {damagePercent > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--border)]" aria-live="polite" aria-atomic="true">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-[var(--text3)]">
                {t('timberValue.adjustedValue')}
              </p>
              <p className="text-sm font-mono font-semibold text-[var(--text)]">
                {formatSEK(adjustedTotal)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text3)]">
                {t('timberValue.estimatedLoss')}
              </p>
              <p className="text-sm font-mono font-semibold text-[var(--red)]">
                -{formatSEK(lostValue)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
