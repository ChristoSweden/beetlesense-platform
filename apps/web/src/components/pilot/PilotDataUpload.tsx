import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  Upload,
  FileImage,
  FileArchive,
  FileText,
  X,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

// ─── Types ───

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface UploadZoneConfig {
  id: string;
  label: string;
  description: string;
  accept: string;
  maxSizeMB: number;
  icon: typeof FileImage;
  required: boolean;
}

const ZONES: UploadZoneConfig[] = [
  {
    id: 'orthomosaic',
    label: 'Orthomosaic',
    description: 'GeoTIFF (.tif, .tiff) — max 2 GB',
    accept: '.tif,.tiff,.geotiff',
    maxSizeMB: 2048,
    icon: FileImage,
    required: true,
  },
  {
    id: 'raw_images',
    label: 'Raw Images',
    description: 'ZIP archive (.zip) — max 5 GB',
    accept: '.zip',
    maxSizeMB: 5120,
    icon: FileArchive,
    required: true,
  },
  {
    id: 'flight_log',
    label: 'Flight Log',
    description: 'CSV or JSON (.csv, .json) — max 50 MB',
    accept: '.csv,.json',
    maxSizeMB: 50,
    icon: FileText,
    required: false,
  },
];

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB chunks

// ─── Component ───

export function PilotDataUpload({
  jobId,
  onComplete,
}: {
  jobId: string;
  onComplete?: () => void;
}) {
  const { profile } = useAuthStore();
  const [files, setFiles] = useState<Record<string, UploadFile | null>>({
    orthomosaic: null,
    raw_images: null,
    flight_log: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const validateFile = (zone: UploadZoneConfig, file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const accepted = zone.accept.split(',');
    if (!accepted.includes(ext)) {
      return `Invalid file type. Accepted: ${zone.accept}`;
    }
    if (file.size > zone.maxSizeMB * 1024 * 1024) {
      return `File too large. Maximum: ${zone.maxSizeMB >= 1024 ? `${zone.maxSizeMB / 1024} GB` : `${zone.maxSizeMB} MB`}`;
    }
    return null;
  };

  const handleFileDrop = (zoneId: string, zone: UploadZoneConfig, droppedFile: File) => {
    const validationError = validateFile(zone, droppedFile);
    if (validationError) {
      setFiles((prev) => ({
        ...prev,
        [zoneId]: { file: droppedFile, progress: 0, status: 'error', error: validationError },
      }));
      return;
    }
    setFiles((prev) => ({
      ...prev,
      [zoneId]: { file: droppedFile, progress: 0, status: 'pending' },
    }));
  };

  const removeFile = (zoneId: string) => {
    setFiles((prev) => ({ ...prev, [zoneId]: null }));
  };

  const uploadFileChunked = async (zoneId: string, file: File): Promise<string> => {
    const userId = profile!.id;
    const path = `${userId}/jobs/${jobId}/${zoneId}/${file.name}`;

    // For smaller files, use direct upload
    if (file.size <= CHUNK_SIZE) {
      setFiles((prev) => ({
        ...prev,
        [zoneId]: prev[zoneId] ? { ...prev[zoneId]!, progress: 0, status: 'uploading' } : null,
      }));

      const { error } = await supabase.storage.from('pilot-data').upload(path, file, {
        upsert: true,
      });

      if (error) throw error;

      setFiles((prev) => ({
        ...prev,
        [zoneId]: prev[zoneId] ? { ...prev[zoneId]!, progress: 100, status: 'done' } : null,
      }));

      return path;
    }

    // Chunked upload simulation with progress
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const chunkPath = totalChunks === 1 ? path : `${path}.part${i}`;

      const { error } = await supabase.storage.from('pilot-data').upload(chunkPath, chunk, {
        upsert: true,
      });

      if (error) throw error;

      const progress = Math.round(((i + 1) / totalChunks) * 100);
      setFiles((prev) => ({
        ...prev,
        [zoneId]: prev[zoneId]
          ? { ...prev[zoneId]!, progress, status: progress === 100 ? 'done' : 'uploading' }
          : null,
      }));
    }

    return path;
  };

  const handleSubmit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError(null);

    try {
      const uploadPaths: Record<string, string> = {};

      for (const zone of ZONES) {
        const fileEntry = files[zone.id];
        if (!fileEntry && zone.required) {
          throw new Error(`${zone.label} is required.`);
        }
        if (fileEntry && fileEntry.status !== 'error') {
          const path = await uploadFileChunked(zone.id, fileEntry.file);
          uploadPaths[zone.id] = path;
        }
      }

      // Update job status
      const { error: dbError } = await supabase
        .from('jobs')
        .update({
          status: 'data_submitted',
          upload_paths: uploadPaths,
          data_submitted_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (dbError) throw dbError;

      setComplete(true);
      onComplete?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const allRequiredReady = ZONES.filter((z) => z.required).every(
    (z) => files[z.id] && files[z.id]!.status !== 'error',
  );

  if (complete) {
    return (
      <div className="rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 p-8 text-center">
        <Check size={32} className="mx-auto text-[var(--green)] mb-3" />
        <h3 className="text-base font-serif font-bold text-[var(--text)] mb-1">
          Data Submitted Successfully
        </h3>
        <p className="text-xs text-[var(--text3)]">
          Your data is being processed. You will be notified when review is complete.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-serif font-bold text-[var(--text)]">Upload Captured Data</h3>
      <p className="text-xs text-[var(--text3)]">
        Upload your orthomosaic, raw images, and flight log for this mission.
      </p>

      {ZONES.map((zone) => (
        <DropZone
          key={zone.id}
          zone={zone}
          uploadFile={files[zone.id]}
          onDrop={(file) => handleFileDrop(zone.id, zone, file)}
          onRemove={() => removeFile(zone.id)}
        />
      ))}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!allRequiredReady || submitting}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--green)] text-[var(--bg)] hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload size={16} />
            Submit Data
          </>
        )}
      </button>
    </div>
  );
}

// ─── Drop Zone ───

function DropZone({
  zone,
  uploadFile,
  onDrop,
  onRemove,
}: {
  zone: UploadZoneConfig;
  uploadFile: UploadFile | null;
  onDrop: (file: File) => void;
  onRemove: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = zone.icon;

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onDrop(file);
    },
    [onDrop],
  );

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onDrop(file);
  };

  if (uploadFile) {
    return (
      <div
        className={`rounded-xl border p-4 ${
          uploadFile.status === 'error'
            ? 'border-red-500/30 bg-red-500/5'
            : uploadFile.status === 'done'
              ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
              : 'border-[var(--border)] bg-[var(--bg2)]'
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={16} className={uploadFile.status === 'done' ? 'text-[var(--green)]' : 'text-[var(--text3)]'} />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text)] truncate">
                {uploadFile.file.name}
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                {(uploadFile.file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uploadFile.status === 'uploading' && (
              <span className="text-[10px] font-mono text-[var(--green)]">
                {uploadFile.progress}%
              </span>
            )}
            {uploadFile.status === 'done' && <Check size={14} className="text-[var(--green)]" />}
            {uploadFile.status !== 'uploading' && (
              <button
                onClick={onRemove}
                className="text-[var(--text3)] hover:text-[var(--red)] transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {(uploadFile.status === 'uploading' || uploadFile.status === 'done') && (
          <div className="h-1 rounded-full bg-[var(--bg3)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all duration-300"
              style={{ width: `${uploadFile.progress}%` }}
            />
          </div>
        )}

        {uploadFile.status === 'error' && (
          <p className="text-[10px] text-red-400 mt-1">{uploadFile.error}</p>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDrag}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
        dragOver
          ? 'border-[var(--green)] bg-[var(--green)]/5'
          : 'border-[var(--border)] hover:border-[var(--text3)]'
      }`}
    >
      <Icon size={20} className="mx-auto text-[var(--text3)] mb-2" />
      <p className="text-xs font-medium text-[var(--text)] mb-0.5">
        {zone.label}
        {zone.required && <span className="text-[var(--red)] ml-0.5">*</span>}
      </p>
      <p className="text-[10px] text-[var(--text3)]">{zone.description}</p>
      <input
        ref={inputRef}
        type="file"
        accept={zone.accept}
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}
