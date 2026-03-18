import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─── Types ─── */
export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

export interface ExpertiseConfig {
  /** Current expertise level */
  level: ExpertiseLevel;
  /** Swedish label for the current level */
  label: string;
  /** Update expertise and persist to localStorage + Supabase */
  setLevel: (level: ExpertiseLevel) => void;
  /** Whether a higher detail level is active (intermediate or expert) */
  isAdvanced: boolean;
  /** Whether the maximum detail level is active */
  isExpert: boolean;
}

const STORAGE_KEY = 'beetlesense_expertise_level';

const LABELS: Record<ExpertiseLevel, string> = {
  beginner: 'Enkel',
  intermediate: 'Standard',
  expert: 'Detaljerad',
};

const DEFAULT_LEVEL: ExpertiseLevel = 'beginner';

/* ─── Context ─── */
const ExpertiseContext = createContext<ExpertiseConfig | null>(null);

/* ─── Provider ─── */
export function ExpertiseProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuthStore();
  const [level, setLevelState] = useState<ExpertiseLevel>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'beginner' || stored === 'intermediate' || stored === 'expert') {
        return stored;
      }
    } catch {
      /* localStorage unavailable */
    }
    return DEFAULT_LEVEL;
  });

  // Auto-upgrade new users after 3 completed surveys
  useEffect(() => {
    if (!profile || !isSupabaseConfigured) return;
    if (level !== 'beginner') return; // only auto-upgrade beginners

    let cancelled = false;
    (async () => {
      try {
        const { count } = await supabase
          .from('surveys')
          .select('id', { count: 'exact', head: true })
          .eq('owner_id', profile.id)
          .eq('status', 'completed');

        if (!cancelled && count != null && count >= 3) {
          const stored = localStorage.getItem(STORAGE_KEY);
          // Only auto-upgrade if user hasn't explicitly chosen a level
          if (!stored) {
            setLevelState('intermediate');
            localStorage.setItem(STORAGE_KEY, 'intermediate');
          }
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, level]);

  // Sync to Supabase profile when level changes
  const setLevel = useCallback(
    (newLevel: ExpertiseLevel) => {
      setLevelState(newLevel);
      try {
        localStorage.setItem(STORAGE_KEY, newLevel);
      } catch {
        /* localStorage unavailable */
      }

      // Persist to Supabase profile metadata if online
      if (isSupabaseConfigured && profile?.id && profile.id !== 'demo-user') {
        supabase
          .from('profiles')
          .update({ expertise_level: newLevel } as Record<string, unknown>)
          .eq('id', profile.id)
          .then(() => {});
      }
    },
    [profile],
  );

  const value: ExpertiseConfig = {
    level,
    label: LABELS[level],
    setLevel,
    isAdvanced: level === 'intermediate' || level === 'expert',
    isExpert: level === 'expert',
  };

  return (
    <ExpertiseContext.Provider value={value}>
      {children}
    </ExpertiseContext.Provider>
  );
}

/* ─── Hook ─── */
export function useExpertise(): ExpertiseConfig {
  const ctx = useContext(ExpertiseContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider
    return {
      level: 'beginner',
      label: LABELS.beginner,
      setLevel: () => {},
      isAdvanced: false,
      isExpert: false,
    };
  }
  return ctx;
}
