import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ───

export type SourceCategory =
  | 'research_papers'
  | 'open_datasets'
  | 'satellite_platforms'
  | 'regulatory_documents'
  | 'technology_references'
  | 'app_references';

export interface ResearchSource {
  id: string;
  category: SourceCategory;
  title: string;
  authors: string[];
  source?: string;
  year?: number;
  institution?: string;
  journal?: string;
  topicTags: string[];
  url: string;
  description: string;
  jurisdiction?: string;
}

export type SortMode = 'relevance' | 'year' | 'title';

export interface ResearchFilters {
  search: string;
  categories: SourceCategory[];
  topicTags: string[];
  sort: SortMode;
}

// ─── Static fallback loader ───

async function loadStaticSources(): Promise<ResearchSource[]> {
  const res = await fetch('/data/knowledge-base-sources.json');
  if (!res.ok) {
    // Fallback: import from data directory via relative path
    const mod = await import('../../../../data/knowledge-base-sources.json');
    return normalizeKnowledgeBase(mod.default ?? mod);
  }
  const data = await res.json();
  return normalizeKnowledgeBase(data);
}

function normalizeKnowledgeBase(data: Record<string, unknown>): ResearchSource[] {
  const sources: ResearchSource[] = [];
  let idx = 0;

  const categories: { key: SourceCategory; items: unknown[] }[] = [
    { key: 'research_papers', items: (data.research_papers as unknown[]) ?? [] },
    { key: 'open_datasets', items: (data.open_datasets as unknown[]) ?? [] },
    { key: 'satellite_platforms', items: (data.satellite_platforms as unknown[]) ?? [] },
    { key: 'regulatory_documents', items: (data.regulatory_documents as unknown[]) ?? [] },
    { key: 'technology_references', items: (data.technology_references as unknown[]) ?? [] },
    { key: 'app_references', items: (data.app_references as unknown[]) ?? [] },
  ];

  for (const cat of categories) {
    for (const raw of cat.items) {
      const item = raw as Record<string, unknown>;
      sources.push({
        id: `src_${idx++}`,
        category: cat.key,
        title: (item.title as string) ?? '',
        authors: (item.authors as string[]) ?? (item.source ? [item.source as string] : []),
        source: (item.source as string) ?? undefined,
        year: (item.year as number) ?? undefined,
        institution: (item.institution as string) ?? undefined,
        journal: (item.journal as string) ?? undefined,
        topicTags: (item.topicTags as string[]) ?? (item.topic ? [item.topic as string] : []),
        url: (item.pdfUrl as string) ?? (item.url as string) ?? '',
        description: (item.abstract as string) ?? (item.description as string) ?? '',
        jurisdiction: (item.jurisdiction as string) ?? undefined,
      });
    }
  }

  return sources;
}

// ─── Supabase loader ───

async function loadFromSupabase(): Promise<ResearchSource[] | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('research_embeddings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) return null;

    return data.map((row: Record<string, unknown>, i: number) => ({
      id: (row.id as string) ?? `db_${i}`,
      category: (row.category as SourceCategory) ?? 'research_papers',
      title: (row.title as string) ?? '',
      authors: (row.authors as string[]) ?? [],
      source: (row.source as string) ?? undefined,
      year: (row.year as number) ?? undefined,
      institution: (row.institution as string) ?? undefined,
      journal: (row.journal as string) ?? undefined,
      topicTags: (row.topic_tags as string[]) ?? [],
      url: (row.url as string) ?? '',
      description: (row.description as string) ?? '',
      jurisdiction: (row.jurisdiction as string) ?? undefined,
    }));
  } catch {
    return null;
  }
}

// ─── Search scoring ───

function computeRelevance(source: ResearchSource, query: string): number {
  if (!query) return 0;
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  let score = 0;

  for (const term of terms) {
    if (source.title.toLowerCase().includes(term)) score += 10;
    if (source.description.toLowerCase().includes(term)) score += 3;
    if (source.authors.some((a) => a.toLowerCase().includes(term))) score += 5;
    if (source.topicTags.some((t) => t.toLowerCase().includes(term))) score += 7;
    if (source.institution?.toLowerCase().includes(term)) score += 4;
    if (source.journal?.toLowerCase().includes(term)) score += 2;
  }

  return score;
}

// ─── Hook ───

export function useResearchSources() {
  const [allSources, setAllSources] = useState<ResearchSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ResearchFilters>({
    search: '',
    categories: [],
    topicTags: [],
    sort: 'relevance',
  });

  // Load sources on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        // Try Supabase first, fall back to static JSON
        const dbSources = await loadFromSupabase();
        if (!cancelled) {
          if (dbSources && dbSources.length > 0) {
            setAllSources(dbSources);
          } else {
            const staticSources = await loadStaticSources();
            setAllSources(staticSources);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load research sources');
          // Last resort: try static
          try {
            const staticSources = await loadStaticSources();
            setAllSources(staticSources);
          } catch {
            // Nothing more to do
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Extract unique categories
  const categories = useMemo<SourceCategory[]>(() => {
    const set = new Set<SourceCategory>();
    for (const s of allSources) set.add(s.category);
    return Array.from(set);
  }, [allSources]);

  // Extract unique topic tags
  const topicTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of allSources) {
      for (const tag of s.topicTags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [allSources]);

  // Filtered + sorted sources
  const filteredSources = useMemo(() => {
    let results = allSources;

    // Category filter
    if (filters.categories.length > 0) {
      results = results.filter((s) => filters.categories.includes(s.category));
    }

    // Topic tag filter (AND logic: source must have ALL selected tags)
    if (filters.topicTags.length > 0) {
      results = results.filter((s) =>
        filters.topicTags.every((tag) => s.topicTags.includes(tag)),
      );
    }

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      results = results.filter((s) => {
        const haystack = [
          s.title,
          s.description,
          ...s.authors,
          ...s.topicTags,
          s.institution ?? '',
          s.journal ?? '',
          s.source ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    // Sort
    switch (filters.sort) {
      case 'relevance':
        if (filters.search.trim()) {
          results = [...results].sort(
            (a, b) =>
              computeRelevance(b, filters.search) - computeRelevance(a, filters.search),
          );
        }
        break;
      case 'year':
        results = [...results].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      case 'title':
        results = [...results].sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return results;
  }, [allSources, filters]);

  const setFilters = useCallback((update: Partial<ResearchFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...update }));
  }, []);

  // Find related sources by shared topic tags
  const getRelatedSources = useCallback(
    (source: ResearchSource, limit = 5): ResearchSource[] => {
      return allSources
        .filter((s) => s.id !== source.id)
        .map((s) => ({
          source: s,
          shared: s.topicTags.filter((t) => source.topicTags.includes(t)).length,
        }))
        .filter((r) => r.shared > 0)
        .sort((a, b) => b.shared - a.shared)
        .slice(0, limit)
        .map((r) => r.source);
    },
    [allSources],
  );

  return {
    sources: allSources,
    filteredSources,
    categories,
    topicTags,
    filters,
    setFilters,
    isLoading,
    error,
    getRelatedSources,
    totalCount: allSources.length,
  };
}
