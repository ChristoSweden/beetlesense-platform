import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type KnowledgeCategory =
  | 'terrain'
  | 'water'
  | 'wildlife'
  | 'history'
  | 'operations'
  | 'warnings'
  | 'traditions';

export type Importance = 'critical' | 'important' | 'nice-to-know';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';

export type SortMode = 'newest' | 'oldest' | 'category';

export interface KnowledgeNote {
  id: string;
  text: string;
  audioBlob?: Blob;
  audioUrl?: string;
  category: KnowledgeCategory;
  importance: Importance;
  season: Season;
  lat: number;
  lng: number;
  standName?: string;
  recordedBy: string;
  photoUrl?: string;
  createdAt: string;
  synced: boolean;
}

export interface KnowledgeState {
  notes: KnowledgeNote[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  categoryFilter: KnowledgeCategory | null;
  sortMode: SortMode;
}

// ─── Category config ───

export const CATEGORY_CONFIG: Record<
  KnowledgeCategory,
  { color: string; colorBg: string; labelEn: string; labelSv: string }
> = {
  terrain: { color: '#a78bfa', colorBg: '#a78bfa20', labelEn: 'Terrain', labelSv: 'Terr\u00e4ng' },
  water: { color: '#60a5fa', colorBg: '#60a5fa20', labelEn: 'Water', labelSv: 'Vatten' },
  wildlife: { color: '#f59e0b', colorBg: '#f59e0b20', labelEn: 'Wildlife', labelSv: 'Vilt' },
  history: { color: '#f97316', colorBg: '#f9731620', labelEn: 'History', labelSv: 'Historia' },
  operations: { color: '#4ade80', colorBg: '#4ade8020', labelEn: 'Operations', labelSv: 'Drift' },
  warnings: { color: '#ef4444', colorBg: '#ef444420', labelEn: 'Warnings', labelSv: 'Varningar' },
  traditions: { color: '#ec4899', colorBg: '#ec489920', labelEn: 'Traditions', labelSv: 'Traditioner' },
};

export const IMPORTANCE_CONFIG: Record<Importance, { color: string; labelEn: string; labelSv: string }> = {
  critical: { color: '#ef4444', labelEn: 'Critical', labelSv: 'Kritisk' },
  important: { color: '#f59e0b', labelEn: 'Important', labelSv: 'Viktig' },
  'nice-to-know': { color: '#60a5fa', labelEn: 'Nice to know', labelSv: 'Bra att veta' },
};

export const SEASON_CONFIG: Record<Season, { labelEn: string; labelSv: string }> = {
  spring: { labelEn: 'Spring', labelSv: 'V\u00e5r' },
  summer: { labelEn: 'Summer', labelSv: 'Sommar' },
  autumn: { labelEn: 'Autumn', labelSv: 'H\u00f6st' },
  winter: { labelEn: 'Winter', labelSv: 'Vinter' },
  all: { labelEn: 'All year', labelSv: 'Hela \u00e5ret' },
};

// ─── Demo data — Lindstr\u00f6m family forest ───

const DEMO_NOTES: KnowledgeNote[] = [
  {
    id: 'kn-1',
    text: 'This area floods every March \u2014 never bring a forwarder before May.',
    category: 'water',
    importance: 'critical',
    season: 'spring',
    lat: 57.7827,
    lng: 14.1618,
    standName: 'Stand 2 \u2013 Sumpskogen',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2024-11-03T08:30:00Z',
    synced: true,
  },
  {
    id: 'kn-2',
    text: 'The old oak by the stone wall is from the 1700s, farmor said it\u2019s a kulturminne.',
    category: 'history',
    importance: 'important',
    season: 'all',
    lat: 57.7835,
    lng: 14.1645,
    standName: 'Stand 1 \u2013 Ekbacken',
    recordedBy: 'Anna Lindstr\u00f6m',
    createdAt: '2024-10-15T14:20:00Z',
    synced: true,
  },
  {
    id: 'kn-3',
    text: 'Best lingonberries in the clearing east of Stand 4.',
    category: 'traditions',
    importance: 'nice-to-know',
    season: 'autumn',
    lat: 57.7812,
    lng: 14.1680,
    standName: 'Stand 4 \u2013 Gl\u00e4ntan',
    recordedBy: 'Anna Lindstr\u00f6m',
    createdAt: '2024-09-20T11:45:00Z',
    synced: true,
  },
  {
    id: 'kn-4',
    text: 'Tj\u00e4der (capercaillie) lek site \u2014 avoid disturbing March\u2013May.',
    category: 'wildlife',
    importance: 'critical',
    season: 'spring',
    lat: 57.7850,
    lng: 14.1590,
    standName: 'Stand 6 \u2013 Tallheden',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2024-08-12T06:15:00Z',
    synced: true,
  },
  {
    id: 'kn-5',
    text: 'The creek changes course after heavy rain, actual boundary is 10 m further north.',
    category: 'terrain',
    importance: 'important',
    season: 'all',
    lat: 57.7842,
    lng: 14.1630,
    standName: 'Stand 3 \u2013 B\u00e4cken',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2024-07-28T09:00:00Z',
    synced: true,
  },
  {
    id: 'kn-6',
    text: 'Dad always thinned Stand 5 from the south because the ground is firmer there.',
    category: 'operations',
    importance: 'important',
    season: 'all',
    lat: 57.7820,
    lng: 14.1655,
    standName: 'Stand 5 \u2013 Grankullen',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2024-06-10T15:30:00Z',
    synced: true,
  },
  {
    id: 'kn-7',
    text: 'Roe deer damage on young pine is worst in the northeast corner.',
    category: 'wildlife',
    importance: 'important',
    season: 'winter',
    lat: 57.7860,
    lng: 14.1700,
    standName: 'Stand 7 \u2013 Ungskogen',
    recordedBy: 'Anna Lindstr\u00f6m',
    createdAt: '2024-05-04T10:10:00Z',
    synced: true,
  },
  {
    id: 'kn-8',
    text: 'The old logging road from the 1960s is still passable if you clear branches.',
    category: 'terrain',
    importance: 'nice-to-know',
    season: 'all',
    lat: 57.7805,
    lng: 14.1600,
    standName: 'Stand 2 \u2013 Sumpskogen',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2024-04-18T13:00:00Z',
    synced: true,
  },
  {
    id: 'kn-9',
    text: 'This wet area has been draining better since the ditch was cleaned in 2015.',
    category: 'water',
    importance: 'important',
    season: 'all',
    lat: 57.7830,
    lng: 14.1612,
    standName: 'Stand 2 \u2013 Sumpskogen',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2024-03-22T07:45:00Z',
    synced: true,
  },
  {
    id: 'kn-10',
    text: 'Grandmother planted these oaks for the grandchildren \u2014 don\u2019t harvest.',
    category: 'history',
    importance: 'critical',
    season: 'all',
    lat: 57.7838,
    lng: 14.1648,
    standName: 'Stand 1 \u2013 Ekbacken',
    recordedBy: 'Anna Lindstr\u00f6m',
    createdAt: '2024-02-14T16:00:00Z',
    synced: true,
  },
  {
    id: 'kn-11',
    text: 'Wild boar rooting damage started in 2019, worst in the beech stand.',
    category: 'wildlife',
    importance: 'important',
    season: 'all',
    lat: 57.7815,
    lng: 14.1670,
    standName: 'Stand 4 \u2013 Gl\u00e4ntan',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2024-01-30T12:20:00Z',
    synced: true,
  },
  {
    id: 'kn-12',
    text: 'The contractor left some diesel barrels here in 2018, might still be contamination.',
    category: 'warnings',
    importance: 'critical',
    season: 'all',
    lat: 57.7808,
    lng: 14.1625,
    standName: 'Stand 3 \u2013 B\u00e4cken',
    recordedBy: 'Erik Lindstr\u00f6m',
    createdAt: '2023-12-05T09:30:00Z',
    synced: true,
  },
];

// ─── IndexedDB helpers ───

const DB_NAME = 'beetlesense-knowledge';
const STORE_NAME = 'notes';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(): Promise<KnowledgeNote[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function idbPut(note: KnowledgeNote): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(note);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silently fail offline storage
  }
}

async function idbDelete(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // silently fail
  }
}

// ─── Hook ───

export function useKnowledgeCapture() {
  const [notes, setNotes] = useState<KnowledgeNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<KnowledgeCategory | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  // ─── Load notes ───
  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (isDemo()) {
      await new Promise((r) => setTimeout(r, 300));
      setNotes(DEMO_NOTES);
      setIsLoading(false);
      return;
    }

    try {
      // Try loading from Supabase
      const { data, error: fetchError } = await supabase
        .from('knowledge_notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw new Error(fetchError.message);

      const remote: KnowledgeNote[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        text: row.text as string,
        audioUrl: (row.audio_url as string) ?? undefined,
        category: row.category as KnowledgeCategory,
        importance: row.importance as Importance,
        season: row.season as Season,
        lat: row.lat as number,
        lng: row.lng as number,
        standName: (row.stand_name as string) ?? undefined,
        recordedBy: row.recorded_by as string,
        photoUrl: (row.photo_url as string) ?? undefined,
        createdAt: row.created_at as string,
        synced: true,
      }));

      // Merge with offline notes
      const offline = await idbGetAll();
      const offlineUnsent = offline.filter((n) => !n.synced && !remote.find((r) => r.id === n.id));
      setNotes([...offlineUnsent, ...remote]);
    } catch {
      // Fallback to IndexedDB
      const offline = await idbGetAll();
      if (offline.length > 0) {
        setNotes(offline);
      } else {
        setNotes(DEMO_NOTES);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // ─── Add note ───
  const addNote = useCallback(
    async (note: Omit<KnowledgeNote, 'id' | 'createdAt' | 'synced'>) => {
      const newNote: KnowledgeNote = {
        ...note,
        id: `kn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: new Date().toISOString(),
        synced: false,
      };

      setNotes((prev) => [newNote, ...prev]);
      await idbPut(newNote);

      // Try syncing to Supabase
      if (!isDemo()) {
        try {
          const { error: insertError } = await supabase.from('knowledge_notes').insert({
            id: newNote.id,
            text: newNote.text,
            category: newNote.category,
            importance: newNote.importance,
            season: newNote.season,
            lat: newNote.lat,
            lng: newNote.lng,
            stand_name: newNote.standName,
            recorded_by: newNote.recordedBy,
            photo_url: newNote.photoUrl,
            created_at: newNote.createdAt,
          });
          if (!insertError) {
            newNote.synced = true;
            await idbPut(newNote);
            setNotes((prev) => prev.map((n) => (n.id === newNote.id ? { ...n, synced: true } : n)));
          }
        } catch {
          // stays offline
        }
      }

      return newNote;
    },
    [],
  );

  // ─── Delete note ───
  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await idbDelete(id);

    if (!isDemo()) {
      try {
        await supabase.from('knowledge_notes').delete().eq('id', id);
      } catch {
        // silent
      }
    }
  }, []);

  // ─── GPS location ───
  const getCurrentLocation = useCallback((): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }, []);

  // ─── Filtered & sorted notes ───
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Category filter
    if (categoryFilter) {
      result = result.filter((n) => n.category === categoryFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.text.toLowerCase().includes(q) ||
          n.standName?.toLowerCase().includes(q) ||
          n.recordedBy.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (sortMode) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'category':
        result.sort((a, b) => a.category.localeCompare(b.category));
        break;
    }

    return result;
  }, [notes, categoryFilter, searchQuery, sortMode]);

  return {
    notes,
    filteredNotes,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortMode,
    setSortMode,
    addNote,
    deleteNote,
    getCurrentLocation,
    refetch: loadNotes,
    totalCount: notes.length,
  };
}
