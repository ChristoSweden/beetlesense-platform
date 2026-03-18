import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Loader2, AlertCircle } from 'lucide-react';
import { type FolderKey, guessFolder, isAllowedType, formatFileSize } from '@/hooks/useDocumentVault';

interface UploadZoneProps {
  activeFolder: FolderKey | null;
  onUpload: (files: File[], folder?: FolderKey) => Promise<void>;
  isUploading: boolean;
  uploadProgress: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function UploadZone({ activeFolder, onUpload, isUploading, uploadProgress }: UploadZoneProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; folder: FolderKey }[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndStageFiles = useCallback(
    (fileList: FileList | File[]) => {
      setValidationError(null);
      const files = Array.from(fileList);
      const staged: { file: File; folder: FolderKey }[] = [];

      for (const file of files) {
        if (!isAllowedType(file.type)) {
          setValidationError(`${file.name}: ${t('vault.invalidFileType')}`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          setValidationError(`${file.name}: ${t('vault.fileTooLarge')}`);
          continue;
        }

        const folder = activeFolder ?? guessFolder(file.name);
        staged.push({ file, folder });
      }

      if (staged.length > 0) {
        setPendingFiles((prev) => [...prev, ...staged]);
      }
    },
    [activeFolder, t],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (e.dataTransfer.files.length > 0) {
        validateAndStageFiles(e.dataTransfer.files);
      }
    },
    [validateAndStageFiles],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        validateAndStageFiles(e.target.files);
        e.target.value = '';
      }
    },
    [validateAndStageFiles],
  );

  const handleUpload = useCallback(async () => {
    if (pendingFiles.length === 0) return;

    // Group by folder
    const filesByFolder = new Map<FolderKey, File[]>();
    for (const { file, folder } of pendingFiles) {
      const arr = filesByFolder.get(folder) ?? [];
      arr.push(file);
      filesByFolder.set(folder, arr);
    }

    for (const [folder, files] of filesByFolder) {
      await onUpload(files, folder);
    }

    setPendingFiles([]);
  }, [pendingFiles, onUpload]);

  const removePending = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragOver
              ? 'border-[var(--green)] bg-[var(--green)]/5 scale-[1.01]'
              : 'border-[var(--border2)] hover:border-[var(--green)]/50 hover:bg-[var(--bg3)]/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
          aria-label={t('vault.upload')}
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              isDragOver ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--bg3)] text-[var(--text3)]'
            }`}
          >
            <Upload size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--text)]">
              {t('vault.dragAndDrop')}
            </p>
            <p className="text-xs text-[var(--text3)] mt-1">
              PDF, {t('vault.images')}, Word, Excel &middot; max 50 MB
            </p>
          </div>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{validationError}</p>
          <button
            onClick={() => setValidationError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Pending files list */}
      {pendingFiles.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 space-y-2">
          <p className="text-xs font-semibold text-[var(--text2)] mb-2">
            {pendingFiles.length} {pendingFiles.length === 1 ? 'file' : 'files'} ready
          </p>

          {pendingFiles.map((item, i) => (
            <div
              key={`${item.file.name}-${i}`}
              className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">
                  {item.file.name}
                </p>
                <p className="text-[10px] text-[var(--text3)]">
                  {formatFileSize(item.file.size)} &middot; {t(`vault.folders.${item.folder}`)}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePending(i);
                }}
                className="p-1 rounded-md text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="w-full mt-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                {uploadProgress}%
              </>
            ) : (
              <>
                <Upload size={14} />
                {t('vault.upload')}
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload progress bar */}
      {isUploading && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text3)] text-center">
            {t('vault.uploading')}... {uploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
}
