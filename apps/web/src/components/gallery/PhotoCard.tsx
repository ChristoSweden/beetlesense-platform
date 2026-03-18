import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Check } from 'lucide-react';
import type { GalleryPhoto } from '@/hooks/usePhotoGallery';

// ─── Annotation tag translation keys ───

const TAG_KEYS: Record<string, string> = {
  beetle_damage: 'gallery.tags.beetleDamage',
  healthy_bark: 'gallery.tags.healthyBark',
  resin_flow: 'gallery.tags.resinFlow',
  crown_discoloration: 'gallery.tags.crownDiscoloration',
  exit_holes: 'gallery.tags.beetleDamage',
  storm_damage: 'gallery.tags.stormDamage',
  unknown: 'gallery.tags.unknown',
};

const TAG_COLORS: Record<string, string> = {
  beetle_damage: 'bg-red-500/80',
  healthy_bark: 'bg-emerald-500/80',
  resin_flow: 'bg-amber-500/80',
  crown_discoloration: 'bg-orange-500/80',
  exit_holes: 'bg-red-600/80',
  storm_damage: 'bg-red-400/80',
  unknown: 'bg-gray-500/80',
};

interface PhotoCardProps {
  photo: GalleryPhoto;
  isSelected: boolean;
  selectionMode: boolean;
  onSelect: () => void;
  onClick: () => void;
}

export function PhotoCard({
  photo,
  isSelected,
  selectionMode,
  onSelect,
  onClick,
}: PhotoCardProps) {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Lazy loading via IntersectionObserver
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = photo.thumbnailUrl;
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(img);
    return () => observer.disconnect();
  }, [photo.thumbnailUrl]);

  const annotation = photo.annotation;
  const tagKey = annotation ? TAG_KEYS[annotation.primaryTag] ?? 'gallery.tags.unknown' : null;
  const tagColor = annotation ? TAG_COLORS[annotation.primaryTag] ?? 'bg-gray-500/80' : '';

  const dateStr = new Date(photo.capturedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--bg3)] cursor-pointer transition-all duration-150 hover:border-[var(--green)]/40 hover:shadow-lg hover:shadow-[var(--green)]/5"
      onClick={selectionMode ? onSelect : onClick}
    >
      {/* Thumbnail image */}
      <img
        ref={imgRef}
        alt=""
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-[var(--bg3)] animate-pulse" />
      )}

      {/* Selection checkbox */}
      {selectionMode && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-[var(--green)] border-[var(--green)]'
              : 'border-white/60 bg-black/30 hover:border-white'
          }`}
        >
          {isSelected && <Check size={14} className="text-[var(--bg)]" />}
        </button>
      )}

      {/* AI annotation badge */}
      {annotation && tagKey && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${tagColor}`}
          >
            {t(tagKey)}
          </span>
          <span className="px-1 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white">
            {annotation.confidence}%
          </span>
        </div>
      )}

      {/* Bottom overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent pt-6 pb-2 px-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {photo.gps && (
              <MapPin size={10} className="text-[var(--green)]" />
            )}
            <span className="text-[9px] text-white/80 font-medium">
              {photo.parcelName ?? photo.prompt.replace('_', ' ')}
            </span>
          </div>
          <span className="text-[9px] text-white/60 font-mono">{dateStr}</span>
        </div>
      </div>

      {/* Selected overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-[var(--green)]/15 border-2 border-[var(--green)] rounded-xl pointer-events-none" />
      )}
    </div>
  );
}
