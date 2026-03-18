import { useState, useCallback, useRef, type ChangeEvent, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Upload,
  User,
  Shield,
  Cpu,
  Image,
  X,
  Loader2,
} from 'lucide-react';

// ─── Types ───

interface PersonalInfo {
  full_name: string;
  email: string;
  phone: string;
  county: string;
}

interface Credentials {
  license_number: string;
  license_file: File | null;
  insurance_file: File | null;
}

interface Equipment {
  drone_model: string;
  camera_specs: string;
  has_rtk: boolean;
  has_multispectral: boolean;
  has_thermal: boolean;
}

// ─── Constants ───

const SWEDISH_COUNTIES = [
  'Blekinge', 'Dalarna', 'Gotland', 'Gävleborg', 'Halland',
  'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten',
  'Skåne', 'Stockholm', 'Södermanland', 'Uppsala', 'Värmland',
  'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland',
  'Örebro', 'Östergötland',
];

const DRONE_MODELS = [
  'DJI Mavic 3',
  'DJI Mavic 3 Multispectral',
  'DJI Matrice 350 RTK',
  'DJI Matrice 30T',
  'DJI Phantom 4 RTK',
  'senseFly eBee X',
  'senseFly eBee TAC',
  'Autel EVO II Pro',
  'Autel EVO II Dual 640T',
  'Freefly Astro',
  'Wingtra WingtraOne',
  'Other',
];

const STEPS = [
  { icon: User, label: 'Personal Info' },
  { icon: Shield, label: 'Credentials' },
  { icon: Cpu, label: 'Equipment' },
  { icon: Image, label: 'Sample Work' },
];

// ─── Component ───

export function PilotApplicationForm({ onSubmitted }: { onSubmitted?: () => void }) {
  const { t: _t } = useTranslation();
  const { profile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [personal, setPersonal] = useState<PersonalInfo>({
    full_name: profile?.full_name ?? '',
    email: profile?.email ?? '',
    phone: '',
    county: '',
  });

  const [credentials, setCredentials] = useState<Credentials>({
    license_number: '',
    license_file: null,
    insurance_file: null,
  });

  const [equipment, setEquipment] = useState<Equipment>({
    drone_model: '',
    camera_specs: '',
    has_rtk: false,
    has_multispectral: false,
    has_thermal: false,
  });

  const [sampleImages, setSampleImages] = useState<File[]>([]);

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!(personal.full_name && personal.email && personal.phone && personal.county);
      case 1:
        return !!(credentials.license_number && credentials.license_file && credentials.insurance_file);
      case 2:
        return !!(equipment.drone_model && equipment.camera_specs);
      case 3:
        return sampleImages.length >= 3;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const { data, error } = await supabase.storage.from('pilot-uploads').upload(path, file, {
      upsert: true,
    });
    if (error) throw error;
    return data.path;
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    try {
      const userId = profile.id;
      const timestamp = Date.now();

      // Upload files
      const licensePath = credentials.license_file
        ? await uploadFile(credentials.license_file, `${userId}/license-${timestamp}.pdf`)
        : null;
      const insurancePath = credentials.insurance_file
        ? await uploadFile(credentials.insurance_file, `${userId}/insurance-${timestamp}.pdf`)
        : null;

      const samplePaths: string[] = [];
      for (let i = 0; i < sampleImages.length; i++) {
        const path = await uploadFile(
          sampleImages[i],
          `${userId}/samples/sample-${timestamp}-${i}.${sampleImages[i].name.split('.').pop()}`,
        );
        samplePaths.push(path);
      }

      // Create pilot profile record
      const { error: dbError } = await supabase.from('pilot_profiles').insert({
        user_id: userId,
        full_name: personal.full_name,
        email: personal.email,
        phone: personal.phone,
        county: personal.county,
        license_number: credentials.license_number,
        license_file_path: licensePath,
        insurance_file_path: insurancePath,
        drone_model: equipment.drone_model,
        camera_specs: equipment.camera_specs,
        has_rtk: equipment.has_rtk,
        has_multispectral: equipment.has_multispectral,
        has_thermal: equipment.has_thermal,
        sample_image_paths: samplePaths,
        status: 'submitted',
      });

      if (dbError) throw dbError;
      onSubmitted?.();
    } catch (err: any) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* ─── Progress Stepper ─── */}
      <div className="flex items-center justify-between mb-8">
        {STEPS.map((s, i) => {
          const _Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-medium ${
                  isActive
                    ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                    : isDone
                      ? 'text-[var(--green)] cursor-pointer hover:bg-[var(--bg3)]'
                      : 'text-[var(--text3)] cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono ${
                    isActive
                      ? 'bg-[var(--green)] text-[var(--bg)]'
                      : isDone
                        ? 'bg-[var(--green)]/20 text-[var(--green)]'
                        : 'bg-[var(--bg3)] text-[var(--text3)]'
                  }`}
                >
                  {isDone ? <Check size={14} /> : i + 1}
                </div>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 ${isDone ? 'bg-[var(--green)]/40' : 'bg-[var(--border)]'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Step Content ─── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 lg:p-6">
        {step === 0 && (
          <StepPersonal personal={personal} onChange={setPersonal} />
        )}
        {step === 1 && (
          <StepCredentials credentials={credentials} onChange={setCredentials} />
        )}
        {step === 2 && (
          <StepEquipment equipment={equipment} onChange={setEquipment} />
        )}
        {step === 3 && (
          <StepSamples images={sampleImages} onChange={setSampleImages} />
        )}

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/30 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
          <button
            onClick={handleBack}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={14} />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-5 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Sub-Components ───

function StepPersonal({
  personal,
  onChange,
}: {
  personal: PersonalInfo;
  onChange: (p: PersonalInfo) => void;
}) {
  const update = (field: keyof PersonalInfo, value: string) =>
    onChange({ ...personal, [field]: value });

  return (
    <div className="space-y-4">
      <h2 className="text-base font-serif font-bold text-[var(--text)]">Personal Information</h2>
      <p className="text-xs text-[var(--text3)]">Tell us about yourself so we can verify your identity.</p>

      <FieldGroup label="Full Name">
        <input
          type="text"
          value={personal.full_name}
          onChange={(e) => update('full_name', e.target.value)}
          placeholder="Johan Andersson"
          className="input-field"
        />
      </FieldGroup>

      <FieldGroup label="Email">
        <input
          type="email"
          value={personal.email}
          onChange={(e) => update('email', e.target.value)}
          placeholder="johan@example.com"
          className="input-field"
        />
      </FieldGroup>

      <FieldGroup label="Phone">
        <input
          type="tel"
          value={personal.phone}
          onChange={(e) => update('phone', e.target.value)}
          placeholder="+46 70 123 4567"
          className="input-field"
        />
      </FieldGroup>

      <FieldGroup label="County">
        <select
          value={personal.county}
          onChange={(e) => update('county', e.target.value)}
          className="input-field"
        >
          <option value="">Select county...</option>
          {SWEDISH_COUNTIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FieldGroup>
    </div>
  );
}

function StepCredentials({
  credentials,
  onChange,
}: {
  credentials: Credentials;
  onChange: (c: Credentials) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-serif font-bold text-[var(--text)]">Credentials</h2>
      <p className="text-xs text-[var(--text3)]">
        Provide your drone operator license and insurance documentation.
      </p>

      <FieldGroup label="Drone License Number">
        <input
          type="text"
          value={credentials.license_number}
          onChange={(e) => onChange({ ...credentials, license_number: e.target.value })}
          placeholder="SE-UAS-xxxx-xxxx"
          className="input-field"
        />
      </FieldGroup>

      <FieldGroup label="License PDF">
        <FileUploadZone
          accept=".pdf"
          file={credentials.license_file}
          onFile={(f) => onChange({ ...credentials, license_file: f })}
          label="Upload drone license (PDF)"
        />
      </FieldGroup>

      <FieldGroup label="Insurance Proof">
        <FileUploadZone
          accept=".pdf,.jpg,.png"
          file={credentials.insurance_file}
          onFile={(f) => onChange({ ...credentials, insurance_file: f })}
          label="Upload insurance document"
        />
      </FieldGroup>
    </div>
  );
}

function StepEquipment({
  equipment,
  onChange,
}: {
  equipment: Equipment;
  onChange: (e: Equipment) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-serif font-bold text-[var(--text)]">Equipment</h2>
      <p className="text-xs text-[var(--text3)]">Tell us about your drone and camera setup.</p>

      <FieldGroup label="Drone Model">
        <select
          value={equipment.drone_model}
          onChange={(e) => onChange({ ...equipment, drone_model: e.target.value })}
          className="input-field"
        >
          <option value="">Select model...</option>
          {DRONE_MODELS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup label="Camera Specifications">
        <input
          type="text"
          value={equipment.camera_specs}
          onChange={(e) => onChange({ ...equipment, camera_specs: e.target.value })}
          placeholder="e.g., 20MP Hasselblad, 4/3 CMOS"
          className="input-field"
        />
      </FieldGroup>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ToggleCard
          label="RTK GNSS"
          description="Real-time positioning"
          checked={equipment.has_rtk}
          onChange={(v) => onChange({ ...equipment, has_rtk: v })}
        />
        <ToggleCard
          label="Multispectral"
          description="NDVI-capable sensor"
          checked={equipment.has_multispectral}
          onChange={(v) => onChange({ ...equipment, has_multispectral: v })}
        />
        <ToggleCard
          label="Thermal"
          description="Infrared imaging"
          checked={equipment.has_thermal}
          onChange={(v) => onChange({ ...equipment, has_thermal: v })}
        />
      </div>
    </div>
  );
}

function StepSamples({
  images,
  onChange,
}: {
  images: File[];
  onChange: (files: File[]) => void;
}) {
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/'),
      );
      const newImages = [...images, ...files].slice(0, 5);
      onChange(newImages);
    },
    [images, onChange],
  );

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('image/'));
    const newImages = [...images, ...files].slice(0, 5);
    onChange(newImages);
  };

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-serif font-bold text-[var(--text)]">Sample Work</h2>
      <p className="text-xs text-[var(--text3)]">
        Upload 3-5 sample aerial images showcasing your work quality.
      </p>

      <div
        ref={dropRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
          dragOver
            ? 'border-[var(--green)] bg-[var(--green)]/5'
            : 'border-[var(--border)] hover:border-[var(--text3)]'
        }`}
      >
        <Upload size={24} className="mx-auto text-[var(--text3)] mb-2" />
        <p className="text-sm text-[var(--text2)] mb-1">
          Drag & drop images here
        </p>
        <p className="text-xs text-[var(--text3)] mb-3">or</p>
        <label className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)] cursor-pointer transition-colors border border-[var(--border)]">
          <Upload size={12} />
          Browse Files
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
        <p className="text-xs text-[var(--text3)] mt-2">
          {images.length}/5 images ({images.length < 3 ? `${3 - images.length} more required` : 'ready'})
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-[var(--border)]">
              <img
                src={URL.createObjectURL(img)}
                alt={`Sample ${i + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared UI Atoms ───

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-[var(--text2)] mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function FileUploadZone({
  accept,
  file,
  onFile,
  label,
}: {
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  label: string;
}) {
  return (
    <div className="relative">
      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5">
          <Check size={14} className="text-[var(--green)] flex-shrink-0" />
          <span className="text-xs text-[var(--text)] truncate flex-1">{file.name}</span>
          <button
            onClick={() => onFile(null)}
            className="text-[var(--text3)] hover:text-[var(--red)] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <label className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-[var(--border)] hover:border-[var(--text3)] cursor-pointer transition-colors">
          <Upload size={14} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text3)]">{label}</span>
          <input
            type="file"
            accept={accept}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

function ToggleCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`p-3 rounded-lg border text-left transition-all ${
        checked
          ? 'border-[var(--green)]/40 bg-[var(--green)]/10'
          : 'border-[var(--border)] bg-[var(--bg3)] hover:border-[var(--text3)]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[var(--text)]">{label}</span>
        <div
          className={`w-8 h-4 rounded-full relative transition-colors ${
            checked ? 'bg-[var(--green)]' : 'bg-[var(--text3)]/30'
          }`}
        >
          <div
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
              checked ? 'left-4' : 'left-0.5'
            }`}
          />
        </div>
      </div>
      <p className="text-[10px] text-[var(--text3)]">{description}</p>
    </button>
  );
}

// ─── Inline styles for form inputs ───
// Using a style tag approach to keep input-field consistent
const style = document.createElement('style');
style.textContent = `
  .input-field {
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 0.5rem;
    border: 1px solid var(--border);
    background: var(--bg3);
    color: var(--text);
    font-size: 0.8125rem;
    font-family: var(--font-sans);
    outline: none;
    transition: border-color 0.15s;
  }
  .input-field:focus {
    border-color: var(--green);
  }
  .input-field::placeholder {
    color: var(--text3);
  }
  .input-field option {
    background: var(--bg2);
    color: var(--text);
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('bs-input-styles')) {
  style.id = 'bs-input-styles';
  document.head.appendChild(style);
}
