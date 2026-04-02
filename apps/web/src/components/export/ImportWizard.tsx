/**
 * ImportWizard — data import wizard with 5 steps:
 *  1. Choose source (pcSKOG, Excel, Shapefile, GeoJSON, CSV)
 *  2. Upload file(s)
 *  3. Column mapping preview
 *  4. Validation summary
 *  5. Import confirmation
 * In demo mode, shows example with pre-loaded sample data.
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Map,
  Globe,
  FileCode,
  TreePine,
  ArrowRight,
  ArrowLeft,
  Check,
  Minus,
  AlertTriangle,
  CheckCircle2,
  X,
  File,
  Loader2,
} from 'lucide-react';

// ─── Types ───

type ImportSource = 'pcskog' | 'excel' | 'shapefile' | 'geojson' | 'csv';

interface ImportSourceConfig {
  id: ImportSource;
  label: string;
  description: string;
  icon: typeof FileSpreadsheet;
  extensions: string;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  sampleValues: string[];
  mapped: boolean;
}

interface ValidationResult {
  totalRows: number;
  validRows: number;
  warnings: string[];
  errors: string[];
}

// ─── Constants ───

const SOURCES: ImportSourceConfig[] = [
  {
    id: 'pcskog',
    label: 'pcSKOG',
    description: 'Importera skogsbruksplan fran pcSKOG',
    icon: TreePine,
    extensions: '.xml, .csv',
  },
  {
    id: 'excel',
    label: 'Excel',
    description: 'Kalkylblad med skiftes- eller skogsdata',
    icon: FileSpreadsheet,
    extensions: '.xlsx, .xls',
  },
  {
    id: 'shapefile',
    label: 'Shapefile',
    description: 'ESRI Shapefile med skiftesgranser',
    icon: Map,
    extensions: '.shp (.zip)',
  },
  {
    id: 'geojson',
    label: 'GeoJSON',
    description: 'GeoJSON med geometrier och attribut',
    icon: Globe,
    extensions: '.geojson, .json',
  },
  {
    id: 'csv',
    label: 'CSV',
    description: 'Komma- eller semikolonseparerad textfil',
    icon: FileCode,
    extensions: '.csv, .txt',
  },
];

const TARGET_FIELDS = [
  'Namn',
  'Kommun',
  'Areal (ha)',
  'Tradslag',
  'Alder',
  'Volym (m3sk)',
  'Halsoindex',
  'Status',
  'Latitud',
  'Longitud',
  '(Hoppa over)',
];

// ─── Demo column mappings ───

const DEMO_MAPPINGS: ColumnMapping[] = [
  {
    sourceColumn: 'Avdelning',
    targetField: 'Namn',
    sampleValues: ['Norra skogen', 'Ekbacken', 'Tallmon'],
    mapped: true,
  },
  {
    sourceColumn: 'Kommun_namn',
    targetField: 'Kommun',
    sampleValues: ['Varnamo', 'Gislaved', 'Jonkoping'],
    mapped: true,
  },
  {
    sourceColumn: 'Areal_ha',
    targetField: 'Areal (ha)',
    sampleValues: ['42.5', '18.3', '67.1'],
    mapped: true,
  },
  {
    sourceColumn: 'Dominerande_tradslag',
    targetField: 'Tradslag',
    sampleValues: ['Gran', 'Ek', 'Tall'],
    mapped: true,
  },
  {
    sourceColumn: 'Bestandsalder',
    targetField: 'Alder',
    sampleValues: ['65', '45', '80'],
    mapped: true,
  },
  {
    sourceColumn: 'Virkesforrad_m3sk',
    targetField: 'Volym (m3sk)',
    sampleValues: ['8500', '3200', '12400'],
    mapped: true,
  },
  {
    sourceColumn: 'Notering',
    targetField: '(Hoppa over)',
    sampleValues: ['', 'Nyckelbiotop', ''],
    mapped: false,
  },
];

const DEMO_VALIDATION: ValidationResult = {
  totalRows: 12,
  validRows: 11,
  warnings: [
    'Rad 7: "Areal_ha" saknas, satt till 0',
    'Rad 3: Koordinater utanfor Sverige, kontrollera WGS84/SWEREF99',
  ],
  errors: [
    'Rad 9: Duplicerat skiftesnamn "Ekbacken" — hoppas over',
  ],
};

// ─── Component ───

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportWizard({ isOpen, onClose }: ImportWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>(DEMO_MAPPINGS);
  const [validation] = useState<ValidationResult>(DEMO_VALIDATION);
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      setUploadedFiles(files);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadedFiles(files);
    }
  }, []);

  const handleMappingChange = useCallback((idx: number, targetField: string) => {
    setMappings((prev) =>
      prev.map((m, i) =>
        i === idx
          ? { ...m, targetField, mapped: targetField !== '(Hoppa over)' }
          : m,
      ),
    );
  }, []);

  const handleImport = useCallback(() => {
    setImporting(true);
    // Simulate import
    setTimeout(() => {
      setImporting(false);
      setImportComplete(true);
    }, 2000);
  }, []);

  const handleReset = useCallback(() => {
    setStep(0);
    setSelectedSource(null);
    setUploadedFiles([]);
    setMappings(DEMO_MAPPINGS);
    setImporting(false);
    setImportComplete(false);
  }, []);

  const canProceed = () => {
    switch (step) {
      case 0: return selectedSource !== null;
      case 1: return uploadedFiles.length > 0 || selectedSource !== null; // demo: allow proceed
      case 2: return mappings.some((m) => m.mapped);
      case 3: return true;
      case 4: return importComplete;
      default: return false;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--bg)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center">
              <Upload size={20} className="text-[var(--green)]" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[var(--text)]">
                Importera data
              </h2>
              <p className="text-xs text-[var(--text3)]">Byt till BeetleSense fran ett annat system</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-5 pt-4 pb-2">
          <div className="flex items-center gap-1">
            {['Kalla', 'Ladda upp', 'Mappning', 'Validering', 'Klar'].map((label, i) => (
              <div key={label} className="flex items-center gap-1 flex-1">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
                    i < step
                      ? 'bg-[var(--green)] text-white'
                      : i === step
                        ? 'bg-[var(--green)]/20 text-[var(--green)] ring-2 ring-[var(--green)]/30'
                        : 'bg-[var(--bg3)] text-[var(--text3)]'
                  }`}
                >
                  {i < step ? <Check size={10} /> : i + 1}
                </div>
                <span
                  className={`text-[9px] hidden sm:inline ${
                    i === step ? 'text-[var(--green)] font-medium' : 'text-[var(--text3)]'
                  }`}
                >
                  {label}
                </span>
                {i < 4 && <div className={`flex-1 h-px ${i < step ? 'bg-[var(--green)]/40' : 'bg-[var(--border)]'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Step 1: Choose source */}
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SOURCES.map((src) => {
                const Icon = src.icon;
                const isSelected = selectedSource === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => setSelectedSource(src.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-[var(--green)]/40 bg-[var(--green)]/5 ring-1 ring-[var(--green)]/20'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border2)]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-[var(--green)]/15 text-[var(--green)]' : 'bg-[var(--bg3)] text-[var(--text3)]'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className={`text-sm font-semibold ${isSelected ? 'text-[var(--text)]' : 'text-[var(--text2)]'}`}>
                        {src.label}
                      </span>
                      <p className="text-[11px] text-[var(--text3)] mt-0.5">{src.description}</p>
                      <p className="text-[10px] text-[var(--text3)] mt-1 font-mono">{src.extensions}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Upload file(s) */}
          {step === 1 && (
            <div>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center cursor-pointer hover:border-[var(--green)]/40 hover:bg-[var(--green)]/5 transition-all"
              >
                <Upload size={32} className="mx-auto text-[var(--text3)] mb-3" />
                <p className="text-sm font-medium text-[var(--text2)]">
                  Dra filer hit eller klicka for att valja
                </p>
                <p className="text-xs text-[var(--text3)] mt-1">
                  {SOURCES.find((s) => s.id === selectedSource)?.extensions}
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept={SOURCES.find((s) => s.id === selectedSource)?.extensions.replace(/\s/g, '')}
                />
              </div>

              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/5"
                    >
                      <File size={14} className="text-[var(--green)]" />
                      <span className="text-xs text-[var(--text)] flex-1 truncate">{file.name}</span>
                      <span className="text-[10px] text-[var(--text3)] font-mono">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Demo hint */}
              {uploadedFiles.length === 0 && (
                <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                  <p className="text-[11px] text-blue-400">
                    <strong>Demo:</strong> Klicka "Nasta" for att se ett exempel med forladdade testdata fran pcSKOG.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Column mapping */}
          {step === 2 && (
            <div>
              <p className="text-xs text-[var(--text3)] mb-3">
                Koppla kolumnerna i din fil till BeetleSense-falt. Granska exempelvarden nedan.
              </p>
              <div className="space-y-2">
                {mappings.map((mapping, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                  >
                    {/* Source column */}
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium text-[var(--text)] font-mono">
                        {mapping.sourceColumn}
                      </span>
                      <p className="text-[10px] text-[var(--text3)] truncate mt-0.5">
                        {mapping.sampleValues.join(', ')}
                      </p>
                    </div>

                    <ArrowRight size={14} className="text-[var(--text3)] flex-shrink-0" />

                    {/* Target field selector */}
                    <select
                      value={mapping.targetField}
                      onChange={(e) => handleMappingChange(idx, e.target.value)}
                      className={`w-36 appearance-none rounded-lg border px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--green)]/50 ${
                        mapping.mapped
                          ? 'border-[var(--green)]/30 bg-[var(--green)]/5 text-[var(--green)]'
                          : 'border-[var(--border)] bg-[var(--bg2)] text-[var(--text3)]'
                      }`}
                    >
                      {TARGET_FIELDS.map((field) => (
                        <option key={field} value={field}>
                          {field}
                        </option>
                      ))}
                    </select>

                    {/* Status */}
                    <div className="w-5 flex-shrink-0">
                      {mapping.mapped ? (
                        <Check size={14} className="text-[var(--green)]" />
                      ) : (
                        <Minus size={14} className="text-[var(--text3)]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Validation summary */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-center">
                  <p className="text-2xl font-bold font-mono text-[var(--text)]">{validation.totalRows}</p>
                  <p className="text-[10px] text-[var(--text3)] mt-1">Totalt rader</p>
                </div>
                <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-3 text-center">
                  <p className="text-2xl font-bold font-mono text-[var(--green)]">{validation.validRows}</p>
                  <p className="text-[10px] text-[var(--text3)] mt-1">Giltiga</p>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                  <p className="text-2xl font-bold font-mono text-amber-400">
                    {validation.warnings.length + validation.errors.length}
                  </p>
                  <p className="text-[10px] text-[var(--text3)] mt-1">Problem</p>
                </div>
              </div>

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span className="text-xs font-semibold text-amber-400">Varningar</span>
                  </div>
                  <ul className="space-y-1">
                    {validation.warnings.map((w, i) => (
                      <li key={i} className="text-[11px] text-amber-300/80">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <X size={14} className="text-red-400" />
                    <span className="text-xs font-semibold text-red-400">Fel</span>
                  </div>
                  <ul className="space-y-1">
                    {validation.errors.map((e, i) => (
                      <li key={i} className="text-[11px] text-red-300/80">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-[var(--text3)]">
                {validation.validRows} av {validation.totalRows} rader kan importeras. Rader med fel hoppas over.
              </p>
            </div>
          )}

          {/* Step 5: Import confirmation */}
          {step === 4 && (
            <div className="text-center py-6">
              {importing ? (
                <div>
                  <Loader2 size={40} className="mx-auto text-[var(--green)] animate-spin mb-4" />
                  <p className="text-sm font-medium text-[var(--text)]">Importerar data...</p>
                  <p className="text-xs text-[var(--text3)] mt-1">
                    {validation.validRows} rader behandlas
                  </p>
                </div>
              ) : importComplete ? (
                <div>
                  <CheckCircle2 size={48} className="mx-auto text-[var(--green)] mb-4" />
                  <h3 className="text-lg font-serif font-bold text-[var(--text)]">Import klar!</h3>
                  <p className="text-sm text-[var(--text2)] mt-2">
                    {validation.validRows} poster har importerats till ditt konto.
                  </p>
                  <p className="text-xs text-[var(--text3)] mt-1">
                    Dina skiften och skogsdata finns nu i BeetleSense.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={onClose}
                      className="px-5 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
                    >
                      Visa mina skiften
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
                    >
                      Importera fler
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={40} className="mx-auto text-[var(--green)] mb-4" />
                  <h3 className="text-base font-semibold text-[var(--text)]">
                    Redo att importera
                  </h3>
                  <p className="text-xs text-[var(--text2)] mt-2">
                    {validation.validRows} poster fran{' '}
                    {SOURCES.find((s) => s.id === selectedSource)?.label ?? 'vald kalla'}{' '}
                    kommer att importeras.
                  </p>
                  <button
                    onClick={handleImport}
                    className="mt-4 px-6 py-2.5 rounded-lg text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--green)]/20"
                  >
                    Starta import
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        {!importComplete && (
          <div className="sticky bottom-0 flex items-center justify-between p-5 border-t border-[var(--border)] bg-[var(--bg)]">
            <button
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text2)] transition-colors disabled:invisible"
            >
              <ArrowLeft size={14} />
              Tillbaka
            </button>

            {step < 4 && (
              <button
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 disabled:opacity-40 transition-all"
              >
                Nasta
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
