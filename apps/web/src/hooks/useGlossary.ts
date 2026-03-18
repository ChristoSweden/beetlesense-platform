import { useMemo, useCallback, useState } from 'react';
import { glossaryTerms, type GlossaryCategory, type GlossaryTerm } from '@/data/forestryGlossaryData';

export interface DetectedTerm {
  term: GlossaryTerm;
  start: number;
  end: number;
}

export interface UseGlossaryReturn {
  /** All glossary terms */
  terms: GlossaryTerm[];
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (q: string) => void;
  /** Active category filters */
  activeCategories: GlossaryCategory[];
  /** Toggle a category filter */
  toggleCategory: (cat: GlossaryCategory) => void;
  /** Clear all category filters */
  clearCategories: () => void;
  /** Filtered terms based on search + category */
  filteredTerms: GlossaryTerm[];
  /** Look up a single term by id */
  lookupTerm: (id: string) => GlossaryTerm | undefined;
  /** Detect glossary terms in a text string */
  detectTerms: (text: string) => DetectedTerm[];
  /** Alphabetical index of first letters that exist in filtered terms */
  alphabet: string[];
  /** Group filtered terms by first letter */
  groupedTerms: Record<string, GlossaryTerm[]>;
}

export function useGlossary(): UseGlossaryReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState<GlossaryCategory[]>([]);

  const toggleCategory = useCallback((cat: GlossaryCategory) => {
    setActiveCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const clearCategories = useCallback(() => {
    setActiveCategories([]);
  }, []);

  const filteredTerms = useMemo(() => {
    let result = glossaryTerms;

    // Filter by category
    if (activeCategories.length > 0) {
      result = result.filter((t) => activeCategories.includes(t.category));
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.term_sv.toLowerCase().includes(q) ||
          t.term_en.toLowerCase().includes(q) ||
          t.definition_sv.toLowerCase().includes(q) ||
          t.definition_en.toLowerCase().includes(q),
      );
    }

    // Sort alphabetically by Swedish term
    return result.sort((a, b) => a.term_sv.localeCompare(b.term_sv, 'sv'));
  }, [searchQuery, activeCategories]);

  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    for (const term of filteredTerms) {
      const letter = term.term_sv.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    }
    return groups;
  }, [filteredTerms]);

  const alphabet = useMemo(() => Object.keys(groupedTerms).sort((a, b) => a.localeCompare(b, 'sv')), [groupedTerms]);

  const lookupTerm = useCallback((id: string) => {
    return glossaryTerms.find((t) => t.id === id);
  }, []);

  // Build a sorted list of terms for matching (longest first to avoid partial matches)
  const termPatterns = useMemo(() => {
    const patterns = glossaryTerms
      .flatMap((t) => {
        // Include the main Swedish and English terms
        const variants: { text: string; term: GlossaryTerm }[] = [
          { text: t.term_sv, term: t },
        ];
        // Also include English term but only the primary name (before parentheses/slashes)
        const enPrimary = t.term_en.split(/[(/]/)[0].trim();
        if (enPrimary.length > 3) {
          variants.push({ text: enPrimary, term: t });
        }
        return variants;
      })
      .sort((a, b) => b.text.length - a.text.length); // longest first
    return patterns;
  }, []);

  const detectTerms = useCallback(
    (text: string): DetectedTerm[] => {
      if (!text) return [];
      const detected: DetectedTerm[] = [];
      const occupied = new Set<number>(); // track character positions already matched

      for (const { text: pattern, term } of termPatterns) {
        const lowerText = text.toLowerCase();
        const lowerPattern = pattern.toLowerCase();
        let searchFrom = 0;

        while (searchFrom < lowerText.length) {
          const idx = lowerText.indexOf(lowerPattern, searchFrom);
          if (idx === -1) break;

          const end = idx + pattern.length;

          // Check if any position in this range is already occupied
          let conflict = false;
          for (let i = idx; i < end; i++) {
            if (occupied.has(i)) {
              conflict = true;
              break;
            }
          }

          if (!conflict) {
            // Check word boundaries (allow match at start/end of string or next to non-alphanumeric)
            const charBefore = idx > 0 ? text[idx - 1] : ' ';
            const charAfter = end < text.length ? text[end] : ' ';
            const isBoundary =
              /[\s,.:;!?'"()\-/]/.test(charBefore) || idx === 0;
            const isEndBoundary =
              /[\s,.:;!?'"()\-/]/.test(charAfter) || end === text.length;

            if (isBoundary && isEndBoundary) {
              detected.push({ term, start: idx, end });
              for (let i = idx; i < end; i++) occupied.add(i);
            }
          }

          searchFrom = idx + 1;
        }
      }

      return detected.sort((a, b) => a.start - b.start);
    },
    [termPatterns],
  );

  return {
    terms: glossaryTerms,
    searchQuery,
    setSearchQuery,
    activeCategories,
    toggleCategory,
    clearCategories,
    filteredTerms,
    lookupTerm,
    detectTerms,
    alphabet,
    groupedTerms,
  };
}
