import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import { useAuthStore } from '@/stores/authStore';

// ─── Types ───

export type ArchiveEventType =
  | 'harvest'
  | 'planting'
  | 'storm_damage'
  | 'road_built'
  | 'boundary_change'
  | 'observation'
  | 'family_note';

export interface ArchiveEvent {
  id: string;
  type: ArchiveEventType;
  title: string;
  description: string;
  date: string; // ISO date string
  stand?: string;
  parcel?: string;
  recordedBy: string;
  photoUrl?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: string;
}

export interface FamilySteward {
  id: string;
  name: string;
  startYear: number;
  endYear?: number;
  relation: string;
  isCurrent: boolean;
}

export const EVENT_TYPE_COLORS: Record<ArchiveEventType, string> = {
  harvest: '#f59e0b',
  planting: '#22c55e',
  storm_damage: '#ef4444',
  road_built: '#8b5cf6',
  boundary_change: '#3b82f6',
  observation: '#06b6d4',
  family_note: '#ec4899',
};

export const EVENT_TYPE_ICONS: Record<ArchiveEventType, string> = {
  harvest: 'Axe',
  planting: 'Sprout',
  storm_damage: 'CloudLightning',
  road_built: 'Route',
  boundary_change: 'MapPin',
  observation: 'Eye',
  family_note: 'Heart',
};

const STORAGE_KEY = 'beetlesense-forest-archive';

// ─── Demo data: Lindström family, Kronoberg ───

const DEMO_STEWARDS: FamilySteward[] = [
  { id: 's1', name: 'Erik Lindström', startYear: 1948, endYear: 1978, relation: 'Farfar', isCurrent: false },
  { id: 's2', name: 'Karl-Göran Lindström', startYear: 1978, endYear: 2010, relation: 'Farfar (morfar)', isCurrent: false },
  { id: 's3', name: 'Anders Lindström', startYear: 2010, relation: 'Pappa', isCurrent: true },
];

const DEMO_EVENTS: ArchiveEvent[] = [
  {
    id: 'ae-1',
    type: 'planting',
    title: 'Farfar planterade 12 hektar gran',
    description: 'Farfar planted 12 hectares of spruce after the big harvest. The seedlings came from Södra\'s nursery in Fliseryd.',
    date: '1955-04-15',
    stand: 'Avd. 1',
    parcel: 'Norra skiftet',
    recordedBy: 'Erik Lindström',
    lat: 56.88,
    lng: 14.78,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-2',
    type: 'road_built',
    title: 'Väg byggd till norra skiftet',
    description: 'Road built to the northern parcel. 800 meters of gravel road through the wetland area.',
    date: '1962-08-10',
    stand: 'Väg N1',
    parcel: 'Norra skiftet',
    recordedBy: 'Erik Lindström',
    lat: 56.885,
    lng: 14.775,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-3',
    type: 'harvest',
    title: 'Farfar slutavverkade Avd. 3',
    description: 'Grandfather clearfelled Stand 3, replanted with pine. About 350 m³ timber harvested.',
    date: '1978-10-20',
    stand: 'Avd. 3',
    parcel: 'Södra skiftet',
    recordedBy: 'Karl-Göran Lindström',
    lat: 56.87,
    lng: 14.79,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-4',
    type: 'harvest',
    title: 'Första gallring i 1955-planteringen',
    description: 'First thinning (gallring) in the 1955 spruce plantation. Removed 80 m³, good quality pulpwood.',
    date: '1983-09-05',
    stand: 'Avd. 1',
    parcel: 'Norra skiftet',
    recordedBy: 'Karl-Göran Lindström',
    lat: 56.88,
    lng: 14.78,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-5',
    type: 'storm_damage',
    title: 'Stormskador — 200 m³ vindfall',
    description: 'Storm damage — 200 m³ windthrown in western edge. Took weeks to clean up. Some timber lost to blue stain.',
    date: '1995-01-15',
    stand: 'Avd. 2',
    parcel: 'Västra skiftet',
    recordedBy: 'Karl-Göran Lindström',
    lat: 56.875,
    lng: 14.77,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-6',
    type: 'storm_damage',
    title: 'Gudrun — omfattande skador, 450 m³',
    description: 'Gudrun storm — major damage, 450 m³ salvaged. The worst storm in family memory. Called in extra machines from Kalmar.',
    date: '2005-01-09',
    stand: 'Avd. 1, 2, 4',
    parcel: 'Norra & Västra skiftet',
    recordedBy: 'Karl-Göran Lindström',
    lat: 56.878,
    lng: 14.775,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-7',
    type: 'storm_damage',
    title: 'Per — måttliga skador, 80 m³',
    description: 'Per storm — moderate damage, 80 m³ windthrown. Mostly in the already weakened western edge.',
    date: '2007-01-14',
    stand: 'Avd. 2',
    parcel: 'Västra skiftet',
    recordedBy: 'Karl-Göran Lindström',
    lat: 56.875,
    lng: 14.77,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-8',
    type: 'observation',
    title: 'Barkborreutbrott efter stormarna',
    description: 'Bark beetle outbreak after storms, sanitetsavverkning. Had to remove 120 infested trees. Pheromone traps deployed.',
    date: '2008-06-20',
    stand: 'Avd. 1, 2',
    parcel: 'Norra & Västra skiftet',
    recordedBy: 'Karl-Göran Lindström',
    lat: 56.879,
    lng: 14.778,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-9',
    type: 'family_note',
    title: 'Pappa tog över skötseln',
    description: 'Dad took over management from grandfather. Karl-Göran retired after 32 years of stewardship. Formal handover at family meeting.',
    date: '2010-03-01',
    recordedBy: 'Anders Lindström',
    lat: 56.88,
    lng: 14.78,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-10',
    type: 'planting',
    title: 'Björk planterad längs bäcken',
    description: 'Planted birch along the creek for biodiversity. 500 seedlings of Betula pendula. Part of a county biodiversity initiative.',
    date: '2012-05-10',
    stand: 'Avd. 6',
    parcel: 'Södra skiftet',
    recordedBy: 'Anders Lindström',
    lat: 56.872,
    lng: 14.785,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-11',
    type: 'road_built',
    title: 'Ny skogsbilväg till östra skiftet',
    description: 'Built new skogsbilväg to eastern parcels. 1.2 km gravel road with proper drainage. Shared cost with neighbor.',
    date: '2015-07-20',
    stand: 'Väg Ö1',
    parcel: 'Östra skiftet',
    recordedBy: 'Anders Lindström',
    lat: 56.882,
    lng: 14.80,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-12',
    type: 'harvest',
    title: 'Gallring i Avd. 5 — bra virkespriser',
    description: 'Thinning in Stand 5, good timber prices. Removed 140 m³ saw timber at 620 kr/m³fub. Best price in a decade.',
    date: '2018-11-15',
    stand: 'Avd. 5',
    parcel: 'Östra skiftet',
    recordedBy: 'Anders Lindström',
    lat: 56.884,
    lng: 14.795,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-13',
    type: 'observation',
    title: 'Första drönarundersökningen',
    description: 'First drone survey — discovered beetle damage early. Found 15 infested trees that were not visible from ground. Saved the stand.',
    date: '2022-06-12',
    stand: 'Avd. 1',
    parcel: 'Norra skiftet',
    recordedBy: 'Anders Lindström',
    lat: 56.88,
    lng: 14.78,
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'ae-14',
    type: 'family_note',
    title: 'Gick med i BeetleSense',
    description: 'Joined BeetleSense — digitized all family records. Uploaded 70 years of forestry history. Finally everything in one place.',
    date: '2024-09-01',
    recordedBy: 'Anders Lindström',
    lat: 56.88,
    lng: 14.78,
    createdAt: '2024-09-01T10:00:00Z',
  },
  {
    id: 'ae-15',
    type: 'harvest',
    title: 'Planerar föryngringsavverkning Avd. 3',
    description: 'Planning föryngringsavverkning in Stand 3 (the 1978 pine). Trees are 48 years old with good volume. Target harvest autumn 2026.',
    date: '2026-03-01',
    stand: 'Avd. 3',
    parcel: 'Södra skiftet',
    recordedBy: 'Anders Lindström',
    lat: 56.87,
    lng: 14.79,
    createdAt: '2026-03-01T10:00:00Z',
  },
];

// ─── Hook ───

export interface UseForestArchiveReturn {
  events: ArchiveEvent[];
  allEvents: ArchiveEvent[];
  stewards: FamilySteward[];
  // Filters
  typeFilter: ArchiveEventType | null;
  setTypeFilter: (t: ArchiveEventType | null) => void;
  dateRange: [string | null, string | null];
  setDateRange: (range: [string | null, string | null]) => void;
  standFilter: string;
  setStandFilter: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  // CRUD
  addEvent: (event: Omit<ArchiveEvent, 'id' | 'createdAt'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<ArchiveEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  // Derived
  totalYears: number;
  stands: string[];
  isLoading: boolean;
  error: string | null;
}

export function useForestArchive(): UseForestArchiveReturn {
  const { profile } = useAuthStore();
  const [allEvents, setAllEvents] = useState<ArchiveEvent[]>([]);
  const [stewards, setStewards] = useState<FamilySteward[]>([]);
  const [typeFilter, setTypeFilter] = useState<ArchiveEventType | null>(null);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([null, null]);
  const [standFilter, setStandFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load events
  useEffect(() => {
    async function load() {
      setError(null);

      if (isDemo()) {
        // Load from localStorage or use demo data
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setAllEvents(parsed.events ?? DEMO_EVENTS);
            setStewards(parsed.stewards ?? DEMO_STEWARDS);
          } catch {
            setAllEvents(DEMO_EVENTS);
            setStewards(DEMO_STEWARDS);
          }
        } else {
          setAllEvents(DEMO_EVENTS);
          setStewards(DEMO_STEWARDS);
        }
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('forest_archive_events')
          .select('*')
          .order('date', { ascending: true });

        if (dbError) throw dbError;

        const events: ArchiveEvent[] = (data ?? []).map((row: any) => ({
          id: row.id,
          type: row.type as ArchiveEventType,
          title: row.title,
          description: row.description,
          date: row.date,
          stand: row.stand ?? undefined,
          parcel: row.parcel ?? undefined,
          recordedBy: row.recorded_by,
          photoUrl: row.photo_url ?? undefined,
          lat: row.lat ?? undefined,
          lng: row.lng ?? undefined,
          notes: row.notes ?? undefined,
          createdAt: row.created_at,
        }));

        setAllEvents(events);

        // Load stewards
        const { data: stewardData } = await supabase
          .from('forest_archive_stewards')
          .select('*')
          .order('start_year', { ascending: true });

        if (stewardData) {
          setStewards(
            stewardData.map((row: any) => ({
              id: row.id,
              name: row.name,
              startYear: row.start_year,
              endYear: row.end_year ?? undefined,
              relation: row.relation,
              isCurrent: row.is_current,
            })),
          );
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load archive');
      }

      setIsLoading(false);
    }

    load();
  }, [profile]);

  // Save to localStorage in demo mode
  useEffect(() => {
    if (isDemo() && !isLoading) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ events: allEvents, stewards }),
      );
    }
  }, [allEvents, stewards, isLoading]);

  // Filtered events
  const events = useMemo(() => {
    let filtered = [...allEvents];

    if (typeFilter) {
      filtered = filtered.filter((e) => e.type === typeFilter);
    }

    if (dateRange[0]) {
      filtered = filtered.filter((e) => e.date >= dateRange[0]!);
    }
    if (dateRange[1]) {
      filtered = filtered.filter((e) => e.date <= dateRange[1]!);
    }

    if (standFilter) {
      const q = standFilter.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.stand?.toLowerCase().includes(q) ||
          e.parcel?.toLowerCase().includes(q),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.recordedBy.toLowerCase().includes(q),
      );
    }

    // Sort by date ascending (timeline order)
    filtered.sort((a, b) => a.date.localeCompare(b.date));

    return filtered;
  }, [allEvents, typeFilter, dateRange, standFilter, searchQuery]);

  // Unique stands
  const stands = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach((e) => {
      if (e.stand) set.add(e.stand);
      if (e.parcel) set.add(e.parcel);
    });
    return Array.from(set).sort();
  }, [allEvents]);

  // Total years of forestry
  const totalYears = useMemo(() => {
    if (allEvents.length === 0) return 0;
    const sorted = [...allEvents].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date).getFullYear();
    const last = new Date(sorted[sorted.length - 1].date).getFullYear();
    return last - first;
  }, [allEvents]);

  // Add event
  const addEvent = useCallback(
    async (event: Omit<ArchiveEvent, 'id' | 'createdAt'>) => {
      setError(null);
      const newEvent: ArchiveEvent = {
        ...event,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      if (isDemo()) {
        setAllEvents((prev) => [...prev, newEvent]);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .from('forest_archive_events')
          .insert({
            type: newEvent.type,
            title: newEvent.title,
            description: newEvent.description,
            date: newEvent.date,
            stand: newEvent.stand ?? null,
            parcel: newEvent.parcel ?? null,
            recorded_by: newEvent.recordedBy,
            photo_url: newEvent.photoUrl ?? null,
            lat: newEvent.lat ?? null,
            lng: newEvent.lng ?? null,
            notes: newEvent.notes ?? null,
          })
          .select()
          .single();

        if (dbError) throw dbError;
        setAllEvents((prev) => [...prev, { ...newEvent, id: data.id, createdAt: data.created_at }]);
      } catch (err: any) {
        setError(err.message ?? 'Failed to add event');
      }
    },
    [],
  );

  // Update event
  const updateEvent = useCallback(
    async (id: string, updates: Partial<ArchiveEvent>) => {
      setError(null);

      if (isDemo()) {
        setAllEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        );
        return;
      }

      try {
        const { error: dbError } = await supabase
          .from('forest_archive_events')
          .update({
            ...(updates.type && { type: updates.type }),
            ...(updates.title && { title: updates.title }),
            ...(updates.description && { description: updates.description }),
            ...(updates.date && { date: updates.date }),
            ...(updates.stand !== undefined && { stand: updates.stand ?? null }),
            ...(updates.parcel !== undefined && { parcel: updates.parcel ?? null }),
            ...(updates.recordedBy && { recorded_by: updates.recordedBy }),
          })
          .eq('id', id);

        if (dbError) throw dbError;
        setAllEvents((prev) =>
          prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        );
      } catch (err: any) {
        setError(err.message ?? 'Failed to update event');
      }
    },
    [],
  );

  // Delete event
  const deleteEvent = useCallback(
    async (id: string) => {
      setError(null);

      if (isDemo()) {
        setAllEvents((prev) => prev.filter((e) => e.id !== id));
        return;
      }

      try {
        const { error: dbError } = await supabase
          .from('forest_archive_events')
          .delete()
          .eq('id', id);

        if (dbError) throw dbError;
        setAllEvents((prev) => prev.filter((e) => e.id !== id));
      } catch (err: any) {
        setError(err.message ?? 'Failed to delete event');
      }
    },
    [],
  );

  return {
    events,
    allEvents,
    stewards,
    typeFilter,
    setTypeFilter,
    dateRange,
    setDateRange,
    standFilter,
    setStandFilter,
    searchQuery,
    setSearchQuery,
    addEvent,
    updateEvent,
    deleteEvent,
    totalYears,
    stands,
    isLoading,
    error,
  };
}
