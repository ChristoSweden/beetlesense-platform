import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Upload, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS, DEMO_SURVEYS } from '@/lib/demoData';
import { CaptureFlow } from '@/components/capture/CaptureFlow';
import { useOfflineUpload, type PendingUpload } from '@/components/capture/useOfflineUpload';
import type { CapturedPhoto } from '@/components/capture/useCamera';

interface ParcelOption {
  id: string;
  name: string;
}

interface SurveyOption {
  id: string;
  name: string;
  parcel_id: string;
}

async function performUpload(upload: PendingUpload): Promise<boolean> {
  const blob = new Blob([upload.blob], { type: upload.mimeType });
  const filePath = `uploads/${upload.surveyId ?? 'unassigned'}/${upload.fileName}`;

  const { error } = await supabase.storage.from('captures').upload(filePath, blob, {
    contentType: upload.mimeType,
    upsert: false,
  });

  if (error) {
    console.error('Upload failed:', error.message);
    return false;
  }

  // Record metadata
  await supabase.from('capture_photos').insert({
    survey_id: upload.surveyId,
    parcel_id: upload.parcelId,
    storage_path: filePath,
    gps_lat: upload.gps?.latitude ?? null,
    gps_lng: upload.gps?.longitude ?? null,
    captured_at: new Date(upload.timestamp).toISOString(),
  });

  return true;
}

export default function CapturePage() {
  const { t } = useTranslation();
  const [showCapture, setShowCapture] = useState(false);
  const [parcels, setParcels] = useState<ParcelOption[]>([]);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');

  const { queuedCount, pendingUploads, isSyncing, addToQueue, syncPending } =
    useOfflineUpload(performUpload);

  // Load parcels and surveys
  useEffect(() => {
    if (isDemo()) {
      setParcels(DEMO_PARCELS.map((p) => ({ id: p.id, name: p.name })));
      setSurveys(
        DEMO_SURVEYS.filter((s) => s.status === 'draft' || s.status === 'processing').map((s) => ({
          id: s.id,
          name: s.name,
          parcel_id: s.parcel_id,
        })),
      );
      return;
    }

    async function load() {
      const { data: parcelData } = await supabase
        .from('parcels')
        .select('id, name')
        .order('name');
      if (parcelData) setParcels(parcelData);

      const { data: surveyData } = await supabase
        .from('surveys')
        .select('id, name, parcel_id')
        .in('status', ['draft', 'processing'])
        .order('created_at', { ascending: false });
      if (surveyData) setSurveys(surveyData);
    }
    load();
  }, []);

  const handleUploadAll = useCallback(
    async (photos: CapturedPhoto[]) => {
      for (const photo of photos) {
        await addToQueue({
          blob: photo.blob,
          fileName: `${photo.id}.jpg`,
          surveyId: selectedSurveyId || undefined,
          parcelId: selectedParcelId || undefined,
          gps: photo.gps
            ? { latitude: photo.gps.latitude, longitude: photo.gps.longitude }
            : null,
        });
      }
      setShowCapture(false);
    },
    [addToQueue, selectedSurveyId, selectedParcelId],
  );

  const filteredSurveys = selectedParcelId
    ? surveys.filter((s) => s.parcel_id === selectedParcelId)
    : surveys;

  if (showCapture) {
    return (
      <CaptureFlow
        onClose={() => setShowCapture(false)}
        onUploadAll={handleUploadAll}
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('owner.capture.photoCapture')}</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-6">{t('owner.capture.photoCapture')}</h1>

      {/* Assignment section */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4">
          {t('owner.capture.assignPhotosTo')}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Parcel selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              {t('owner.capture.parcel')}
            </label>
            <select
              value={selectedParcelId}
              onChange={(e) => {
                setSelectedParcelId(e.target.value);
                setSelectedSurveyId('');
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
            >
              <option value="">{t('owner.capture.noParcelSelected')}</option>
              {parcels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Survey selector */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
              {t('owner.capture.survey')}
            </label>
            <select
              value={selectedSurveyId}
              onChange={(e) => setSelectedSurveyId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
            >
              <option value="">{t('owner.capture.noSurveySelected')}</option>
              {filteredSurveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Capture button */}
      <button
        onClick={() => setShowCapture(true)}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors mb-6"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
        {t('owner.capture.openCamera')}
      </button>

      {/* Upload queue */}
      {queuedCount > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              {t('owner.capture.uploadQueue')}
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--green)]/20 text-[var(--green)] text-[10px] font-mono font-bold">
                {queuedCount}
              </span>
            </h2>
            <button
              onClick={syncPending}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50"
            >
              {isSyncing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {isSyncing ? t('owner.capture.syncing') : t('owner.capture.syncNow')}
            </button>
          </div>

          <div className="space-y-2">
            {pendingUploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
              >
                <div className="w-8 h-8 rounded bg-forest-800 flex items-center justify-center text-[10px] text-[var(--text3)]">
                  IMG
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[var(--text)] truncate">{upload.fileName}</p>
                  <p className="text-[9px] text-[var(--text3)] font-mono">
                    {upload.status === 'uploading' ? 'Uploading...' : upload.status}
                    {upload.retryCount > 0 && ` (retry ${upload.retryCount})`}
                  </p>
                </div>
                <div
                  className={`w-2 h-2 rounded-full ${
                    upload.status === 'uploading'
                      ? 'bg-amber animate-pulse'
                      : upload.status === 'failed'
                        ? 'bg-danger'
                        : 'bg-[var(--text3)]'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
