import { X, Upload, Loader2 } from 'lucide-react';
import type { CapturedPhoto } from './useCamera';

interface UploadProgress {
  photoId: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'done' | 'error';
}

interface CaptureGalleryProps {
  photos: CapturedPhoto[];
  onRemove: (id: string) => void;
  onUploadAll: () => void;
  uploadProgress?: UploadProgress[];
  isUploading?: boolean;
}

export function CaptureGallery({
  photos,
  onRemove,
  onUploadAll,
  uploadProgress = [],
  isUploading = false,
}: CaptureGalleryProps) {
  if (photos.length === 0) return null;

  const getProgress = (photoId: string): UploadProgress | undefined =>
    uploadProgress.find((p) => p.photoId === photoId);

  return (
    <div className="w-full">
      {/* Header with count + upload button */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-[var(--text)]">Captured Photos</h3>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--green)]/20 text-[var(--green)] text-[10px] font-mono font-bold">
            {photos.length}
          </span>
        </div>
        <button
          onClick={onUploadAll}
          disabled={isUploading || photos.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Upload size={14} />
          )}
          {isUploading ? 'Uploading...' : 'Upload All'}
        </button>
      </div>

      {/* Horizontal scrollable thumbnail strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {photos.map((photo) => {
          const progress = getProgress(photo.id);

          return (
            <div key={photo.id} className="relative flex-shrink-0 group">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)] bg-forest-900">
                <img
                  src={photo.thumbnailUrl}
                  alt="Capture"
                  className="w-full h-full object-cover"
                />

                {/* Upload progress overlay */}
                {progress && progress.status !== 'done' && (
                  <div className="absolute inset-0 bg-forest-950/60 flex items-center justify-center rounded-lg">
                    {progress.status === 'uploading' && (
                      <div className="w-12 h-12 relative">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            fill="none"
                            stroke="var(--border)"
                            strokeWidth="3"
                          />
                          <circle
                            cx="18"
                            cy="18"
                            r="15"
                            fill="none"
                            stroke="var(--green)"
                            strokeWidth="3"
                            strokeDasharray={`${(progress.progress / 100) * 94.2} 94.2`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-[var(--green)]">
                          {progress.progress}%
                        </span>
                      </div>
                    )}
                    {progress.status === 'error' && (
                      <span className="text-[10px] text-danger font-medium">Failed</span>
                    )}
                    {progress.status === 'pending' && (
                      <Loader2 size={16} className="text-[var(--text3)] animate-spin" />
                    )}
                  </div>
                )}

                {/* Done checkmark */}
                {progress?.status === 'done' && (
                  <div className="absolute inset-0 bg-[var(--green)]/20 flex items-center justify-center rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[var(--green)] flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path
                          d="M2 6L5 9L10 3"
                          stroke="var(--bg)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Remove button */}
              {(!progress || progress.status === 'error') && (
                <button
                  onClick={() => onRemove(photo.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={10} className="text-white" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
