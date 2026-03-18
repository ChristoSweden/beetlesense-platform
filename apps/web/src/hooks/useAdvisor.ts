import { useState, useCallback, useEffect } from 'react';
import {
  generateAnalysis,
  getDecisionLog,
  saveDecision,
  updateDecision,
  deleteDecision,
  DEMO_STANDS,
  type DecisionType,
  type StandData,
  type AnalysisResult,
  type SavedDecision,
} from '@/services/advisorService';

// ─── Types ───

export type AdvisorTab = 'analyze' | 'log' | 'scenarios' | 'market' | 'harvest' | 'insights';

export interface AdvisorState {
  selectedDecision: DecisionType | null;
  selectedStand: StandData | null;
  customQuestion: string;
  analysis: AnalysisResult | null;
  isAnalyzing: boolean;
  decisionLog: SavedDecision[];
  stands: StandData[];
  activeTab: AdvisorTab;
}

export interface AdvisorActions {
  selectDecision: (type: DecisionType) => void;
  selectStand: (stand: StandData) => void;
  setCustomQuestion: (q: string) => void;
  runAnalysis: () => Promise<void>;
  clearAnalysis: () => void;
  saveCurrentDecision: () => void;
  updateDecisionOutcome: (id: string, followed: boolean | null, outcome: string | null) => void;
  removeDecision: (id: string) => void;
  setActiveTab: (tab: AdvisorTab) => void;
}

// ─── Hook ───

export function useAdvisor(): AdvisorState & AdvisorActions {
  const [selectedDecision, setSelectedDecision] = useState<DecisionType | null>(null);
  const [selectedStand, setSelectedStand] = useState<StandData | null>(null);
  const [customQuestion, setCustomQuestion] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [decisionLog, setDecisionLog] = useState<SavedDecision[]>([]);
  const [activeTab, setActiveTab] = useState<AdvisorTab>('analyze');

  // Load decision log from localStorage on mount
  useEffect(() => {
    setDecisionLog(getDecisionLog());
  }, []);

  const selectDecision = useCallback((type: DecisionType) => {
    setSelectedDecision(type);
    setAnalysis(null);
  }, []);

  const selectStand = useCallback((stand: StandData) => {
    setSelectedStand(stand);
    setAnalysis(null);
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!selectedDecision || !selectedStand) return;

    setIsAnalyzing(true);
    // Simulate processing delay for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = generateAnalysis(selectedDecision, selectedStand, customQuestion);
    setAnalysis(result);
    setIsAnalyzing(false);
  }, [selectedDecision, selectedStand, customQuestion]);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setSelectedDecision(null);
    setSelectedStand(null);
    setCustomQuestion('');
  }, []);

  const saveCurrentDecision = useCallback(() => {
    if (!analysis || !selectedStand) return;

    const recommended = analysis.options.find((o) => o.recommended);
    const decision: SavedDecision = {
      id: `decision-${Date.now()}`,
      date: new Date().toISOString(),
      standName: selectedStand.name,
      question: selectedDecision === 'custom'
        ? customQuestion
        : analysis.decisionType,
      recommendedOption: recommended?.titleKey ?? 'N/A',
      decisionType: analysis.decisionType,
      followed: null,
      outcome: null,
      analysis,
    };

    saveDecision(decision);
    setDecisionLog(getDecisionLog());
  }, [analysis, selectedStand, selectedDecision, customQuestion]);

  const updateDecisionOutcome = useCallback((id: string, followed: boolean | null, outcome: string | null) => {
    updateDecision(id, { followed, outcome });
    setDecisionLog(getDecisionLog());
  }, []);

  const removeDecision = useCallback((id: string) => {
    deleteDecision(id);
    setDecisionLog(getDecisionLog());
  }, []);

  return {
    selectedDecision,
    selectedStand,
    customQuestion,
    analysis,
    isAnalyzing,
    decisionLog,
    stands: DEMO_STANDS,
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
  };
}
