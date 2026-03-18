import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  TreePine,
  Axe,
  ShieldCheck,
  Sprout,
  FileText,
  Send,
  X,
  Download,
  MapPin,
  Ruler,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { DEMO_PARCELS, isDemo } from '@/lib/demoData';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  FELLING_TYPES,
  REFORESTATION_SPECIES,
  REFORESTATION_METHODS,
  type FellingType,
  type ReforestationMethod,
} from '@/data/regulatoryRules';
import { EnvironmentalCheck } from './EnvironmentalCheck';
import type { FellingPermit } from '@/hooks/useCompliance';
import { useCompliance } from '@/hooks/useCompliance';

interface FellingWizardProps {
  onClose: () => void;
  onSubmit: (permit: FellingPermit) => void;
  existingDraft?: FellingPermit | null;
}

const TOTAL_STEPS = 5;

export function FellingWizard({ onClose, onSubmit, existingDraft }: FellingWizardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { getConstraintsForParcel } = useCompliance();

  // ─── Form state ───
  const [step, setStep] = useState(1);
  const [parcelId, setParcelId] = useState(existingDraft?.parcelId ?? '');
  const [fellingType, setFellingType] = useState<FellingType>(existingDraft?.fellingType ?? 'foryngringsavverkning');
  const [areaHa, setAreaHa] = useState(existingDraft?.areaHa ?? 0);
  const [volumeM3, setVolumeM3] = useState(existingDraft?.volumeM3 ?? 0);
  const [reforestationSpecies, setReforestationSpecies] = useState(existingDraft?.reforestationPlan?.species ?? 'gran');
  const [reforestationMethod, setReforestationMethod] = useState<ReforestationMethod>(existingDraft?.reforestationPlan?.method ?? 'planting');
  const [plantingDate, setPlantingDate] = useState(existingDraft?.reforestationPlan?.plantingDate ?? '');
  const [notes, setNotes] = useState(existingDraft?.notes ?? '');

  const selectedParcel = useMemo(
    () => DEMO_PARCELS.find((p) => p.id === parcelId),
    [parcelId],
  );

  const constraints = useMemo(
    () => (parcelId ? getConstraintsForParcel(parcelId) : []),
    [parcelId, getConstraintsForParcel],
  );

  const selectedFellingType = useMemo(
    () => FELLING_TYPES.find((f) => f.id === fellingType),
    [fellingType],
  );

  const selectedSpecies = useMemo(
    () => REFORESTATION_SPECIES.find((s) => s.id === reforestationSpecies),
    [reforestationSpecies],
  );

  const needsReforestation = fellingType === 'foryngringsavverkning' || fellingType === 'sanitetsavverkning';

  // Compute deadline: 3 years from planting
  const reforestationDeadline = useMemo(() => {
    if (!plantingDate) return '';
    const d = new Date(plantingDate);
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().slice(0, 10);
  }, [plantingDate]);

  // Auto-fill area from parcel
  const handleParcelSelect = useCallback((id: string) => {
    setParcelId(id);
    const parcel = DEMO_PARCELS.find((p) => p.id === id);
    if (parcel && areaHa === 0) {
      setAreaHa(Math.min(parcel.area_hectares, parcel.area_hectares));
    }
  }, [areaHa]);

  const canAdvance = useMemo(() => {
    switch (step) {
      case 1: return !!parcelId;
      case 2: return !!fellingType && areaHa > 0 && volumeM3 > 0;
      case 3: return true; // Environmental check is informational
      case 4: return !needsReforestation || (!!reforestationSpecies && !!reforestationMethod && !!plantingDate);
      case 5: return true;
      default: return false;
    }
  }, [step, parcelId, fellingType, areaHa, volumeM3, needsReforestation, reforestationSpecies, reforestationMethod, plantingDate]);

  const buildPermit = useCallback((): FellingPermit => {
    const id = existingDraft?.id ?? `draft-${Date.now()}`;
    return {
      id,
      parcelId,
      parcelName: selectedParcel?.name ?? '',
      areaHa,
      fellingType,
      volumeM3,
      status: 'draft',
      constraints,
      reforestationPlan: needsReforestation
        ? {
            species: reforestationSpecies,
            method: reforestationMethod,
            densityPerHa: selectedSpecies?.densityPerHa ?? 2500,
            plantingDate,
            deadline: reforestationDeadline,
          }
        : null,
      createdAt: existingDraft?.createdAt ?? new Date().toISOString(),
      submittedAt: null,
      reviewDeadline: null,
      approvedAt: null,
      notes,
    };
  }, [parcelId, selectedParcel, areaHa, fellingType, volumeM3, constraints, needsReforestation, reforestationSpecies, reforestationMethod, selectedSpecies, plantingDate, reforestationDeadline, notes, existingDraft]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { profile } = useAuthStore();

  const handleSubmit = async () => {
    const permit = buildPermit();
    setIsSubmitting(true);
    setSubmitError(null);

    if (isDemo()) {
      // Demo mode: simulate a short delay, then show confirmation
      await new Promise((r) => setTimeout(r, 800));
      onSubmit(permit);
      setSubmitSuccess(true);
      setIsSubmitting(false);
      return;
    }

    // Production: store to Supabase felling_notifications table
    try {
      const { error: dbError } = await supabase
        .from('felling_notifications')
        .upsert({
          id: permit.id.startsWith('draft-') ? undefined : permit.id,
          owner_id: profile?.id,
          parcel_id: permit.parcelId,
          parcel_name: permit.parcelName,
          area_ha: permit.areaHa,
          felling_type: permit.fellingType,
          volume_m3: permit.volumeM3,
          status: permit.status,
          constraints: permit.constraints,
          reforestation_plan: permit.reforestationPlan,
          notes: permit.notes,
        });

      if (dbError) throw dbError;

      onSubmit(permit);
      setSubmitSuccess(true);
    } catch (err: any) {
      setSubmitError(err.message ?? (lang === 'sv' ? 'Kunde inte spara anmälan' : 'Failed to save notification'));
    }

    setIsSubmitting(false);
  };

  const handleGeneratePdf = () => {
    // In a real app, this would call a PDF generation service
    const permit = buildPermit();
    const content = [
      `AVVERKNINGSANMÄLAN`,
      `${'='.repeat(40)}`,
      ``,
      `Skifte: ${permit.parcelName}`,
      `Areal: ${permit.areaHa} ha`,
      `Avverkningstyp: ${selectedFellingType ? (lang === 'sv' ? selectedFellingType.label_sv : selectedFellingType.label_en) : fellingType}`,
      `Volym: ${permit.volumeM3} m3fub`,
      ``,
      `MILJÖHÄNSYN`,
      `${'-'.repeat(40)}`,
      ...constraints.map((c) => `- ${c.name}: ${c.distance_m}m (${c.severity})`),
      ``,
      ...(permit.reforestationPlan
        ? [
            `ÅTERBESKOGNINGSPLAN`,
            `${'-'.repeat(40)}`,
            `Trädslag: ${selectedSpecies ? (lang === 'sv' ? selectedSpecies.label_sv : selectedSpecies.label_en) : ''}`,
            `Metod: ${permit.reforestationPlan.method}`,
            `Planteringstäthet: ${permit.reforestationPlan.densityPerHa} plantor/ha`,
            `Planerad plantering: ${permit.reforestationPlan.plantingDate}`,
            `Senast klar: ${permit.reforestationPlan.deadline}`,
          ]
        : []),
      ``,
      `Datum: ${new Date().toISOString().slice(0, 10)}`,
      `Genererad av BeetleSense.ai`,
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `avverkningsanmalan_${permit.parcelName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepLabels = [
    { icon: TreePine, label: t('compliance.wizard.step1') },
    { icon: Axe, label: t('compliance.wizard.step2') },
    { icon: ShieldCheck, label: t('compliance.wizard.step3') },
    { icon: Sprout, label: t('compliance.wizard.step4') },
    { icon: FileText, label: t('compliance.wizard.step5') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-xl border border-[var(--border)] overflow-hidden flex flex-col"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text)]">
              {t('compliance.wizard.title')}
            </h2>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('compliance.wizard.step')} {step} / {TOTAL_STEPS} — {stepLabels[step - 1].label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-1">
            {stepLabels.map((s, idx) => {
              const StepIcon = s.icon;
              const isActive = idx + 1 === step;
              const isCompleted = idx + 1 < step;
              return (
                <div key={idx} className="flex items-center flex-1">
                  <div className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium transition-all
                    ${isActive ? 'bg-[var(--green)]/10 text-[var(--green)]' : isCompleted ? 'text-[var(--green)]' : 'text-[var(--text3)]'}
                  `}>
                    <StepIcon size={12} />
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {idx < TOTAL_STEPS - 1 && (
                    <div className={`flex-1 h-px mx-1 ${isCompleted ? 'bg-[var(--green)]' : 'bg-[var(--border)]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Success confirmation overlay */}
          {submitSuccess && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-[var(--green)]" />
              </div>
              <h3 className="text-base font-semibold text-[var(--text)] mb-1">
                {lang === 'sv' ? 'Anmälan sparad!' : 'Notification saved!'}
              </h3>
              <p className="text-xs text-[var(--text3)] max-w-xs mb-1">
                {isDemo()
                  ? (lang === 'sv'
                      ? 'Din avverkningsanmälan har sparats som utkast. I produktionsläge skickas den till Skogsstyrelsen.'
                      : 'Your felling notification has been saved as a draft. In production, it would be submitted to Skogsstyrelsen.')
                  : (lang === 'sv'
                      ? 'Din avverkningsanmälan har sparats. Du kan nu skicka in den till Skogsstyrelsen.'
                      : 'Your felling notification has been saved. You can now submit it to Skogsstyrelsen.')
                }
              </p>
              {isDemo() && (
                <span className="text-[9px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full mt-2">
                  DEMO
                </span>
              )}
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-forest-950 hover:brightness-110 transition-all"
              >
                {lang === 'sv' ? 'Stäng' : 'Close'}
              </button>
            </div>
          )}

          {/* Step 1: Select Parcel */}
          {!submitSuccess && step === 1 && (
            <div className="space-y-3">
              <p className="text-xs text-[var(--text2)] mb-4">
                {t('compliance.wizard.selectParcelDesc')}
              </p>
              {DEMO_PARCELS.map((parcel) => (
                <button
                  key={parcel.id}
                  onClick={() => handleParcelSelect(parcel.id)}
                  className={`
                    w-full text-left p-3 rounded-lg border transition-all
                    ${parcelId === parcel.id
                      ? 'border-[var(--green)] bg-[var(--green)]/5'
                      : 'border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg)]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-[var(--text)]">{parcel.name}</span>
                      <span className="text-[10px] text-[var(--text3)] ml-2">{parcel.municipality}</span>
                    </div>
                    <span className="text-xs font-mono text-[var(--text2)]">{parcel.area_hectares} ha</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                      <MapPin size={10} /> {parcel.center[1].toFixed(4)}, {parcel.center[0].toFixed(4)}
                    </span>
                    <span className="text-[10px] text-[var(--text3)]">
                      {parcel.species_mix.map((s) => `${s.species} ${s.pct}%`).join(', ')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Felling type + area + volume */}
          {!submitSuccess && step === 2 && (
            <div className="space-y-5">
              {/* Felling type */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] mb-2 block">
                  {t('compliance.wizard.fellingType')}
                </label>
                <div className="space-y-2">
                  {FELLING_TYPES.map((ft) => (
                    <button
                      key={ft.id}
                      onClick={() => setFellingType(ft.id)}
                      className={`
                        w-full text-left p-3 rounded-lg border transition-all
                        ${fellingType === ft.id
                          ? 'border-[var(--green)] bg-[var(--green)]/5'
                          : 'border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg)]'
                        }
                      `}
                    >
                      <span className="text-xs font-medium text-[var(--text)]">
                        {lang === 'sv' ? ft.label_sv : ft.label_en}
                      </span>
                      <p className="text-[10px] text-[var(--text3)] mt-0.5">
                        {lang === 'sv' ? ft.description_sv : ft.description_en}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Area */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                  {t('compliance.wizard.area')} (ha)
                </label>
                <input
                  type="number"
                  value={areaHa || ''}
                  onChange={(e) => setAreaHa(Number(e.target.value))}
                  min={0.1}
                  step={0.1}
                  max={selectedParcel?.area_hectares ?? 1000}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
                  placeholder={selectedParcel ? `Max ${selectedParcel.area_hectares} ha` : ''}
                />
                {selectedParcel && areaHa > selectedParcel.area_hectares && (
                  <p className="text-[10px] text-red-400 mt-1">
                    {t('compliance.wizard.areaExceeds')}
                  </p>
                )}
              </div>

              {/* Volume */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                  {t('compliance.wizard.volume')} (m3fub)
                </label>
                <input
                  type="number"
                  value={volumeM3 || ''}
                  onChange={(e) => setVolumeM3(Number(e.target.value))}
                  min={1}
                  step={10}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)]"
                  placeholder={t('compliance.wizard.volumePlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Step 3: Environmental check */}
          {!submitSuccess && step === 3 && (
            <EnvironmentalCheck
              constraints={constraints}
              parcelName={selectedParcel?.name}
            />
          )}

          {/* Step 4: Reforestation plan */}
          {!submitSuccess && step === 4 && (
            <div className="space-y-5">
              {!needsReforestation ? (
                <div className="flex items-center gap-3 p-4 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5">
                  <ShieldCheck size={20} className="text-[var(--green)]" />
                  <div>
                    <p className="text-sm font-medium text-[var(--green)]">
                      {t('compliance.wizard.noReforestationNeeded')}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-0.5">
                      {t('compliance.wizard.noReforestationDesc')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[var(--text2)]">
                    {t('compliance.wizard.reforestationDesc')}
                  </p>

                  {/* Species */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] mb-2 block">
                      {t('compliance.wizard.species')}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {REFORESTATION_SPECIES.map((sp) => (
                        <button
                          key={sp.id}
                          onClick={() => setReforestationSpecies(sp.id)}
                          className={`
                            text-left p-2.5 rounded-lg border transition-all
                            ${reforestationSpecies === sp.id
                              ? 'border-[var(--green)] bg-[var(--green)]/5'
                              : 'border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg)]'
                            }
                          `}
                        >
                          <span className="text-[11px] font-medium text-[var(--text)] block">
                            {lang === 'sv' ? sp.label_sv : sp.label_en}
                          </span>
                          <span className="text-[9px] text-[var(--text3)]">
                            {sp.densityPerHa} {t('compliance.wizard.plantsPerHa')}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Method */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] mb-2 block">
                      {t('compliance.wizard.method')}
                    </label>
                    <div className="space-y-2">
                      {REFORESTATION_METHODS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setReforestationMethod(m.id)}
                          className={`
                            w-full text-left p-3 rounded-lg border transition-all
                            ${reforestationMethod === m.id
                              ? 'border-[var(--green)] bg-[var(--green)]/5'
                              : 'border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg)]'
                            }
                          `}
                        >
                          <span className="text-xs font-medium text-[var(--text)]">
                            {lang === 'sv' ? m.label_sv : m.label_en}
                          </span>
                          <p className="text-[10px] text-[var(--text3)] mt-0.5">
                            {lang === 'sv' ? m.description_sv : m.description_en}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Planting date */}
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)] mb-1.5 flex items-center gap-1.5">
                      <Calendar size={12} />
                      {t('compliance.wizard.plantingDate')}
                    </label>
                    <input
                      type="date"
                      value={plantingDate}
                      onChange={(e) => setPlantingDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                    />
                    {reforestationDeadline && (
                      <p className="text-[10px] text-[var(--text3)] mt-1 flex items-center gap-1">
                        <Ruler size={10} />
                        {t('compliance.wizard.reforestationDeadline')}: {reforestationDeadline} (3 {lang === 'sv' ? 'år' : 'years'}, 5 § SVL)
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-[var(--text)] mb-1.5 block">
                  {t('compliance.wizard.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder-[var(--text3)] focus:outline-none focus:border-[var(--green)] resize-none"
                  placeholder={t('compliance.wizard.notesPlaceholder')}
                />
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {!submitSuccess && step === 5 && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text2)] mb-2">
                {t('compliance.wizard.reviewDesc')}
              </p>

              {/* Summary card */}
              <div className="rounded-lg border border-[var(--border)] p-4 space-y-3" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[var(--text)]">{selectedParcel?.name}</h4>
                  <span className="text-[10px] font-mono text-[var(--text3)]">{selectedParcel?.municipality}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-[var(--text3)]">{t('compliance.wizard.fellingType')}</span>
                    <p className="font-medium text-[var(--text)]">
                      {selectedFellingType ? (lang === 'sv' ? selectedFellingType.label_sv : selectedFellingType.label_en) : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[var(--text3)]">{t('compliance.wizard.area')}</span>
                    <p className="font-medium text-[var(--text)]">{areaHa} ha</p>
                  </div>
                  <div>
                    <span className="text-[var(--text3)]">{t('compliance.wizard.volume')}</span>
                    <p className="font-medium text-[var(--text)]">{volumeM3} m3fub</p>
                  </div>
                  <div>
                    <span className="text-[var(--text3)]">{t('compliance.wizard.environmentalStatus')}</span>
                    <p className="font-medium text-[var(--text)]">
                      {constraints.filter((c) => c.severity === 'red').length > 0
                        ? lang === 'sv' ? 'Hinder identifierade' : 'Obstacles identified'
                        : constraints.filter((c) => c.severity === 'yellow').length > 0
                          ? lang === 'sv' ? 'Varningar' : 'Warnings'
                          : lang === 'sv' ? 'Inga hinder' : 'All clear'
                      }
                    </p>
                  </div>
                </div>

                {needsReforestation && (
                  <>
                    <div className="border-t border-[var(--border)] pt-3">
                      <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{t('compliance.wizard.reforestationPlan')}</span>
                      <div className="grid grid-cols-2 gap-3 mt-2 text-[11px]">
                        <div>
                          <span className="text-[var(--text3)]">{t('compliance.wizard.species')}</span>
                          <p className="font-medium text-[var(--text)]">
                            {selectedSpecies ? (lang === 'sv' ? selectedSpecies.label_sv : selectedSpecies.label_en) : ''}
                          </p>
                        </div>
                        <div>
                          <span className="text-[var(--text3)]">{t('compliance.wizard.method')}</span>
                          <p className="font-medium text-[var(--text)]">
                            {REFORESTATION_METHODS.find((m) => m.id === reforestationMethod)
                              ? lang === 'sv'
                                ? REFORESTATION_METHODS.find((m) => m.id === reforestationMethod)!.label_sv
                                : REFORESTATION_METHODS.find((m) => m.id === reforestationMethod)!.label_en
                              : ''
                            }
                          </p>
                        </div>
                        <div>
                          <span className="text-[var(--text3)]">{t('compliance.wizard.plantingDate')}</span>
                          <p className="font-medium text-[var(--text)]">{plantingDate}</p>
                        </div>
                        <div>
                          <span className="text-[var(--text3)]">{t('compliance.wizard.reforestationDeadline')}</span>
                          <p className="font-medium text-[var(--text)]">{reforestationDeadline}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {notes && (
                  <div className="border-t border-[var(--border)] pt-3">
                    <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">{t('compliance.wizard.notes')}</span>
                    <p className="text-[11px] text-[var(--text2)] mt-1">{notes}</p>
                  </div>
                )}
              </div>

              {/* Generate PDF button */}
              <button
                onClick={handleGeneratePdf}
                className="flex items-center gap-2 w-full justify-center py-2.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              >
                <Download size={14} />
                {t('compliance.wizard.generatePdf')}
              </button>
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        {!submitSuccess && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
            <button
              onClick={() => step > 1 ? setStep(step - 1) : onClose()}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-40"
            >
              <ChevronLeft size={14} />
              {step > 1 ? t('common.back') : t('common.cancel')}
            </button>

            {submitError && (
              <p className="text-[10px] text-red-400 flex-1 text-center px-2">{submitError}</p>
            )}

            <div className="flex items-center gap-2">
              {step === TOTAL_STEPS ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-forest-950 hover:brightness-110 transition-all disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Send size={14} />
                  )}
                  {isSubmitting
                    ? (lang === 'sv' ? 'Sparar...' : 'Saving...')
                    : t('compliance.wizard.submitNotification')
                  }
                </button>
              ) : (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={!canAdvance}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-forest-950 hover:brightness-110 transition-all disabled:opacity-40 disabled:pointer-events-none"
                >
                  {t('common.next')}
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
