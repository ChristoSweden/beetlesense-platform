import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  TreePine,
  Trees,
  Leaf,
  CheckCircle2,
  AlertCircle,
  Shield,
  TrendingDown,
  FileDown,
  Phone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AssessmentState {
  step: number;
  forestType: string | null;
  damageLevel: number;
  symptoms: string[];
  completed: boolean;
}

type ForestType = 'pine' | 'spruce' | 'mixed' | 'birch';

const DamageAssessment: React.FC = () => {
  const [state, setState] = useState<AssessmentState>({
    step: 1,
    forestType: null,
    damageLevel: 30,
    symptoms: [],
    completed: false,
  });

  const [isExpanded, setIsExpanded] = useState(true);

  const forestTypes: Record<ForestType, { label: string; icon: React.ReactNode; color: string }> = {
    pine: { label: 'Tall (Pine)', icon: <TreePine className="w-8 h-8" />, color: 'from-amber-600 to-amber-700' },
    spruce: { label: 'Gran (Spruce)', icon: <Trees className="w-8 h-8" />, color: 'from-green-700 to-green-800' },
    mixed: { label: 'Blandskog (Mixed)', icon: <Leaf className="w-8 h-8" />, color: 'from-emerald-600 to-emerald-700' },
    birch: { label: 'björk (Birch)', icon: <Leaf className="w-8 h-8" />, color: 'from-yellow-600 to-yellow-700' },
  };

  const symptoms = [
    { id: 'bark-holes', label: 'Bark holes / galleries', icon: '🔴' },
    { id: 'sawdust', label: 'Sawdust / boring dust', icon: '🟡' },
    { id: 'crown', label: 'Crown discoloration', icon: '🟠' },
    { id: 'resin', label: 'Resin flow', icon: '💧' },
    { id: 'woodpecker', label: 'Woodpecker damage', icon: '🪶' },
    { id: 'branches', label: 'Dead branches', icon: '🌿' },
  ];

  const getRiskLevel = (level: number): { label: string; color: string; bg: string } => {
    if (level < 25) return { label: 'Low', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (level < 50) return { label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    if (level < 75) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20' };
  };

  const _getDamageColor = (level: number) => {
    if (level < 25) return 'bg-green-500';
    if (level < 50) return 'bg-amber-500';
    if (level < 75) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const toggleSymptom = (id: string) => {
    setState(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(id)
        ? prev.symptoms.filter(s => s !== id)
        : [...prev.symptoms, id],
    }));
  };

  const handleNext = () => {
    if (state.step < 4) {
      setState(prev => ({ ...prev, step: prev.step + 1 }));
    } else {
      setState(prev => ({ ...prev, step: 4, completed: true }));
    }
  };

  const handleBack = () => {
    if (state.step > 1) {
      setState(prev => ({ ...prev, step: prev.step - 1 }));
    }
  };

  const handleReset = () => {
    setState({
      step: 1,
      forestType: null,
      damageLevel: 30,
      symptoms: [],
      completed: false,
    });
  };

  const canProceed = (): boolean => {
    if (state.step === 1) return state.forestType !== null;
    if (state.step === 2) return true;
    if (state.step === 3) return state.symptoms.length > 0;
    return true;
  };

  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];
    const level = state.damageLevel;
    const hasWoodpecker = state.symptoms.includes('woodpecker');
    const hasBarkHoles = state.symptoms.includes('bark-holes');

    if (level >= 75 || state.symptoms.length >= 4) {
      recommendations.push('Immediate professional inspection required within 48 hours');
    }
    if (hasBarkHoles && hasWoodpecker) {
      recommendations.push('Active infestation detected - prepare for emergency extraction');
    }
    if (level >= 50) {
      recommendations.push('Increase monitoring frequency to daily observations');
    }
    if (state.symptoms.includes('sawdust')) {
      recommendations.push('Deploy pheromone traps in adjacent stands');
    }
    if (level < 50 && state.symptoms.length <= 2) {
      recommendations.push('Continue regular monitoring - implement preventive measures');
    }

    return recommendations.length > 0 ? recommendations : [
      'Regular monitoring recommended',
      'Maintain forest health practices',
      'Document findings weekly',
    ];
  };

  const getEstimatedArea = (): string => {
    if (!state.forestType) return 'N/A';
    const baseArea = 50; // hectares
    const factor = (state.damageLevel / 100) * (state.symptoms.length / 3);
    return `${Math.round(baseArea * (0.5 + factor))} ha`;
  };

  const getEconomicImpact = (): string => {
    const level = state.damageLevel;
    const baseValue = 45000; // SEK per hectare
    const area = parseInt(getEstimatedArea()) || 50;
    const impact = Math.round((baseValue * area * level) / 100);
    return `${impact.toLocaleString()} SEK`;
  };

  const riskLevel = getRiskLevel(state.damageLevel);

  return (
    <div className="w-full">
      <motion.div
        className="border border-gray-800 rounded-lg bg-gray-900/50 overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-4 bg-gradient-to-r from-emerald-900/30 to-green-900/30 border-b border-gray-800 flex items-center justify-between hover:bg-emerald-900/40 transition"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Forest Damage Assessment Tool</h2>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="p-6"
            >
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-gray-300">
                    Step {Math.min(state.step, 4)} of 4
                  </span>
                  <span className="text-xs text-gray-500">
                    {Math.round((Math.min(state.step, 4) / 4) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(Math.min(state.step, 4) / 4) * 100}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* Step 1: Forest Type Selection */}
                {state.step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold mb-4 text-white">Select Forest Type</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(forestTypes).map(([key, forest]) => (
                        <button
                          key={key}
                          onClick={() => setState(prev => ({ ...prev, forestType: key }))}
                          className={`p-4 rounded-lg border-2 transition flex flex-col items-center gap-2 ${
                            state.forestType === key
                              ? 'border-emerald-500 bg-emerald-500/20'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                          }`}
                        >
                          <div className={`text-2xl`}>{forest.icon}</div>
                          <span className="text-sm font-semibold">{forest.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Damage Level Assessment */}
                {state.step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold mb-4 text-white">Assess Damage Level</h3>
                    <div className="space-y-4">
                      <div className="bg-gray-800/50 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-sm text-gray-400">Damage Percentage</span>
                          <span className={`text-3xl font-bold ${riskLevel.color}`}>
                            {state.damageLevel}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={state.damageLevel}
                          onChange={(e) => setState(prev => ({ ...prev, damageLevel: parseInt(e.target.value) }))}
                          className="w-full h-3 rounded-full appearance-none cursor-pointer accent-emerald-500"
                          style={{
                            background: `linear-gradient(to right,
                              rgb(34, 197, 94) 0%,
                              rgb(34, 197, 94) ${Math.max(state.damageLevel * 0.25, 25)}%,
                              rgb(251, 191, 36) ${Math.max(state.damageLevel * 0.25, 25)}%,
                              rgb(251, 146, 60) ${Math.max(state.damageLevel * 0.5, 50)}%,
                              rgb(239, 68, 68) ${Math.max(state.damageLevel, 100)}%,
                              rgb(239, 68, 68) 100%)`
                          }}
                        />
                        <div className="flex justify-between mt-3 text-xs text-gray-500">
                          <span>0%</span>
                          <span>25%</span>
                          <span>50%</span>
                          <span>75%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Visual Indicator */}
                      <div className={`rounded-lg p-4 ${riskLevel.bg}`}>
                        <div className="flex items-center gap-3">
                          {state.damageLevel < 25 && <CheckCircle2 className={`w-5 h-5 ${riskLevel.color}`} />}
                          {state.damageLevel >= 25 && state.damageLevel < 50 && <AlertCircle className={`w-5 h-5 ${riskLevel.color}`} />}
                          {state.damageLevel >= 50 && <AlertTriangle className={`w-5 h-5 ${riskLevel.color}`} />}
                          <div>
                            <div className={`font-semibold ${riskLevel.color}`}>{riskLevel.label} Risk</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {state.damageLevel < 25 && 'Forest appears healthy. Continue monitoring.'}
                              {state.damageLevel >= 25 && state.damageLevel < 50 && 'Some damage detected. Increase monitoring frequency.'}
                              {state.damageLevel >= 50 && state.damageLevel < 75 && 'Significant damage. Professional assessment recommended.'}
                              {state.damageLevel >= 75 && 'Critical damage. Immediate action required.'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Symptoms Checklist */}
                {state.step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold mb-4 text-white">Report Symptoms</h3>
                    <p className="text-sm text-gray-400 mb-4">Select all visible symptoms:</p>
                    <div className="space-y-2">
                      {symptoms.map(symptom => (
                        <button
                          key={symptom.id}
                          onClick={() => toggleSymptom(symptom.id)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition flex items-center gap-3 ${
                            state.symptoms.includes(symptom.id)
                              ? 'border-emerald-500 bg-emerald-500/20'
                              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={state.symptoms.includes(symptom.id)}
                            onChange={() => {}}
                            className="w-4 h-4 rounded cursor-pointer accent-emerald-500"
                          />
                          <span className="text-lg">{symptom.icon}</span>
                          <span className="text-sm font-medium flex-1">{symptom.label}</span>
                          {state.symptoms.includes(symptom.id) && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                    {state.symptoms.length === 0 && (
                      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <p className="text-sm text-blue-300">Select at least one symptom to proceed.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Step 4: Results & Report */}
                {state.step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-lg font-semibold mb-6 text-white">Assessment Results</h3>

                    {/* Risk Badge */}
                    <div className={`rounded-lg p-6 mb-6 ${riskLevel.bg} border border-gray-700`}>
                      <div className="flex items-center gap-4 mb-4">
                        {state.damageLevel < 25 && <Shield className={`w-8 h-8 ${riskLevel.color}`} />}
                        {state.damageLevel >= 25 && state.damageLevel < 50 && <AlertCircle className={`w-8 h-8 ${riskLevel.color}`} />}
                        {state.damageLevel >= 50 && <AlertTriangle className={`w-8 h-8 ${riskLevel.color}`} />}
                        <div>
                          <div className={`text-2xl font-bold ${riskLevel.color}`}>{riskLevel.label} Risk</div>
                          <div className="text-sm text-gray-400">Based on {state.symptoms.length} symptoms</div>
                        </div>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-1">Damage Level</div>
                        <div className="text-2xl font-bold text-emerald-400">{state.damageLevel}%</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-1">Estimated Area Affected</div>
                        <div className="text-2xl font-bold text-emerald-400">{getEstimatedArea()}</div>
                      </div>
                      <div className="bg-gray-800/50 rounded-lg p-4">
                        <div className="text-xs text-gray-500 mb-1">Economic Impact</div>
                        <div className="text-lg font-bold text-orange-400">{getEconomicImpact()}</div>
                      </div>
                    </div>

                    {/* Recommended Actions */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-emerald-400" />
                        Recommended Actions
                      </h4>
                      <div className="space-y-2">
                        {getRecommendations().map((rec, i) => (
                          <div key={i} className="flex gap-3 p-3 bg-gray-800/50 rounded-lg">
                            <span className="text-emerald-400 font-bold">{i + 1}.</span>
                            <span className="text-sm text-gray-300">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* CTAs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition">
                        <FileDown className="w-4 h-4" />
                        Generate Report
                      </button>
                      <button className="flex items-center justify-center gap-2 px-6 py-3 border border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 font-semibold rounded-lg transition">
                        <Phone className="w-4 h-4" />
                        Contact Expert
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800">
                <button
                  onClick={handleBack}
                  disabled={state.step === 1}
                  className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white disabled:text-gray-600 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex gap-2">
                  {state.step === 4 && state.completed && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg transition"
                    >
                      Start Over
                    </button>
                  )}
                </div>

                <button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                    canProceed()
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {state.step === 4 ? 'Complete' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default DamageAssessment;
