import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useEmergencyStore, type IssueType, type Severity } from '@/stores/emergencyStore';
import {
  X,
  ArrowLeft,
  ArrowRight,
  Camera,
  SkipForward,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Phone,
  Sparkles,
  Save,
  Trash2,
} from 'lucide-react';

// ─── Issue type options ───

interface IssueOption {
  type: IssueType;
  emoji: string;
  labelKey: string;
}

const ISSUE_OPTIONS: IssueOption[] = [
  { type: 'beetle_damage', emoji: '\uD83E\uDEB2', labelKey: 'emergency.issues.beetleDamage' },
  { type: 'storm_damage', emoji: '\uD83C\uDF2A\uFE0F', labelKey: 'emergency.issues.stormDamage' },
  { type: 'wild_boar', emoji: '\uD83D\uDC17', labelKey: 'emergency.issues.wildBoar' },
  { type: 'fire_smoke', emoji: '\uD83D\uDD25', labelKey: 'emergency.issues.fireSmoke' },
  { type: 'fungus_disease', emoji: '\uD83C\uDF44', labelKey: 'emergency.issues.fungusDis' },
  { type: 'unknown', emoji: '\u2753', labelKey: 'emergency.issues.unknown' },
];

// ─── Severity Badge ───

function SeverityBadge({ severity }: { severity: Severity }) {
  const { t } = useTranslation();
  const config = {
    mild: { bg: 'bg-green-500/20', text: 'text-green-400', label: t('emergency.severity.mild') },
    moderate: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: t('emergency.severity.moderate') },
    severe: { bg: 'bg-red-500/20', text: 'text-red-400', label: t('emergency.severity.severe') },
  }[severity];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${severity === 'mild' ? 'bg-green-400' : severity === 'moderate' ? 'bg-amber-400' : 'bg-red-400'}`} />
      {config.label}
    </span>
  );
}

// ─── Step 1: What do you see? ───

function StepSelectIssue() {
  const { t } = useTranslation();
  const selectIssue = useEmergencyStore((s) => s.selectIssue);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-xl font-serif font-bold text-[var(--text)]">
          {t('emergency.whatDoYouSee')}
        </h2>
        <p className="text-sm text-[var(--text3)] mt-1">
          {t('emergency.selectIssueHint')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1">
        {ISSUE_OPTIONS.map((option) => (
          <button
            key={option.type}
            onClick={() => selectIssue(option.type)}
            className="
              flex flex-col items-center justify-center gap-3
              p-4 rounded-xl border border-[var(--border)]
              bg-[var(--bg2)] hover:bg-[var(--bg3)] hover:border-[var(--border2)]
              transition-all duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)]
              active:scale-[0.97]
            "
          >
            <span className="text-3xl" role="img" aria-hidden="true">{option.emoji}</span>
            <span className="text-xs font-medium text-[var(--text)] text-center leading-tight">
              {t(option.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Take a Photo ───

function StepTakePhoto() {
  const { t } = useTranslation();
  const photos = useEmergencyStore((s) => s.photos);
  const addPhoto = useEmergencyStore((s) => s.addPhoto);
  const removePhoto = useEmergencyStore((s) => s.removePhoto);
  const runDiagnosis = useEmergencyStore((s) => s.runDiagnosis);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const handleCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Read file as data URL
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;

      // Try to get GPS
      let gps: { latitude: number; longitude: number; accuracy: number } | null = null;
      setGettingLocation(true);
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 30000,
          });
        });
        gps = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
      } catch {
        // GPS unavailable — continue without
      }
      setGettingLocation(false);

      addPhoto({
        id: `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        dataUrl,
        timestamp: Date.now(),
        gps,
      });
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addPhoto]);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text)]">
          {t('emergency.takePhoto')}
        </h2>
        <p className="text-sm text-[var(--text3)] mt-1">
          {t('emergency.takePhotoHint')}
        </p>
      </div>

      {/* Camera input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
        aria-label={t('emergency.takePhoto')}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="
          flex items-center justify-center gap-3
          w-full py-4 rounded-xl
          border-2 border-dashed border-[var(--border2)]
          bg-[var(--bg2)] hover:bg-[var(--bg3)]
          text-[var(--green)] font-medium text-sm
          transition-colors
        "
      >
        {gettingLocation ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Camera size={20} />
        )}
        {photos.length === 0
          ? t('emergency.openCamera')
          : t('emergency.addAnotherPhoto')}
      </button>

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative group rounded-lg overflow-hidden aspect-square">
              <img
                src={photo.dataUrl}
                alt={t('emergency.capturedPhoto')}
                className="w-full h-full object-cover"
              />
              {photo.gps && (
                <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                  <MapPin size={9} />
                  GPS
                </div>
              )}
              <button
                onClick={() => removePhoto(photo.id)}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t('common.delete')}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-auto pt-4 flex flex-col gap-2">
        <button
          onClick={runDiagnosis}
          disabled={photos.length === 0}
          className="
            flex items-center justify-center gap-2
            w-full py-3.5 rounded-xl
            bg-[var(--green)] text-forest-950 font-semibold text-sm
            hover:bg-[var(--green2)] disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors
          "
        >
          <Sparkles size={16} />
          {t('emergency.analyzePhotos')}
        </button>
        <button
          onClick={() => {
            // Skip photo step — go straight to diagnosis
            runDiagnosis();
          }}
          className="
            flex items-center justify-center gap-2
            w-full py-3 rounded-xl
            bg-transparent text-[var(--text3)] hover:text-[var(--text2)] text-sm
            transition-colors
          "
        >
          <SkipForward size={14} />
          {t('emergency.skipPhoto')}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: AI Diagnosis ───

function StepDiagnosis() {
  const { t, i18n } = useTranslation();
  const diagnosis = useEmergencyStore((s) => s.diagnosis);
  const isAnalyzing = useEmergencyStore((s) => s.isAnalyzing);
  const photos = useEmergencyStore((s) => s.photos);
  const goToStep = useEmergencyStore((s) => s.goToStep);
  const isSv = i18n.language === 'sv';

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          <Sparkles size={20} className="absolute inset-0 m-auto text-[var(--green)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--text)]">{t('emergency.analyzing')}</p>
          <p className="text-xs text-[var(--text3)] mt-1">{t('emergency.analyzingHint')}</p>
        </div>
      </div>
    );
  }

  if (!diagnosis) return null;

  const confidencePercent = Math.round(diagnosis.confidence * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text)]">
          {t('emergency.aiDiagnosis')}
        </h2>
      </div>

      {/* Photo with overlay */}
      {photos.length > 0 && (
        <div className="relative rounded-xl overflow-hidden mb-4">
          <img
            src={photos[0].dataUrl}
            alt={t('emergency.capturedPhoto')}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3">
            <SeverityBadge severity={diagnosis.severity} />
          </div>
        </div>
      )}

      {/* Diagnosis card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4">
        <p className="text-xs text-[var(--text3)] uppercase tracking-wider font-mono mb-1">
          {t('emergency.aiDiagnosis')}
        </p>
        <h3 className="text-base font-semibold text-[var(--text)] mb-2">
          {isSv ? diagnosis.titleSv : diagnosis.title}
        </h3>
        {diagnosis.scientificName && (
          <p className="text-xs text-[var(--text3)] italic mb-2">
            {diagnosis.scientificName}
          </p>
        )}
        <p className="text-sm text-[var(--text2)] leading-relaxed">
          {isSv ? diagnosis.descriptionSv : diagnosis.description}
        </p>

        {/* Confidence bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider font-mono">
              {t('emergency.confidence')}
            </span>
            <span className="text-xs font-mono text-[var(--text2)]">
              {confidencePercent}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${confidencePercent}%`,
                background: confidencePercent >= 80
                  ? 'var(--green)'
                  : confidencePercent >= 50
                    ? 'var(--amber)'
                    : 'var(--red)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Continue */}
      <div className="mt-auto">
        <button
          onClick={() => goToStep('action_plan')}
          className="
            flex items-center justify-center gap-2
            w-full py-3.5 rounded-xl
            bg-[var(--green)] text-forest-950 font-semibold text-sm
            hover:bg-[var(--green2)]
            transition-colors
          "
        >
          {t('emergency.whatToDoNow')}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Step 4: Action Plan ───

function StepActionPlan() {
  const { t, i18n } = useTranslation();
  const actions = useEmergencyStore((s) => s.actions);
  const diagnosis = useEmergencyStore((s) => s.diagnosis);
  const toggleAction = useEmergencyStore((s) => s.toggleAction);
  const saveReport = useEmergencyStore((s) => s.saveReport);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isSv = i18n.language === 'sv';

  const priorityConfig = {
    immediate: {
      color: 'bg-red-500/20 border-red-500/30 text-red-400',
      dot: 'bg-red-500',
      label: t('emergency.priority.immediate'),
    },
    within_7_days: {
      color: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
      dot: 'bg-amber-500',
      label: t('emergency.priority.within7Days'),
    },
    within_30_days: {
      color: 'bg-green-500/20 border-green-500/30 text-green-400',
      dot: 'bg-green-500',
      label: t('emergency.priority.within30Days'),
    },
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveReport();
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6">
        <div className="w-16 h-16 rounded-full bg-[var(--green)]/10 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-[var(--green)]" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-serif font-bold text-[var(--text)] mb-2">
            {t('emergency.reportSaved')}
          </h2>
          <p className="text-sm text-[var(--text3)]">
            {t('emergency.reportSavedHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h2 className="text-xl font-serif font-bold text-[var(--text)]">
          {t('emergency.whatToDoNow')}
        </h2>
        {diagnosis && (
          <p className="text-xs text-[var(--text3)] mt-1">
            {isSv ? diagnosis.titleSv : diagnosis.title}
          </p>
        )}
      </div>

      {/* Action list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {actions.map((action) => {
          const config = priorityConfig[action.priority];
          return (
            <button
              key={action.id}
              onClick={() => toggleAction(action.id)}
              className={`
                w-full text-left p-3.5 rounded-xl border transition-all duration-150
                ${action.completed
                  ? 'bg-[var(--bg3)] border-[var(--border)] opacity-60'
                  : `${config.color}`
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
                  flex items-center justify-center transition-colors
                  ${action.completed
                    ? 'bg-[var(--green)] border-[var(--green)]'
                    : 'border-current'
                  }
                `}>
                  {action.completed && <CheckCircle2 size={12} className="text-forest-950" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                    <span className="text-[10px] font-mono uppercase tracking-wider">
                      {config.label}
                    </span>
                  </div>
                  <p className={`text-sm leading-relaxed ${action.completed ? 'line-through text-[var(--text3)]' : 'text-[var(--text)]'}`}>
                    {isSv ? action.textSv : action.text}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-2">
        {/* Request Inspection */}
        <a
          href="https://www.skogsstyrelsen.se"
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center justify-center gap-2
            w-full py-3 rounded-xl
            border border-[var(--border2)] bg-[var(--bg2)]
            text-[var(--text)] hover:bg-[var(--bg3)] text-sm font-medium
            transition-colors
          "
        >
          <Phone size={14} />
          {t('emergency.requestInspection')}
        </a>

        {/* Save Report */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="
            flex items-center justify-center gap-2
            w-full py-3.5 rounded-xl
            bg-[var(--green)] text-forest-950 font-semibold text-sm
            hover:bg-[var(--green2)] disabled:opacity-60
            transition-colors
          "
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {t('emergency.saveReport')}
        </button>
      </div>
    </div>
  );
}

// ─── Main Flow Container ───

const STEP_COMPONENTS: Record<string, React.FC> = {
  select_issue: StepSelectIssue,
  take_photo: StepTakePhoto,
  ai_diagnosis: StepDiagnosis,
  action_plan: StepActionPlan,
};

const STEP_ORDER = ['select_issue', 'take_photo', 'ai_diagnosis', 'action_plan'] as const;

export function EmergencyFlow() {
  const { t } = useTranslation();
  const isOpen = useEmergencyStore((s) => s.isOpen);
  const currentStep = useEmergencyStore((s) => s.currentStep);
  const closeEmergency = useEmergencyStore((s) => s.closeEmergency);
  const goToStep = useEmergencyStore((s) => s.goToStep);

  if (!isOpen) return null;

  const stepIndex = STEP_ORDER.indexOf(currentStep);
  const StepComponent = STEP_COMPONENTS[currentStep];
  const canGoBack = stepIndex > 0 && currentStep !== 'ai_diagnosis';

  const handleBack = () => {
    if (stepIndex > 0) {
      goToStep(STEP_ORDER[stepIndex - 1]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('emergency.somethingsWrong')}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={closeEmergency}
      />

      {/* Panel */}
      <div className="
        relative z-10 w-full sm:max-w-md
        max-h-[90vh] sm:max-h-[85vh]
        bg-[var(--bg)] border border-[var(--border)]
        rounded-t-2xl sm:rounded-2xl
        flex flex-col
        shadow-2xl shadow-black/50
        animate-in slide-in-from-bottom duration-300
      ">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {canGoBack && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
                aria-label={t('common.back')}
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-sm font-semibold text-[var(--text)]">
                {t('emergency.somethingsWrong')}
              </span>
            </div>
          </div>
          <button
            onClick={closeEmergency}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-4 pt-3">
          {STEP_ORDER.map((step, i) => (
            <div
              key={step}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= stepIndex ? 'bg-red-500' : 'bg-[var(--bg3)]'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 min-h-[400px]">
          <StepComponent />
        </div>
      </div>
    </div>
  );
}
