import { useTranslation } from 'react-i18next';
import {
  TreePine,
  Axe,
  Sprout,
  TreeDeciduous,
  Bug,
  Scissors,
  MessageSquare,
} from 'lucide-react';
import { getDecisionTypes, type DecisionType, type StandData } from '@/services/advisorService';
import type { ReactNode } from 'react';

interface DecisionSelectorProps {
  selectedDecision: DecisionType | null;
  selectedStand: StandData | null;
  stands: StandData[];
  customQuestion: string;
  onSelectDecision: (type: DecisionType) => void;
  onSelectStand: (stand: StandData) => void;
  onCustomQuestionChange: (q: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const DECISION_ICONS: Record<DecisionType, ReactNode> = {
  thinning: <TreePine size={18} />,
  final_felling: <Axe size={18} />,
  regeneration: <Sprout size={18} />,
  continuous_cover: <TreeDeciduous size={18} />,
  beetle_damage: <Bug size={18} />,
  pre_commercial_thinning: <Scissors size={18} />,
  custom: <MessageSquare size={18} />,
};

export function DecisionSelector({
  selectedDecision,
  selectedStand,
  stands,
  customQuestion,
  onSelectDecision,
  onSelectStand,
  onCustomQuestionChange,
  onAnalyze,
  isAnalyzing,
}: DecisionSelectorProps) {
  const { t } = useTranslation();
  const decisionTypes = getDecisionTypes();

  const canAnalyze =
    selectedDecision &&
    selectedStand &&
    (selectedDecision !== 'custom' || customQuestion.trim().length > 5);

  return (
    <div className="space-y-6">
      {/* Decision type selector */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
          {t('advisor.whatDecision')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {decisionTypes.map((dt) => {
            const isSelected = selectedDecision === dt.type;
            return (
              <button
                key={dt.type}
                onClick={() => onSelectDecision(dt.type)}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border text-left transition-all duration-150
                  ${
                    isSelected
                      ? 'border-[var(--green)] bg-[var(--green)]/5'
                      : 'border-[var(--border)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
                  }
                `}
              >
                <div
                  className={`
                    w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5
                    ${isSelected ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'bg-[var(--bg3)] text-[var(--text3)]'}
                  `}
                >
                  {DECISION_ICONS[dt.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-medium ${
                      isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'
                    }`}
                  >
                    {t(dt.labelKey)}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5 leading-relaxed">
                    {t(dt.descriptionKey)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom question input */}
      {selectedDecision === 'custom' && (
        <div>
          <label className="block text-xs font-medium text-[var(--text)] mb-2">
            {t('advisor.customQuestion')}
          </label>
          <textarea
            value={customQuestion}
            onChange={(e) => onCustomQuestionChange(e.target.value)}
            placeholder={t('advisor.customQuestionPlaceholder')}
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] resize-none"
            rows={3}
          />
        </div>
      )}

      {/* Stand selector */}
      {selectedDecision && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
            {t('advisor.selectStand')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {stands.map((stand) => {
              const isSelected = selectedStand?.id === stand.id;
              return (
                <button
                  key={stand.id}
                  onClick={() => onSelectStand(stand)}
                  className={`
                    p-3 rounded-lg border text-left transition-all duration-150
                    ${
                      isSelected
                        ? 'border-[var(--green)] bg-[var(--green)]/5'
                        : 'border-[var(--border)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]'
                    }
                  `}
                >
                  <p
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'
                    }`}
                  >
                    {stand.name}
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="text-[10px] text-[var(--text3)]">
                      {stand.age} {t('advisor.years')} &middot; {t(`advisor.species.${stand.species}`)} &middot; SI {stand.siteIndex}
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {stand.basalArea} m&sup2;/ha &middot; {stand.stemsPerHa} {t('advisor.stemsHa')}
                    </p>
                    <p className="text-[10px] text-[var(--text3)]">
                      {stand.areaHa} ha &middot; {stand.volumeM3sk} m&sup3;sk/ha
                    </p>
                    {stand.beetleRisk > 25 && (
                      <p className="text-[10px] text-[var(--amber)] flex items-center gap-1">
                        <Bug size={10} /> {t('advisor.beetleRisk')}: {stand.beetleRisk}%
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Analyze button */}
      {selectedDecision && (
        <div className="flex items-center gap-3">
          <button
            onClick={onAnalyze}
            disabled={!canAnalyze || isAnalyzing}
            className={`
              px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
              ${
                canAnalyze && !isAnalyzing
                  ? 'bg-[var(--green)] text-[#030d05] hover:brightness-110'
                  : 'bg-[var(--bg3)] text-[var(--text3)] cursor-not-allowed'
              }
            `}
          >
            {isAnalyzing ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                {t('advisor.analyzing')}
              </span>
            ) : (
              t('advisor.runAnalysis')
            )}
          </button>
          {!selectedStand && selectedDecision && (
            <p className="text-[10px] text-[var(--text3)]">{t('advisor.selectStandFirst')}</p>
          )}
        </div>
      )}
    </div>
  );
}
