import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import {
  ModuleCard,
  ANALYSIS_MODULES,
  AnalysisModule,
} from './ModuleCard';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Loader2,
  Zap,
  Clock,
} from 'lucide-react';

interface Parcel {
  id: string;
  name: string;
  area_hectares: number;
}

type WizardStep = 1 | 2 | 3 | 4;

interface CreateSurveyWizardProps {
  onClose: () => void;
  onCreated?: (surveyId: string) => void;
}

const STEP_LABELS = ['Select Parcel', 'Choose Modules', 'Priority', 'Review'];

export function CreateSurveyWizard({ onClose, onCreated }: CreateSurveyWizardProps) {
  const { user } = useAuthStore();
  const [step, setStep] = useState<WizardStep>(1);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loadingParcels, setLoadingParcels] = useState(true);

  // Form state
  const [selectedParcelId, setSelectedParcelId] = useState<string>('');
  const [selectedModules, setSelectedModules] = useState<AnalysisModule[]>([]);
  const [priority, setPriority] = useState<'standard' | 'priority'>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load parcels
  useEffect(() => {
    async function loadParcels() {
      setLoadingParcels(true);

      if (isDemo()) {
        setParcels(DEMO_PARCELS.map((p) => ({ id: p.id, name: p.name, area_hectares: p.area_hectares })));
        setLoadingParcels(false);
        return;
      }

      const { data, error } = await supabase
        .from('parcels')
        .select('id, name, area_hectares')
        .order('name');

      if (!error && data) {
        setParcels(data as Parcel[]);
      }
      setLoadingParcels(false);
    }
    loadParcels();
  }, []);

  const toggleModule = useCallback((id: AnalysisModule) => {
    setSelectedModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  }, []);

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return !!selectedParcelId;
      case 2:
        return selectedModules.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const selectedParcel = parcels.find((p) => p.id === selectedParcelId);

    if (isDemo()) {
      // Simulate survey creation in demo mode
      await new Promise((r) => setTimeout(r, 800));
      onCreated?.(`demo-survey-${Date.now()}`);
      onClose();
      return;
    }

    try {
      const { data, error } = await supabase
        .from('surveys')
        .insert({
          user_id: user.id,
          parcel_id: selectedParcelId,
          name: `Survey - ${selectedParcel?.name ?? 'Unknown'}`,
          modules: selectedModules,
          priority,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      onCreated?.(data.id);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create survey');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedParcel = parcels.find((p) => p.id === selectedParcelId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg2)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-serif font-bold text-[var(--text)]">New Survey</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={16} className="text-[var(--text3)]" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            {STEP_LABELS.map((label, idx) => {
              const stepNum = (idx + 1) as WizardStep;
              const isActive = step === stepNum;
              const isDone = step > stepNum;

              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${
                      isDone
                        ? 'bg-[var(--green)] text-forest-950'
                        : isActive
                          ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]'
                          : 'bg-forest-800 text-[var(--text3)] border border-[var(--border)]'
                    }`}
                  >
                    {isDone ? <Check size={12} /> : stepNum}
                  </div>
                  <span
                    className={`text-[10px] hidden sm:inline ${
                      isActive ? 'text-[var(--text)]' : 'text-[var(--text3)]'
                    }`}
                  >
                    {label}
                  </span>
                  {idx < 3 && (
                    <div
                      className={`flex-1 h-px ${isDone ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Step 1: Select Parcel */}
          {step === 1 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Select Parcel</h3>
              <p className="text-[11px] text-[var(--text3)] mb-4">
                Choose the forest parcel to survey
              </p>

              {loadingParcels ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="text-[var(--green)] animate-spin" />
                </div>
              ) : parcels.length === 0 ? (
                <div className="text-center py-8 text-sm text-[var(--text3)]">
                  No parcels found. Add a parcel first.
                </div>
              ) : (
                <div className="space-y-2">
                  {parcels.map((parcel) => (
                    <button
                      key={parcel.id}
                      onClick={() => setSelectedParcelId(parcel.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        selectedParcelId === parcel.id
                          ? 'border-[var(--green)] bg-[var(--green)]/5'
                          : 'border-[var(--border)] hover:border-[var(--border2)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">{parcel.name}</p>
                          <p className="text-[10px] text-[var(--text3)] font-mono mt-0.5">
                            {parcel.area_hectares.toFixed(1)} ha
                          </p>
                        </div>
                        {selectedParcelId === parcel.id && (
                          <div className="w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center">
                            <Check size={12} className="text-forest-950" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Modules */}
          {step === 2 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Analysis Modules</h3>
              <p className="text-[11px] text-[var(--text3)] mb-4">
                Select which analyses to run ({selectedModules.length} selected)
              </p>

              <div className="grid grid-cols-2 gap-3">
                {ANALYSIS_MODULES.map((mod) => (
                  <ModuleCard
                    key={mod.id}
                    module={mod}
                    selected={selectedModules.includes(mod.id)}
                    onToggle={toggleModule}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Priority */}
          {step === 3 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Processing Priority</h3>
              <p className="text-[11px] text-[var(--text3)] mb-4">
                Choose how quickly you need results
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => setPriority('standard')}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    priority === 'standard'
                      ? 'border-[var(--green)] bg-[var(--green)]/5'
                      : 'border-[var(--border)] hover:border-[var(--border2)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-forest-800 flex items-center justify-center">
                      <Clock size={20} className="text-[var(--text2)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Standard</p>
                      <p className="text-[11px] text-[var(--text3)]">
                        Results within 24 hours
                      </p>
                    </div>
                    {priority === 'standard' && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center">
                        <Check size={12} className="text-forest-950" />
                      </div>
                    )}
                  </div>
                </button>

                <button
                  onClick={() => setPriority('priority')}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    priority === 'priority'
                      ? 'border-amber bg-amber/5'
                      : 'border-[var(--border)] hover:border-[var(--border2)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber/10 flex items-center justify-center">
                      <Zap size={20} className="text-amber" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">Priority</p>
                      <p className="text-[11px] text-[var(--text3)]">
                        Fast-tracked, results within 4 hours
                      </p>
                    </div>
                    {priority === 'priority' && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-amber flex items-center justify-center">
                        <Check size={12} className="text-forest-950" />
                      </div>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)] mb-1">Review & Confirm</h3>
              <p className="text-[11px] text-[var(--text3)] mb-4">
                Verify your survey configuration
              </p>

              <div className="space-y-3">
                {/* Parcel */}
                <div className="p-3 rounded-xl border border-[var(--border)] bg-forest-900/30">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
                    Parcel
                  </p>
                  <p className="text-sm font-medium text-[var(--text)]">
                    {selectedParcel?.name ?? 'Unknown'}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] font-mono">
                    {selectedParcel?.area_hectares.toFixed(1)} ha
                  </p>
                </div>

                {/* Modules */}
                <div className="p-3 rounded-xl border border-[var(--border)] bg-forest-900/30">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-2">
                    Modules ({selectedModules.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedModules.map((modId) => {
                      const mod = ANALYSIS_MODULES.find((m) => m.id === modId);
                      return mod ? (
                        <span
                          key={modId}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-forest-800 text-[11px] text-[var(--text2)] border border-[var(--border)]"
                        >
                          {mod.icon} {mod.title}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div className="p-3 rounded-xl border border-[var(--border)] bg-forest-900/30">
                  <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1">
                    Priority
                  </p>
                  <p className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
                    {priority === 'priority' ? (
                      <>
                        <Zap size={14} className="text-amber" />
                        Priority (4h)
                      </>
                    ) : (
                      <>
                        <Clock size={14} className="text-[var(--text2)]" />
                        Standard (24h)
                      </>
                    )}
                  </p>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl border border-danger/30 bg-danger/10">
                    <p className="text-xs text-danger">{submitError}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
          <button
            onClick={() => (step === 1 ? onClose() : setStep((step - 1) as WizardStep))}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ChevronLeft size={14} />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep((step + 1) as WizardStep)}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Create Survey
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
