import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/common/Toast';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import {
  ChevronRight,
  Camera,
  Grid3X3,
  MapIcon,
  SlidersHorizontal,
  X,
  Download,
  Trash2,
  Package,
  Upload,
  CheckSquare,
  ArrowUpDown,
  Search,
  Loader2,
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { PhotoCard } from '@/components/gallery/PhotoCard';
import { PhotoDetail } from '@/components/gallery/PhotoDetail';
import { PhotoMap } from '@/components/gallery/PhotoMap';
import { usePhotoGallery, type GalleryPhoto, type SortMode } from '@/hooks/usePhotoGallery';

type ViewMode = 'grid' | 'map';

export default function PhotoGalleryPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const {
    filteredPhotos,
    isLoading,
    filters,
    setFilters,
    resetFilters,
    sortMode,
    setSortMode,
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    deletePhotos,
    getFullBlob,
    availableParcels,
  } = usePhotoGallery();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [detailPhoto, setDetailPhoto] = useState<GalleryPhoto | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    fileName: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasActiveFilters =
    filters.parcelId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.annotationTag ||
    filters.severity ||
    filters.tag ||
    filters.searchQuery;

  // Toggle selection mode
  const handleToggleSelection = useCallback(() => {
    if (selectionMode) {
      clearSelection();
    }
    setSelectionMode((prev) => !prev);
  }, [selectionMode, clearSelection]);

  // Delete selected
  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    await deletePhotos(Array.from(selectedIds));
    setIsDeleting(false);
    setSelectionMode(false);
  }, [selectedIds, deletePhotos]);

  // Download selected
  const handleDownloadSelected = useCallback(async () => {
    for (const id of selectedIds) {
      const photo = filteredPhotos.find((p) => p.id === id);
      if (!photo) continue;
      const blob = await getFullBlob(photo);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `beetlesense_${photo.id}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
      }
    }
  }, [selectedIds, filteredPhotos, getFullBlob]);

  // Export as evidence package
  const handleExportEvidence = useCallback(async () => {
    const metadata = filteredPhotos
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({
        id: p.id,
        capturedAt: new Date(p.capturedAt).toISOString(),
        gps: p.gps
          ? `${p.gps.latitude.toFixed(6)}, ${p.gps.longitude.toFixed(6)}`
          : null,
        parcel: p.parcelName,
        annotation: p.annotation
          ? `${p.annotation.primaryLabel} (${p.annotation.confidence}%)`
          : null,
        severity: p.annotation?.severity ?? null,
        compassHeading: p.compassHeading,
      }));

    const jsonStr = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        photoCount: metadata.length,
        platform: 'BeetleSense.ai',
        photos: metadata,
      },
      null,
      2,
    );

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beetlesense_evidence_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedIds, filteredPhotos]);

  // Upload from device
  const handleUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const userId = user?.id;
      if (!userId) {
        toast(t('gallery.uploadError', 'Du måste vara inloggad för att ladda upp'), 'error');
        return;
      }

      setIsUploading(true);
      const total = files.length;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < total; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total, fileName: file.name });

        try {
          // Generate a unique storage path: {user_id}/{uuid}_{filename}
          const uuid = crypto.randomUUID();
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${userId}/${uuid}_${safeName}`;

          // Upload file to Supabase storage bucket
          const { error: uploadError } = await supabase.storage
            .from('survey-photos')
            .upload(storagePath, file, {
              cacheControl: '3600',
              upsert: false,
              contentType: file.type,
            });

          if (uploadError) {
            console.error(`Upload failed for ${file.name}:`, uploadError);
            errorCount++;
            continue;
          }

          // Get the public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from('survey-photos')
            .getPublicUrl(storagePath);

          // Extract image dimensions
          let width = 1920;
          let height = 1080;
          try {
            const imgUrl = URL.createObjectURL(file);
            const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
              const img = new Image();
              img.onload = () => {
                resolve({ w: img.naturalWidth, h: img.naturalHeight });
                URL.revokeObjectURL(imgUrl);
              };
              img.onerror = () => {
                URL.revokeObjectURL(imgUrl);
                reject(new Error('Failed to read image'));
              };
              img.src = imgUrl;
            });
            width = dims.w;
            height = dims.h;
          } catch {
            // Keep default dimensions
          }

          // Insert metadata into the database
          const { error: dbError } = await supabase.from('capture_photos').insert({
            user_id: userId,
            storage_path: storagePath,
            thumbnail_url: urlData.publicUrl,
            width,
            height,
            captured_at: new Date().toISOString(),
            prompt: 'upload',
            device_info: navigator.userAgent,
          });

          if (dbError) {
            console.error(`DB insert failed for ${file.name}:`, dbError);
            // Clean up the uploaded file since metadata insert failed
            await supabase.storage.from('survey-photos').remove([storagePath]);
            errorCount++;
            continue;
          }

          successCount++;
        } catch (err) {
          console.error(`Upload error for ${file.name}:`, err);
          errorCount++;
        }
      }

      setIsUploading(false);
      setUploadProgress(null);

      if (successCount > 0) {
        toast(
          t('gallery.uploadSuccess', `${successCount} ${successCount === 1 ? 'fil' : 'filer'} uppladdade`),
          'success',
        );
      }
      if (errorCount > 0) {
        toast(
          t('gallery.uploadPartialError', `${errorCount} ${errorCount === 1 ? 'fil' : 'filer'} misslyckades`),
          'error',
        );
      }

      // Reset input so the same file(s) can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [user, toast, t],
  );

  const sortOptions: { value: SortMode; label: string }[] = [
    { value: 'newest', label: t('gallery.sort.newest') },
    { value: 'oldest', label: t('gallery.sort.oldest') },
    { value: 'parcel', label: t('gallery.sort.byParcel') },
    { value: 'confidence', label: t('gallery.sort.byConfidence') },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('gallery.title')}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-serif font-bold text-[var(--text)]">
            {t('gallery.title')}
          </h1>
          <p className="text-xs text-[var(--text3)] mt-1">
            {t('gallery.allPhotos')} — {filteredPhotos.length}{' '}
            {t('gallery.photos')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload button */}
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            <span className="hidden sm:inline">{t('gallery.upload')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {/* View toggle */}
          <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text)]'
              }`}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 transition-colors ${
                viewMode === 'map'
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text)]'
              }`}
            >
              <MapIcon size={16} />
            </button>
          </div>

          {/* Selection mode */}
          <button
            onClick={handleToggleSelection}
            className={`p-2 rounded-lg border transition-colors ${
              selectionMode
                ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10'
                : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)]'
            }`}
          >
            <CheckSquare size={16} />
          </button>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors relative ${
              showFilters || hasActiveFilters
                ? 'border-[var(--green)] text-[var(--green)] bg-[var(--green)]/10'
                : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)]'
            }`}
          >
            <SlidersHorizontal size={16} />
            {hasActiveFilters && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--green)]" />
            )}
          </button>
        </div>
      </div>

      {/* Upload progress bar */}
      {isUploading && uploadProgress && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 mb-4">
          <Loader2 size={14} className="animate-spin text-[var(--green)] shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text2)] truncate">
                {t('gallery.uploading', 'Laddar upp')} {uploadProgress.current}/{uploadProgress.total}: {uploadProgress.fileName}
              </span>
              <span className="text-[10px] text-[var(--text3)] ml-2 shrink-0">
                {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--green)] transition-all duration-300"
                style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Selection actions bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--green)]/30 bg-[var(--green)]/5 mb-4">
          <span className="text-xs text-[var(--green)] font-semibold">
            {selectedIds.size} {t('gallery.selected')}
          </span>
          <div className="flex-1" />
          <button
            onClick={selectAll}
            className="text-[10px] text-[var(--text2)] hover:text-[var(--text)] transition-colors"
          >
            {t('gallery.selectAll')}
          </button>
          <div className="w-px h-4 bg-[var(--border)]" />
          <button
            onClick={handleDownloadSelected}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Download size={12} />
            {t('common.save')}
          </button>
          <button
            onClick={handleExportEvidence}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-white/80 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <Package size={12} />
            {t('gallery.exportEvidence')}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={isDeleting}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            {t('common.delete')}
          </button>
        </div>
      )}

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text)]">
              {t('alerts.filters')}
            </h2>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:underline"
              >
                <X size={10} />
                {t('gallery.clearFilters')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
                <input
                  type="text"
                  value={filters.searchQuery}
                  onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                  placeholder={t('common.search')}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--green)]/50"
                />
              </div>
            </div>

            {/* Parcel */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
                {t('owner.capture.parcel')}
              </label>
              <select
                value={filters.parcelId}
                onChange={(e) => setFilters({ ...filters, parcelId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
              >
                <option value="">{t('alerts.all')}</option>
                {availableParcels.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
                {t('gallery.dateFrom')}
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
                {t('gallery.dateTo')}
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
              />
            </div>

            {/* AI annotation */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
                {t('gallery.aiAnalysis')}
              </label>
              <select
                value={filters.annotationTag}
                onChange={(e) => setFilters({ ...filters, annotationTag: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
              >
                <option value="">{t('alerts.all')}</option>
                <option value="beetle_damage">{t('gallery.tags.beetleDamage')}</option>
                <option value="healthy_bark">{t('gallery.tags.healthyBark')}</option>
                <option value="resin_flow">{t('gallery.tags.resinFlow')}</option>
                <option value="crown_discoloration">{t('gallery.tags.crownDiscoloration')}</option>
                <option value="exit_holes">{t('gallery.tags.beetleDamage')}</option>
                <option value="storm_damage">{t('gallery.tags.stormDamage')}</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--text3)] mb-1.5">
                {t('gallery.severity.label')}
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] outline-none focus:border-[var(--green)]/50"
              >
                <option value="">{t('alerts.all')}</option>
                <option value="mild">{t('gallery.severity.mild')}</option>
                <option value="moderate">{t('gallery.severity.moderate')}</option>
                <option value="severe">{t('gallery.severity.severe')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Sort control */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowUpDown size={12} className="text-[var(--text3)]" />
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-2 py-1 rounded-lg bg-transparent border border-[var(--border)] text-[10px] text-[var(--text)] outline-none focus:border-[var(--green)]/50"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={24} className="animate-spin text-[var(--green)]" />
            <span className="text-xs text-[var(--text3)]">{t('common.loading')}</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredPhotos.length === 0 && (
        <EmptyState
          icon={<Camera size={32} className="text-[var(--text3)]" />}
          title="No photos yet"
          description="Capture photos of your forest to track changes over time"
          actionLabel="Take a photo"
          actionTo="/owner/capture"
        />
      )}

      {/* Grid view */}
      {!isLoading && filteredPhotos.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredPhotos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              isSelected={selectedIds.has(photo.id)}
              selectionMode={selectionMode}
              onSelect={() => toggleSelection(photo.id)}
              onClick={() => setDetailPhoto(photo)}
            />
          ))}
        </div>
      )}

      {/* Map view */}
      {!isLoading && filteredPhotos.length > 0 && viewMode === 'map' && (
        <PhotoMap
          photos={filteredPhotos}
          onPhotoClick={(photo) => setDetailPhoto(photo)}
          className="h-[500px] lg:h-[600px]"
        />
      )}

      {/* Photo detail lightbox */}
      {detailPhoto && (
        <PhotoDetail
          photo={detailPhoto}
          photos={filteredPhotos}
          onClose={() => setDetailPhoto(null)}
          onNavigate={(photo) => setDetailPhoto(photo)}
          getFullBlob={getFullBlob}
        />
      )}
    </div>
  );
}
