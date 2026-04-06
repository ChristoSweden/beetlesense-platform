import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Upload, Loader2, Camera, History, Trash2, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS, DEMO_SURVEYS } from '@/lib/demoData';
import { CaptureFlow } from '@/components/capture/CaptureFlow';
import { PhotoAnalysisResults } from '@/components/capture/PhotoAnalysisResults';
import { useOfflineUpload, type PendingUpload } from '@/components/capture/useOfflineUpload';
import {
  analysePhoto,
  analysePhotoBatch,
  getAnalysisHistory,
  saveToHistory,
  clearHistory,
  type AnalysisResult,
} from '@/services/photoAnalysisService';
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

  const { error: insertError } = await supabase.from('capture_photos').insert({
    survey_id: upload.surveyId,
    parcel_id: upload.parcelId,
    storage_path: filePath,
    gps_lat: upload.gps?.latitude ?? null,
    gps_lng: upload.gps?.longitude ?? null,
    captured_at: new Date(upload.timestamp).toISOString(),
  });

  if (insertError) {
    console.error('Failed to record metadata:', insertError.message);
    return false;
  }

  return true;
}

// ── Progress animation ──────────────────────────────────────────────────────

function AnalysisProgress({ batchProgress }: { batchProgress?: { done: number; total: number } }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-6 mt-6">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
          <div className="absolute inset-2 rounded-full bg-[var(--green)]/10 flex items-center justify-center">
            <Camera size={16} className="text-[var(--green)]" />
          </div>
        </div>
        <p className="text-sm font-semibold text-[var(--text)]">Analyzing with BeetleSense AI...</p>
        <p className="text-[10px] text-[var(--text3)]">
          Detecting bark beetle damage, identifying species, assessing health
        </p>
        {batchProgress && batchProgress.total > 1 && (
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-[10px] text-[var(--text3)] mb-1">
              <span>Photo {batchProgress.done} of {batchProgress.total}</span>
              <span>{Math.round((batchProgress.done / batchProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
                style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History sidebar ─────────────────────────────────────────────────────────

function AnalysisHistoryPanel({
  history,
  onSelect,
  onClear,
}: {
  history: AnalysisResult[];
  onSelect: (r: AnalysisResult) => void;
  onClear: () => void;
}) {
  if (history.length === 0) return null;

  const severityDot = (s: AnalysisResult['severity']) => {
    switch (s) {
      case 'none': return 'bg-[var(--green)]';
      case 'early': return 'bg-amber-500';
      case 'moderate': return 'bg-orange-500';
      case 'severe': return 'bg-red-500';
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text)] flex items-center gap-2">
          <History size={14} className="text-[var(--text3)]" />
          Recent analyses ({history.length})
        </h3>
        <button
          onClick={onClear}
          className="text-[10px] text-[var(--text3)] hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <Trash2 size={10} />
          Clear
        </button>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg3)] transition-colors text-left"
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${severityDot(item.severity)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[var(--text)] truncate">{item.treeSpecies}</p>
              <p className="text-[9px] text-[var(--text3)] font-mono">
                {new Date(item.timestamp).toLocaleString('en-GB', {
                  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
                {' '}&middot; {Math.round(item.confidence * 100)}%
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function CapturePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCapture, setShowCapture] = useState(false);
  const [parcels, setParcels] = useState<ParcelOption[]>([]);
  const [surveys, setSurveys] = useState<SurveyOption[]>([]);
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');

  const { queuedCount, pendingUploads, isSyncing, addToQueue, syncPending } =
    useOfflineUpload(performUpload);

  // AI analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | undefined>();
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>(() => getAnalysisHistory());
  const prevQueuedCount = useRef(queuedCount);

  // Latest captured photos for batch analysis
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);

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

  // Auto-analyse when a new photo is queued
  useEffect(() => {
    if (queuedCount > prevQueuedCount.current && !isAnalyzing) {
      runSingleAnalysis();
    }
    prevQueuedCount.current = queuedCount;
  }, [queuedCount]);

  const runSingleAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setBatchProgress(undefined);

    try {
      // Use a placeholder URL for demo (the actual photo blob is in the upload queue)
      const result = await analysePhoto('/images/demo-forest.jpg');
      setAnalysisResult(result);
      saveToHistory(result);
      setAnalysisHistory(getAnalysisHistory());
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const runBatchAnalysis = useCallback(async () => {
    if (pendingUploads.length === 0) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setBatchProgress({ done: 0, total: pendingUploads.length });

    try {
      const urls = pendingUploads.map(() => '/images/demo-forest.jpg');
      const results = await analysePhotoBatch(urls, (done, total) => {
        setBatchProgress({ done, total });
      });

      // Show the last result, save all to history
      const lastResult = results[results.length - 1];
      if (lastResult) {
        setAnalysisResult(lastResult);
      }
      for (const r of results) {
        saveToHistory(r);
      }
      setAnalysisHistory(getAnalysisHistory());
    } catch (err) {
      console.error('Batch analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
      setBatchProgress(undefined);
    }
  }, [pendingUploads]);

  const handleUploadAll = useCallback(
    async (photos: CapturedPhoto[]) => {
      setCapturedPhotos(photos);
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

  const handleHistorySelect = useCallback((result: AnalysisResult) => {
    setAnalysisResult(result);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setAnalysisHistory([]);
  }, []);

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

      {/* Capture + batch buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowCapture(true)}
          className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
        >
          <Camera size={20} />
          {t('owner.capture.openCamera')}
        </button>

        {queuedCount > 1 && !isAnalyzing && (
          <button
            onClick={runBatchAnalysis}
            className="flex items-center gap-2 px-4 py-4 rounded-xl border-2 border-[var(--green)] text-[var(--green)] text-sm font-semibold hover:bg-[var(--green)]/5 transition-colors"
          >
            <Layers size={18} />
            Analyze all ({queuedCount})
          </button>
        )}
      </div>

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

      {/* AI Analysis Progress */}
      {isAnalyzing && <AnalysisProgress batchProgress={batchProgress} />}

      {/* AI Analysis Result */}
      {!isAnalyzing && analysisResult && (
        <PhotoAnalysisResults result={analysisResult} />
      )}

      {/* History */}
      <AnalysisHistoryPanel
        history={analysisHistory}
        onSelect={handleHistorySelect}
        onClear={handleClearHistory}
      />
    </div>
  );
}
