/**
 * StrategyComparison — Side-by-side comparison table for 4 forestry strategies
 * with adjustable priority weights and a "best for you" recommendation.
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, ChevronDown, ChevronUp } from 'lucide-react';
import {
  type StrategyResult,
  STRATEGY_COLORS,
  formatKr,
} from '@/services/longRotationService';

interface Props {
  strategies: StrategyResult[];
}

interface PriorityWeights {
  income: number;      // 0-100
  carbon: number;      // 0-100
  biodiversity: number; // 0-100
}

const RISK_LABELS = ['', 'Very Low', 'Low', 'Medium', 'High', 'Very High'];
const RISK_LABELS_SV = ['', 'Mycket l\u00e5g', 'L\u00e5g', 'Medel', 'H\u00f6g', 'Mycket h\u00f6g'];
const COMPLEXITY_LABELS = ['', 'Minimal', 'Low', 'Moderate', 'High', 'Expert'];
const COMPLEXITY_LABELS_SV = ['', 'Minimal', 'L\u00e5g', 'M\u00e5ttlig', 'H\u00f6g', 'Expert'];

function ScoreBar({ value, max = 5, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className="w-2.5 h-2.5 rounded-sm"
          style={{
            background: i < value ? color : 'var(--bg3)',
            opacity: i < value ? 0.9 : 0.3,
          }}
        />
      ))}
    </div>
  );
}

export function StrategyComparison({ strategies }: Props) {
  const { t, i18n } = useTranslation();
  const isSv = i18n.language === 'sv';
  const [weights, setWeights] = useState<PriorityWeights>({
    income: 50,
    carbon: 30,
    biodiversity: 20,
  });
  const [showWeights, setShowWeights] = useState(false);

  // Score each strategy based on weights
  const scored = useMemo(() => {
    const maxNPV = Math.max(...strategies.map(s => s.totalNPV));
    const maxCO2 = Math.max(...strategies.map(s => s.endCO2Stored));
    const maxBio = Math.max(...strategies.map(s => s.biodiversityScore));
    const totalWeight = weights.income + weights.carbon + weights.biodiversity;

    return strategies.map(s => {
      const incomeScore = maxNPV > 0 ? (s.totalNPV / maxNPV) * 100 : 0;
      const carbonScore = maxCO2 > 0 ? (s.endCO2Stored / maxCO2) * 100 : 0;
      const bioScore = maxBio > 0 ? (s.biodiversityScore / maxBio) * 100 : 0;

      const weighted = totalWeight > 0
        ? (incomeScore * weights.income + carbonScore * weights.carbon + bioScore * weights.biodiversity) / totalWeight
        : 0;

      return { ...s, weightedScore: weighted };
    }).sort((a, b) => b.weightedScore - a.weightedScore);
  }, [strategies, weights]);

  const bestId = scored[0]?.id;

  return (
    <div>
      {/* Priority weights accordion */}
      <button
        onClick={() => setShowWeights(!showWeights)}
        className="flex items-center gap-2 mb-3 text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] transition-colors"
      >
        {showWeights ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {t('rotation.comparison.adjustPriorities')}
      </button>

      {showWeights && (
        <div className="p-3 rounded-lg border border-[var(--border)] mb-4" style={{ background: 'var(--bg)' }}>
          <div className="space-y-3">
            {(['income', 'carbon', 'biodiversity'] as const).map(key => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-medium text-[var(--text2)]">
                    {t(`rotation.comparison.weight.${key}`)}
                  </label>
                  <span className="text-[10px] font-mono text-[var(--text3)]">{weights[key]}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={weights[key]}
                  onChange={e => setWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                  className="w-full h-1.5 rounded-full appearance-none bg-[var(--bg3)] accent-[var(--green)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-2 px-2 text-[var(--text3)] font-medium w-32" />
              {scored.map(s => (
                <th
                  key={s.id}
                  className="py-2 px-3 text-center font-semibold relative"
                  style={{ color: STRATEGY_COLORS[s.id] }}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {s.id === bestId && (
                      <Crown size={12} className="text-[var(--amber)]" />
                    )}
                    <span>{isSv ? s.labelSv : s.label}</span>
                  </div>
                  {s.id === bestId && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[8px] font-mono text-[var(--amber)] bg-[var(--amber)]/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                      {t('rotation.comparison.bestForYou')}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {/* NPV */}
            <tr className="hover:bg-[var(--bg3)]/50">
              <td className="py-2.5 px-2 text-[var(--text2)] font-medium">{t('rotation.comparison.npv')}</td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3 text-center font-mono font-semibold text-[var(--text)]">
                  {formatKr(s.totalNPV)}
                </td>
              ))}
            </tr>

            {/* IRR */}
            <tr className="hover:bg-[var(--bg3)]/50">
              <td className="py-2.5 px-2 text-[var(--text2)] font-medium">{t('rotation.comparison.irr')}</td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3 text-center font-mono text-[var(--text)]">
                  {s.irr.toFixed(1)}%
                </td>
              ))}
            </tr>

            {/* Total harvest volume */}
            <tr className="hover:bg-[var(--bg3)]/50">
              <td className="py-2.5 px-2 text-[var(--text2)] font-medium">{t('rotation.comparison.harvestVolume')}</td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3 text-center font-mono text-[var(--text)]">
                  {new Intl.NumberFormat('sv-SE').format(s.totalHarvestVolume)} m&sup3;
                </td>
              ))}
            </tr>

            {/* CO2 stored */}
            <tr className="hover:bg-[var(--bg3)]/50">
              <td className="py-2.5 px-2 text-[var(--text2)] font-medium">{t('rotation.comparison.carbonStored')}</td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3 text-center font-mono text-[var(--text)]">
                  {new Intl.NumberFormat('sv-SE').format(s.endCO2Stored)} t
                </td>
              ))}
            </tr>

            {/* Biodiversity */}
            <tr className="hover:bg-[var(--bg3)]/50">
              <td className="py-2.5 px-2 text-[var(--text2)] font-medium">{t('rotation.comparison.biodiversity')}</td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3">
                  <div className="flex justify-center">
                    <ScoreBar value={s.biodiversityScore} color={STRATEGY_COLORS[s.id]} />
                  </div>
                </td>
              ))}
            </tr>

            {/* Management complexity */}
            <tr className="hover:bg-[var(--bg3)]/50">
              <td className="py-2.5 px-2 text-[var(--text2)] font-medium">{t('rotation.comparison.complexity')}</td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3 text-center">
                  <span className="text-[10px] text-[var(--text2)]">
                    {isSv ? COMPLEXITY_LABELS_SV[s.managementComplexity] : COMPLEXITY_LABELS[s.managementComplexity]}
                  </span>
                </td>
              ))}
            </tr>

            {/* Risk level */}
            <tr className="hover:bg-[var(--bg3)]/50">
              <td className="py-2.5 px-2 text-[var(--text2)] font-medium">{t('rotation.comparison.risk')}</td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3 text-center">
                  <span className={`text-[10px] ${
                    s.riskLevel >= 4 ? 'text-red-400' :
                    s.riskLevel >= 3 ? 'text-[var(--amber)]' : 'text-[var(--green)]'
                  }`}>
                    {isSv ? RISK_LABELS_SV[s.riskLevel] : RISK_LABELS[s.riskLevel]}
                  </span>
                </td>
              ))}
            </tr>

            {/* Weighted score */}
            <tr className="bg-[var(--bg3)]/30">
              <td className="py-2.5 px-2 text-[var(--green)] font-semibold">
                {t('rotation.comparison.score')}
              </td>
              {scored.map(s => (
                <td key={s.id} className="py-2.5 px-3 text-center">
                  <span className="text-sm font-mono font-bold" style={{ color: STRATEGY_COLORS[s.id] }}>
                    {Math.round(s.weightedScore)}
                  </span>
                  <span className="text-[10px] text-[var(--text3)]"> / 100</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Strategy descriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {scored.map(s => (
          <div
            key={s.id}
            className={`p-3 rounded-lg border transition-colors ${
              s.id === bestId
                ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                : 'border-[var(--border)]'
            }`}
            style={{ background: s.id === bestId ? undefined : 'var(--bg)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: STRATEGY_COLORS[s.id] }} />
              <span className="text-xs font-semibold" style={{ color: STRATEGY_COLORS[s.id] }}>
                {isSv ? s.labelSv : s.label}
              </span>
            </div>
            <p className="text-[10px] text-[var(--text3)] leading-relaxed">
              {isSv ? s.descriptionSv : s.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
