import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Compass,
  Calendar,
  Smartphone,
  Tag,
  Plus,
  Download,
  Share2,
  FileText,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import type { GalleryPhoto, Severity } from '@/hooks/usePhotoGallery';

// ─── Translation helpers ───

const TAG_LABELS: Record<string, string> = {
  beetle_damage: 'gallery.tags.beetleDamage',
  healthy_bark: 'gallery.tags.healthyBark',
  resin_flow: 'gallery.tags.resinFlow',
  crown_discoloration: 'gallery.tags.crownDiscoloration',
  exit_holes: 'gallery.tags.beetleDamage',
  storm_damage: 'gallery.tags.stormDamage',
  unknown: 'gallery.tags.unknown',
};

const SEVERITY_LABELS: Record<Severity, string> = {
  mild: 'gallery.severity.mild',
  moderate: 'gallery.severity.moderate',
  severe: 'gallery.severity.severe',
};

const SEVERITY_COLORS: Record<Severity, { bg: string; text: string; icon: typeof CheckCircle }> = {
  mild: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle },
  moderate: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400', icon: Info },
  severe: { bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', icon: AlertTriangle },
};

// ─── Props ───

interface PhotoDetailProps {
  photo: GalleryPhoto;
  photos: GalleryPhoto[];
  onClose: () => void;
  onNavigate: (photo: GalleryPhoto) => void;
  getFullBlob: (photo: GalleryPhoto) => Promise<Blob | null>;
}

export function PhotoDetail({
  photo,
  photos,
  onClose,
  onNavigate,
  getFullBlob,
}: PhotoDetailProps) {
  const { t } = useTranslation();
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [userTags, setUserTags] = useState<string[]>(photo.userTags);
  const [showPanel, setShowPanel] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  // Load full resolution image
  useEffect(() => {
    let revoked = false;
    async function loadFull() {
      const blob = await getFullBlob(photo);
      if (blob && !revoked) {
        setFullImageUrl(URL.createObjectURL(blob));
      }
    }
    loadFull();
    return () => {
      revoked = true;
      if (fullImageUrl) URL.revokeObjectURL(fullImageUrl);
    };

  }, [photo.id]);

  // Reset user tags when photo changes
  useEffect(() => {
    setUserTags(photo.userTags);
  }, [photo.id, photo.userTags]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(photos[currentIndex - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(photos[currentIndex + 1]);
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNavigate, photos, currentIndex, hasPrev, hasNext]);

  // Swipe navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;
      const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
      const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
        if (dx < 0 && hasNext) onNavigate(photos[currentIndex + 1]);
        if (dx > 0 && hasPrev) onNavigate(photos[currentIndex - 1]);
      }
      touchStartRef.current = null;
    },
    [hasPrev, hasNext, onNavigate, photos, currentIndex],
  );

  // Download
  const handleDownload = useCallback(async () => {
    const blob = await getFullBlob(photo);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beetlesense_${photo.id}.jpg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [photo, getFullBlob]);

  // Share
  const handleShare = useCallback(async () => {
    const blob = await getFullBlob(photo);
    if (navigator.share && blob) {
      const file = new File([blob], `beetlesense_${photo.id}.jpg`, { type: 'image/jpeg' });
      navigator.share({ files: [file], title: 'BeetleSense Photo' }).catch(() => {});
    }
  }, [photo, getFullBlob]);

  // Add tag
  const addTag = useCallback(() => {
    const tag = tagInput.trim();
    if (tag && !userTags.includes(tag)) {
      setUserTags((prev) => [...prev, tag]);
    }
    setTagInput('');
  }, [tagInput, userTags]);

  const removeTag = useCallback((tag: string) => {
    setUserTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const annotation = photo.annotation;
  const datetime = new Date(photo.capturedAt);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white/70 hover:text-white min-h-[44px]"
        >
          <X size={20} />
          <span className="text-sm">{t('common.close')}</span>
        </button>
        <div className="flex items-center gap-1 text-xs text-white/50 font-mono">
          {currentIndex + 1} / {photos.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title={t('common.save')}
          >
            <Download size={18} />
          </button>
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <Share2 size={18} />
          </button>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className={`p-2 rounded-lg transition-colors ${
              showPanel ? 'bg-white/10 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'
            }`}
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Image area */}
        <div
          className="flex-1 relative flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation arrows */}
          {hasPrev && (
            <button
              onClick={() => onNavigate(photos[currentIndex - 1])}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onNavigate(photos[currentIndex + 1])}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          )}

          {/* Photo */}
          <img
            src={fullImageUrl ?? photo.thumbnailUrl}
            alt={photo.annotation?.primaryLabel
              ? `Forest photo: ${photo.annotation.primaryLabel}`
              : 'Forest parcel satellite view'}
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Info panel */}
        {showPanel && (
          <div className="w-80 lg:w-96 border-l border-white/10 bg-[#070e08] overflow-y-auto">
            <div className="p-4 space-y-5">
              {/* ── Metadata ── */}
              <section>
                <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                  {t('gallery.metadata')}
                </h3>
                <div className="space-y-2.5">
                  {/* GPS */}
                  {photo.gps && (
                    <div className="flex items-start gap-2.5">
                      <MapPin size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-white font-mono">
                          {photo.gps.latitude.toFixed(5)}, {photo.gps.longitude.toFixed(5)}
                        </p>
                        <p className="text-[10px] text-white/40">
                          {t('field.gpsAccuracy')}: ±{Math.round(photo.gps.accuracy)}m
                          {photo.gps.altitude && ` | ${Math.round(photo.gps.altitude)}m alt.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Compass */}
                  {photo.compassHeading != null && (
                    <div className="flex items-center gap-2.5">
                      <Compass size={14} className="text-[var(--green)] flex-shrink-0" />
                      <p className="text-xs text-white">{photo.compassHeading}&deg;</p>
                    </div>
                  )}

                  {/* Date/time */}
                  <div className="flex items-center gap-2.5">
                    <Calendar size={14} className="text-[var(--green)] flex-shrink-0" />
                    <div>
                      <p className="text-xs text-white">
                        {datetime.toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-[10px] text-white/40">
                        {datetime.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Device */}
                  {photo.deviceInfo && (
                    <div className="flex items-center gap-2.5">
                      <Smartphone size={14} className="text-[var(--green)] flex-shrink-0" />
                      <p className="text-xs text-white/80">{photo.deviceInfo}</p>
                    </div>
                  )}

                  {/* Resolution */}
                  <div className="flex items-center gap-2.5 text-[10px] text-white/40 pl-[22px]">
                    {photo.width} x {photo.height}px
                  </div>
                </div>
              </section>

              {/* ── AI Annotation ── */}
              {annotation && (
                <section>
                  <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                    {t('gallery.aiAnalysis')}
                  </h3>

                  {/* Primary classification */}
                  <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-white">
                        {t(TAG_LABELS[annotation.primaryTag] ?? 'gallery.tags.unknown')}
                      </span>
                      <span className="text-xs font-mono text-[var(--green)]">
                        {annotation.confidence}%
                      </span>
                    </div>
                    {/* Confidence bar */}
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--green)] transition-all"
                        style={{ width: `${annotation.confidence}%` }}
                      />
                    </div>
                  </div>

                  {/* Secondary observations */}
                  {annotation.secondaryObservations.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {annotation.secondaryObservations.map((obs, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-white/70">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/30 flex-shrink-0" />
                          {obs}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Severity */}
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      SEVERITY_COLORS[annotation.severity].bg
                    }`}
                  >
                    {(() => {
                      const SevIcon = SEVERITY_COLORS[annotation.severity].icon;
                      return (
                        <SevIcon
                          size={14}
                          className={SEVERITY_COLORS[annotation.severity].text}
                        />
                      );
                    })()}
                    <span className="text-[10px] uppercase tracking-wider text-white/50">
                      {t('gallery.severity.label')}:
                    </span>
                    <span
                      className={`text-xs font-semibold ${
                        SEVERITY_COLORS[annotation.severity].text
                      }`}
                    >
                      {t(SEVERITY_LABELS[annotation.severity])}
                    </span>
                  </div>
                </section>
              )}

              {/* ── Manual tags ── */}
              <section>
                <h3 className="text-[10px] uppercase tracking-widest text-white/40 font-semibold mb-3">
                  <Tag size={10} className="inline mr-1" />
                  {t('gallery.tags.label')}
                </h3>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {userTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 text-[10px] text-[var(--green)]"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-white"
                      >
                        <X size={8} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    placeholder={t('gallery.addTag')}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 outline-none focus:border-[var(--green)]/40"
                  />
                  <button
                    onClick={addTag}
                    className="px-2 py-1.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 text-[var(--green)] hover:bg-[var(--green)]/20 transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </section>

              {/* ── Action buttons ── */}
              <section className="space-y-2">
                <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20 text-[var(--green)] text-xs font-semibold hover:bg-[var(--green)]/20 transition-colors">
                  <Sparkles size={14} />
                  {t('gallery.askAi')}
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white/80 text-xs font-medium hover:bg-white/10 transition-colors">
                  <FileText size={14} />
                  {t('gallery.addToReport')}
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
