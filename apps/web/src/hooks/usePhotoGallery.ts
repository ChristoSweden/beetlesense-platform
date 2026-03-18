import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import {
  useFieldModeStore,
  getPhotoBlob,
  deletePhotoBlob,
  type FieldPhoto,
} from '@/stores/fieldModeStore';

// ─── Types ───

export type AnnotationTag =
  | 'beetle_damage'
  | 'healthy_bark'
  | 'resin_flow'
  | 'crown_discoloration'
  | 'exit_holes'
  | 'storm_damage'
  | 'unknown';

export type Severity = 'mild' | 'moderate' | 'severe';

export interface AIAnnotation {
  primaryTag: AnnotationTag;
  primaryLabel: string;
  confidence: number; // 0-100
  secondaryObservations: string[];
  severity: Severity;
}

export interface GalleryPhoto {
  id: string;
  thumbnailUrl: string;
  fullUrl: string | null;
  idbKey: string | null;
  width: number;
  height: number;
  capturedAt: number;
  gps: { latitude: number; longitude: number; accuracy: number; altitude: number | null } | null;
  compassHeading: number | null;
  parcelId: string | null;
  parcelName: string | null;
  prompt: string;
  uploaded: boolean;
  source: 'field' | 'supabase';
  annotation: AIAnnotation | null;
  userTags: string[];
  deviceInfo: string | null;
}

export interface GalleryFilters {
  parcelId: string;
  dateFrom: string;
  dateTo: string;
  tag: string;
  annotationTag: string;
  severity: string;
  searchQuery: string;
}

export type SortMode = 'newest' | 'oldest' | 'parcel' | 'confidence';

const EMPTY_FILTERS: GalleryFilters = {
  parcelId: '',
  dateFrom: '',
  dateTo: '',
  tag: '',
  annotationTag: '',
  severity: '',
  searchQuery: '',
};

// ─── Demo data ───

const DEMO_ANNOTATIONS: AIAnnotation[] = [
  {
    primaryTag: 'beetle_damage',
    primaryLabel: 'Bark Beetle Exit Holes',
    confidence: 87,
    secondaryObservations: ['Resin flow detected', 'Crown discoloration'],
    severity: 'severe',
  },
  {
    primaryTag: 'healthy_bark',
    primaryLabel: 'Healthy Bark',
    confidence: 94,
    secondaryObservations: ['Normal growth patterns', 'Good canopy density'],
    severity: 'mild',
  },
  {
    primaryTag: 'resin_flow',
    primaryLabel: 'Resin Flow',
    confidence: 72,
    secondaryObservations: ['Possible early stage attack', 'Monitor closely'],
    severity: 'moderate',
  },
  {
    primaryTag: 'crown_discoloration',
    primaryLabel: 'Crown Discoloration',
    confidence: 68,
    secondaryObservations: ['Potential drought stress', 'Check soil moisture'],
    severity: 'moderate',
  },
  {
    primaryTag: 'exit_holes',
    primaryLabel: 'Bark Beetle Exit Holes',
    confidence: 91,
    secondaryObservations: ['Heavy infestation', 'Adjacent trees at risk'],
    severity: 'severe',
  },
  {
    primaryTag: 'healthy_bark',
    primaryLabel: 'Healthy Bark',
    confidence: 96,
    secondaryObservations: ['Strong trunk', 'No visible damage'],
    severity: 'mild',
  },
  {
    primaryTag: 'storm_damage',
    primaryLabel: 'Storm Damage',
    confidence: 83,
    secondaryObservations: ['Broken branches', 'Root plate exposed'],
    severity: 'severe',
  },
  {
    primaryTag: 'resin_flow',
    primaryLabel: 'Resin Flow',
    confidence: 65,
    secondaryObservations: ['Minor resin bleed', 'Natural wound response'],
    severity: 'mild',
  },
];

const DEMO_PROMPTS = ['tree_trunk', 'canopy', 'ground_damage', 'bark_detail', 'overview'];

function generateDemoPhotos(): GalleryPhoto[] {
  const parcels = DEMO_PARCELS;
  const photos: GalleryPhoto[] = [];
  const now = Date.now();

  for (let i = 0; i < 12; i++) {
    const parcel = parcels[i % parcels.length];
    const annotation = DEMO_ANNOTATIONS[i % DEMO_ANNOTATIONS.length];
    const dayOffset = Math.floor(i / 2);
    const timestamp = now - dayOffset * 86400000 - Math.random() * 43200000;

    photos.push({
      id: `demo_photo_${i}`,
      thumbnailUrl: `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
          <rect fill="#0a1f0c" width="200" height="150"/>
          <rect fill="#143518" x="10" y="10" width="180" height="100" rx="8"/>
          <text x="100" y="55" fill="#4ade80" font-size="11" text-anchor="middle" font-family="monospace">${annotation.primaryTag.replace('_', ' ')}</text>
          <text x="100" y="75" fill="#6b7280" font-size="9" text-anchor="middle" font-family="monospace">${parcel.name}</text>
          <text x="100" y="130" fill="#374151" font-size="8" text-anchor="middle" font-family="monospace">Photo ${i + 1}</text>
        </svg>`,
      )}`,
      fullUrl: null,
      idbKey: null,
      width: 1920,
      height: 1080,
      capturedAt: timestamp,
      gps: {
        latitude: parcel.center[1] + (Math.random() - 0.5) * 0.01,
        longitude: parcel.center[0] + (Math.random() - 0.5) * 0.01,
        accuracy: 5 + Math.random() * 10,
        altitude: parcel.elevation_m + Math.random() * 20,
      },
      compassHeading: Math.round(Math.random() * 360),
      parcelId: parcel.id,
      parcelName: parcel.name,
      prompt: DEMO_PROMPTS[i % DEMO_PROMPTS.length],
      uploaded: true,
      source: 'supabase',
      annotation,
      userTags: [],
      deviceInfo: 'iPhone 15 Pro / iOS 19.1',
    });
  }

  return photos.sort((a, b) => b.capturedAt - a.capturedAt);
}

// ─── Hook ───

export function usePhotoGallery() {
  const { capturedPhotos } = useFieldModeStore();
  const [supabasePhotos, setSupabasePhotos] = useState<GalleryPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<GalleryFilters>(EMPTY_FILTERS);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Convert field photos to gallery photos
  const localPhotos: GalleryPhoto[] = useMemo(
    () =>
      capturedPhotos.map((fp: FieldPhoto) => ({
        id: fp.id,
        thumbnailUrl: fp.thumbnailDataUrl,
        fullUrl: null,
        idbKey: fp.idbKey,
        width: fp.width,
        height: fp.height,
        capturedAt: fp.timestamp,
        gps: fp.gps,
        compassHeading: fp.compassHeading,
        parcelId: null,
        parcelName: null,
        prompt: fp.prompt,
        uploaded: fp.uploaded,
        source: 'field' as const,
        annotation: null,
        userTags: [],
        deviceInfo: null,
      })),
    [capturedPhotos],
  );

  // Load supabase photos
  useEffect(() => {
    async function load() {
      setIsLoading(true);

      if (isDemo()) {
        setSupabasePhotos(generateDemoPhotos());
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('capture_photos')
          .select('*')
          .order('captured_at', { ascending: false })
          .limit(200);

        if (error) throw error;

        if (data) {
          const photos: GalleryPhoto[] = data.map((row: Record<string, unknown>) => ({
            id: row.id as string,
            thumbnailUrl: row.thumbnail_url as string ?? '',
            fullUrl: row.storage_path
              ? supabase.storage.from('captures').getPublicUrl(row.storage_path as string).data.publicUrl
              : null,
            idbKey: null,
            width: (row.width as number) ?? 1920,
            height: (row.height as number) ?? 1080,
            capturedAt: new Date(row.captured_at as string).getTime(),
            gps: row.gps_lat
              ? {
                  latitude: row.gps_lat as number,
                  longitude: row.gps_lng as number,
                  accuracy: (row.gps_accuracy as number) ?? 10,
                  altitude: (row.gps_altitude as number) ?? null,
                }
              : null,
            compassHeading: (row.compass_heading as number) ?? null,
            parcelId: (row.parcel_id as string) ?? null,
            parcelName: (row.parcel_name as string) ?? null,
            prompt: (row.prompt as string) ?? 'unknown',
            uploaded: true,
            source: 'supabase' as const,
            annotation: row.ai_annotation
              ? (row.ai_annotation as AIAnnotation)
              : null,
            userTags: (row.user_tags as string[]) ?? [],
            deviceInfo: (row.device_info as string) ?? null,
          }));
          setSupabasePhotos(photos);
        }
      } catch (err) {
        console.error('Failed to load photos:', err);
        // Fall back to demo data on error
        setSupabasePhotos(generateDemoPhotos());
      }

      setIsLoading(false);
    }

    load();
  }, []);

  // Merge local + supabase photos (deduplicate by id)
  const allPhotos = useMemo(() => {
    const ids = new Set(supabasePhotos.map((p) => p.id));
    const merged = [...supabasePhotos];
    for (const lp of localPhotos) {
      if (!ids.has(lp.id)) merged.push(lp);
    }
    return merged;
  }, [supabasePhotos, localPhotos]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    let result = allPhotos;

    if (filters.parcelId) {
      result = result.filter((p) => p.parcelId === filters.parcelId);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      result = result.filter((p) => p.capturedAt >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo).getTime() + 86400000;
      result = result.filter((p) => p.capturedAt < to);
    }
    if (filters.annotationTag) {
      result = result.filter((p) => p.annotation?.primaryTag === filters.annotationTag);
    }
    if (filters.severity) {
      result = result.filter((p) => p.annotation?.severity === filters.severity);
    }
    if (filters.tag) {
      result = result.filter(
        (p) =>
          p.userTags.includes(filters.tag) ||
          p.prompt === filters.tag,
      );
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.parcelName?.toLowerCase().includes(q) ||
          p.annotation?.primaryLabel.toLowerCase().includes(q) ||
          p.annotation?.secondaryObservations.some((o) => o.toLowerCase().includes(q)) ||
          p.prompt.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sortMode) {
      case 'newest':
        result = [...result].sort((a, b) => b.capturedAt - a.capturedAt);
        break;
      case 'oldest':
        result = [...result].sort((a, b) => a.capturedAt - b.capturedAt);
        break;
      case 'parcel':
        result = [...result].sort((a, b) =>
          (a.parcelName ?? '').localeCompare(b.parcelName ?? ''),
        );
        break;
      case 'confidence':
        result = [...result].sort(
          (a, b) => (b.annotation?.confidence ?? 0) - (a.annotation?.confidence ?? 0),
        );
        break;
    }

    return result;
  }, [allPhotos, filters, sortMode]);

  // Selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredPhotos.map((p) => p.id)));
  }, [filteredPhotos]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Delete photos
  const deletePhotos = useCallback(
    async (ids: string[]) => {
      const { removePhoto } = useFieldModeStore.getState();

      for (const id of ids) {
        const photo = allPhotos.find((p) => p.id === id);
        if (!photo) continue;

        if (photo.source === 'field') {
          if (photo.idbKey) {
            await deletePhotoBlob(photo.idbKey);
          }
          removePhoto(id);
        } else if (!isDemo()) {
          await supabase.from('capture_photos').delete().eq('id', id);
        }
      }

      setSupabasePhotos((prev) => prev.filter((p) => !ids.includes(p.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    },
    [allPhotos],
  );

  // Get full-resolution blob for a photo
  const getFullBlob = useCallback(async (photo: GalleryPhoto): Promise<Blob | null> => {
    if (photo.idbKey) {
      const blob = await getPhotoBlob(photo.idbKey);
      return blob ?? null;
    }
    if (photo.fullUrl) {
      const resp = await fetch(photo.fullUrl);
      return resp.blob();
    }
    return null;
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  // Available parcels for filter dropdown
  const availableParcels = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allPhotos) {
      if (p.parcelId && p.parcelName) {
        map.set(p.parcelId, p.parcelName);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [allPhotos]);

  return {
    photos: allPhotos,
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
  };
}
