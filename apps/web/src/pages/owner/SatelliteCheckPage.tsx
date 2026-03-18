import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanEye, Satellite, ArrowLeft, Loader2 } from 'lucide-react';
import { ObservationSelector } from '@/components/satellite/ObservationSelector';
import { AreaPicker } from '@/components/satellite/AreaPicker';
import { AnalysisResult } from '@/components/satellite/AnalysisResult';
import { ObservationHistory } from '@/components/satellite/ObservationHistory';
import {
  analyzeLocation,
  DEMO_OBSERVATIONS,
  type ObservationType,
  type SatelliteAnalysis,
  type SavedObservation,
} from '@/services/satelliteValidationService';

type Step = 'select' | 'locate' | 'analyzing' | 'results';

export default function SatelliteCheckPage() {
  const { t } = useTranslation();

  const [step, setStep] = useState<Step>('select');
  const [observationType, setObservationType] = useState<ObservationType | null>(null);
  const [location, setLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [radius, setRadius] = useState(200);
  const [analysis, setAnalysis] = useState<SatelliteAnalysis | null>(null);
  const [savedObservations, setSavedObservations] = useState<SavedObservation[]>(DEMO_OBSERVATIONS);

  const handleObservationSelect = useCallback((type: ObservationType) => {
    setObservationType(type);
    setStep('locate');
    setAnalysis(null);
  }, []);

  const handleLocationChange = useCallback((loc: { lng: number; lat: number }) => {
    setLocation(loc);
  }, []);

  const handleRadiusChange = useCallback((r: number) => {
    setRadius(r);
  }, []);

  const handleAnalyze = useCallback(() => {
    if (!observationType || !location) return;

    setStep('analyzing');

    // Simulate satellite data fetch delay
    setTimeout(() => {
      const result = analyzeLocation(observationType, location, radius);
      setAnalysis(result);
      setStep('results');
    }, 2000);
  }, [observationType, location, radius]);

  const handleSaveObservation = useCallback(() => {
    if (!analysis) return;

    const newObs: SavedObservation = {
      id: `obs-${Date.now()}`,
      observationType: analysis.observationType,
      location: analysis.location,
      radiusMeters: analysis.radiusMeters,
      date: new Date().toISOString().slice(0, 10),
      verdict: analysis.verdict,
      severity: analysis.severity,
      primaryMetric: analysis.primaryIndex.indexId.toUpperCase(),
      primaryValue: analysis.primaryIndex.current,
      changePercent: analysis.primaryIndex.changePercent,
      parcelName: 'Selected Area',
    };

    setSavedObservations((prev) => [newObs, ...prev]);
    // Reset to beginning
    setStep('select');
    setObservationType(null);
    setLocation(null);
    setAnalysis(null);
  }, [analysis]);

  const handleHistorySelect = useCallback((obs: SavedObservation) => {
    setObservationType(obs.observationType);
    setLocation(obs.location);
    setRadius(obs.radiusMeters);

    // Re-analyze
    const result = analyzeLocation(obs.observationType, obs.location, obs.radiusMeters);
    setAnalysis(result);
    setStep('results');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'results') {
      setStep('locate');
      setAnalysis(null);
    } else if (step === 'locate') {
      setStep('select');
      setLocation(null);
    }
  }, [step]);

  const handleNewCheck = useCallback(() => {
    setStep('select');
    setObservationType(null);
    setLocation(null);
    setAnalysis(null);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          {step !== 'select' && (
            <button
              onClick={handleBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)]
                hover:bg-[var(--bg3)] transition-colors"
              aria-label={t('common.back')}
            >
              <ArrowLeft size={16} className="text-[var(--text3)]" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10 border border-[var(--green)]/20">
              <ScanEye size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('satelliteCheck.title')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('satelliteCheck.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {(['select', 'locate', 'results'] as const).map((s, i) => {
            const stepLabels = [
              t('satelliteCheck.steps.observe'),
              t('satelliteCheck.steps.locate'),
              t('satelliteCheck.steps.analyze'),
            ];
            const isActive = step === s || (step === 'analyzing' && s === 'results');
            const isComplete =
              (s === 'select' && step !== 'select') ||
              (s === 'locate' && (step === 'results' || step === 'analyzing'));
            return (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold
                    ${isComplete ? 'bg-[var(--green)] text-[#030d05]' : isActive ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/30' : 'bg-[var(--bg3)] text-[var(--text3)]'}`}
                >
                  {isComplete ? '\u2713' : i + 1}
                </div>
                <span className={`text-[10px] font-medium hidden sm:block ${isActive || isComplete ? 'text-[var(--text)]' : 'text-[var(--text3)]'}`}>
                  {stepLabels[i]}
                </span>
                {i < 2 && (
                  <div className={`flex-1 h-px ${isComplete ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Select observation type */}
        {step === 'select' && (
          <div className="space-y-6">
            <ObservationSelector selected={observationType} onSelect={handleObservationSelect} />

            {/* Past observations */}
            <ObservationHistory observations={savedObservations} onSelect={handleHistorySelect} />
          </div>
        )}

        {/* Step 2: Locate on map */}
        {step === 'locate' && (
          <div className="space-y-4">
            {/* Selected type reminder */}
            {observationType && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                <Satellite size={14} className="text-[var(--green)]" />
                <span className="text-xs text-[var(--text2)]">
                  {t('satelliteCheck.checking')}: <strong className="text-[var(--text)]">{t(`satelliteCheck.types.${observationType}`)}</strong>
                </span>
              </div>
            )}

            <AreaPicker
              location={location}
              radius={radius}
              onLocationChange={handleLocationChange}
              onRadiusChange={handleRadiusChange}
            />

            {/* Analyze button */}
            <button
              onClick={handleAnalyze}
              disabled={!location}
              className={`w-full py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2
                transition-colors ${
                  location
                    ? 'bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)]'
                    : 'bg-[var(--bg3)] text-[var(--text3)] cursor-not-allowed'
                }`}
            >
              <Satellite size={16} />
              {t('satelliteCheck.runAnalysis')}
            </button>
          </div>
        )}

        {/* Step 2.5: Analyzing animation */}
        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-2 border-[var(--green)]/20 flex items-center justify-center">
                <Satellite size={32} className="text-[var(--green)] animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--green)] animate-spin" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
              {t('satelliteCheck.analyzing.title')}
            </h3>
            <p className="text-xs text-[var(--text3)] text-center max-w-xs">
              {t('satelliteCheck.analyzing.subtitle')}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Loader2 size={14} className="text-[var(--green)] animate-spin" />
              <span className="text-[10px] font-mono text-[var(--text3)]">
                {t('satelliteCheck.analyzing.fetching')}
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {step === 'results' && analysis && (
          <div className="space-y-4">
            {/* New check button */}
            <div className="flex justify-end">
              <button
                onClick={handleNewCheck}
                className="text-xs font-medium text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-1 transition-colors"
              >
                <ScanEye size={14} />
                {t('satelliteCheck.newCheck')}
              </button>
            </div>

            <AnalysisResult analysis={analysis} onSave={handleSaveObservation} />
          </div>
        )}
      </div>
    </div>
  );
}
