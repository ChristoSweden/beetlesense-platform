import { useTranslation } from 'react-i18next';
import {
  BrainCircuit,
  RotateCcw,
  Save,
  History,
  Sparkles,
  BarChart3,
  TrendingUp,
  TreePine,
  Eye,
} from 'lucide-react';
import { useAdvisor, type AdvisorTab } from '@/hooks/useAdvisor';
import { DecisionSelector } from '@/components/advisor/DecisionSelector';
import { AnalysisPanel } from '@/components/advisor/AnalysisPanel';
import { NPVComparison } from '@/components/advisor/NPVComparison';
import { CitationPanel } from '@/components/advisor/CitationPanel';
import { DecisionLog } from '@/components/advisor/DecisionLog';
import { FiduciaryBadge } from '@/components/advisor/FiduciaryBadge';
import { ScenarioSimulator } from '@/components/advisor/ScenarioSimulator';
import { MarketAdvisor } from '@/components/advisor/MarketAdvisor';
import { HarvestDecisionEngine } from '@/components/advisor/HarvestDecisionEngine';
import { OwnerInsights } from '@/components/advisor/OwnerInsights';

export default function AdvisorPage() {
  const { t } = useTranslation();
  const {
    selectedDecision,
    selectedStand,
    customQuestion,
    analysis,
    isAnalyzing,
    decisionLog,
    stands,
    activeTab,
    selectDecision,
    selectStand,
    setCustomQuestion,
    runAnalysis,
    clearAnalysis,
    saveCurrentDecision,
    updateDecisionOutcome,
    removeDecision,
    setActiveTab,
  } = useAdvisor();

  const TABS: { id: AdvisorTab; icon: typeof Sparkles; label: string }[] = [
    { id: 'analyze', icon: Sparkles, label: t('advisor.newAnalysis') },
    { id: 'scenarios', icon: BarChart3, label: 'Scenarion' },
    { id: 'market', icon: TrendingUp, label: 'Marknad' },
    { id: 'harvest', icon: TreePine, label: 'Avverkning' },
    { id: 'insights', icon: Eye, label: 'Insikter' },
    { id: 'log', icon: History, label: t('advisor.decisionLog') },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        {/* Page header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(74, 222, 128, 0.1)', color: 'var(--green)' }}
            >
              <BrainCircuit size={22} />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('advisor.pageTitle')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('advisor.pageSubtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Fiduciary badge */}
        <div className="mb-6">
          <FiduciaryBadge variant="banner" lang="sv" />
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-lg bg-[var(--bg2)] border border-[var(--border)] overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-[var(--green)]/10 text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text)]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {tab.id === 'log' && decisionLog.length > 0 && (
                  <span className="text-[9px] font-mono bg-[var(--bg3)] px-1.5 py-0.5 rounded-full">
                    {decisionLog.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Analyze tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-8">
            {/* Decision selector */}
            <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
              <DecisionSelector
                selectedDecision={selectedDecision}
                selectedStand={selectedStand}
                stands={stands}
                customQuestion={customQuestion}
                onSelectDecision={selectDecision}
                onSelectStand={selectStand}
                onCustomQuestionChange={setCustomQuestion}
                onAnalyze={runAnalysis}
                isAnalyzing={isAnalyzing}
              />
            </div>

            {/* Loading state */}
            {isAnalyzing && (
              <div className="rounded-xl border border-[var(--border)] p-8" style={{ background: 'var(--bg2)' }}>
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--text)]">
                      {t('advisor.analyzingStand')}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-1">
                      {t('advisor.analyzingDesc')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analysis results */}
            {analysis && !isAnalyzing && (
              <>
                {/* Action bar */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveCurrentDecision}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)]/10 text-[var(--green)] text-xs font-medium hover:bg-[var(--green)]/20 transition-colors"
                  >
                    <Save size={14} />
                    {t('advisor.saveDecision')}
                  </button>
                  <button
                    onClick={clearAnalysis}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text3)] text-xs font-medium hover:bg-[var(--bg3)] transition-colors"
                  >
                    <RotateCcw size={14} />
                    {t('advisor.newQuestion')}
                  </button>
                </div>

                {/* Analysis panel */}
                <AnalysisPanel analysis={analysis} />

                {/* NPV Comparison */}
                <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
                  <NPVComparison analysis={analysis} />
                </div>

                {/* Citations */}
                <CitationPanel citations={analysis.citations} />
              </>
            )}
          </div>
        )}

        {/* Scenario Simulator tab */}
        {activeTab === 'scenarios' && (
          <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
            <ScenarioSimulator />
          </div>
        )}

        {/* Market Advisor tab */}
        {activeTab === 'market' && (
          <MarketAdvisor />
        )}

        {/* Harvest Decision Engine tab */}
        {activeTab === 'harvest' && (
          <HarvestDecisionEngine />
        )}

        {/* Owner Insights tab */}
        {activeTab === 'insights' && (
          <OwnerInsights />
        )}

        {/* Decision Log tab */}
        {activeTab === 'log' && (
          <DecisionLog
            decisions={decisionLog}
            onUpdateOutcome={updateDecisionOutcome}
            onRemove={removeDecision}
          />
        )}
      </div>
    </div>
  );
}
