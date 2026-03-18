/**
 * ExportProgress — export progress modal with step indicator,
 * per-category progress bars, time estimate, cancel/download.
 */

import {
  X,
  Loader2,
  Download,
  Check,
  Package,
  Database,
  FolderArchive,
  CheckCircle2,
} from 'lucide-react';
import type { ExportJob, ExportCategory } from '@/hooks/useDataExport';
import { formatFileSize } from '@/hooks/useDataExport';

// ─── Step config ───

const STEPS = [
  { id: 'preparing', label: 'Forbereder', icon: Database },
  { id: 'collecting', label: 'Samlar data', icon: Package },
  { id: 'packing', label: 'Packar', icon: FolderArchive },
  { id: 'complete', label: 'Klar', icon: CheckCircle2 },
] as const;

function getStepIndex(status: string): number {
  const idx = STEPS.findIndex((s) => s.id === status);
  return idx >= 0 ? idx : 0;
}

interface ExportProgressProps {
  job: ExportJob;
  selectedCategories: ExportCategory[];
  onCancel: () => void;
  onDismiss: () => void;
}

export function ExportProgress({
  job,
  selectedCategories,
  onCancel,
  onDismiss,
}: ExportProgressProps) {
  const currentStep = getStepIndex(job.status);
  const isComplete = job.status === 'complete';
  const isError = job.status === 'error';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isComplete
                  ? 'bg-[var(--green)]/15'
                  : isError
                    ? 'bg-red-500/15'
                    : 'bg-[var(--green)]/10'
              }`}
            >
              {isComplete ? (
                <CheckCircle2 size={20} className="text-[var(--green)]" />
              ) : isError ? (
                <X size={20} className="text-red-400" />
              ) : (
                <Loader2 size={20} className="text-[var(--green)] animate-spin" />
              )}
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[var(--text)]">
                {isComplete ? 'Export klar!' : isError ? 'Export misslyckades' : 'Exporterar data...'}
              </h2>
              <p className="text-xs text-[var(--text3)]">
                {isComplete
                  ? `${formatFileSize(job.totalSizeBytes)} redo att ladda ner`
                  : isError
                    ? job.error
                    : `Beraknad tid: ${job.estimatedTimeRemaining}s`}
              </p>
            </div>
          </div>
          {(isComplete || isError) && (
            <button
              onClick={onDismiss}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Step indicator */}
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = i === currentStep;
              const isDone = i < currentStep;

              return (
                <div key={step.id} className="flex items-center gap-1.5 flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone
                        ? 'bg-[var(--green)] text-white'
                        : isActive
                          ? 'bg-[var(--green)]/20 text-[var(--green)] ring-2 ring-[var(--green)]/30'
                          : 'bg-[var(--bg3)] text-[var(--text3)]'
                    }`}
                  >
                    {isDone ? <Check size={14} /> : <StepIcon size={14} />}
                  </div>
                  <span
                    className={`text-[10px] font-medium hidden sm:inline ${
                      isActive ? 'text-[var(--green)]' : isDone ? 'text-[var(--text2)]' : 'text-[var(--text3)]'
                    }`}
                  >
                    {step.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-1 ${
                        isDone ? 'bg-[var(--green)]/40' : 'bg-[var(--border)]'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Overall progress bar */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-[var(--text2)]">Totalt</span>
              <span className="text-xs font-mono text-[var(--green)]">{job.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--green)] transition-all duration-300 ease-out"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>

          {/* Per-category progress */}
          <div className="space-y-2.5 max-h-48 overflow-y-auto">
            {selectedCategories.map((cat) => {
              const catProgress = job.categoryProgress[cat.id] ?? 0;
              const catDone = catProgress >= 100;

              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <div className="w-4 flex-shrink-0">
                    {catDone ? (
                      <Check size={12} className="text-[var(--green)]" />
                    ) : (
                      <Loader2 size={12} className="text-[var(--text3)] animate-spin" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] text-[var(--text2)] truncate">{cat.nameSv}</span>
                      <span className="text-[10px] font-mono text-[var(--text3)] ml-2">
                        {Math.round(catProgress)}%
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          catDone ? 'bg-[var(--green)]' : 'bg-[var(--green)]/60'
                        }`}
                        style={{ width: `${Math.round(catProgress)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            {!isComplete && !isError && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
              >
                Avbryt
              </button>
            )}
            {isComplete && (
              <button
                onClick={onDismiss}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all shadow-lg shadow-[var(--green)]/20"
              >
                <Download size={14} />
                Ladda ner ({formatFileSize(job.totalSizeBytes)})
              </button>
            )}
            {isError && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 rounded-lg text-xs font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-colors"
              >
                Stang
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
