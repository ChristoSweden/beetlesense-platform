import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───

export type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  /** The resolved theme after applying system preference */
  resolvedTheme: 'dark' | 'light';

  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
  /** Call once on app mount to start listening to system preference */
  initSystemListener: () => () => void;
}

// ─── Helpers ───

function getSystemPreference(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  return theme === 'system' ? getSystemPreference() : theme;
}

function applyTheme(resolved: 'dark' | 'light') {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', resolved);
  }
}

const CYCLE_ORDER: Theme[] = ['dark', 'light', 'system'];

// ─── Store ───

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      resolvedTheme: 'dark',

      setTheme: (theme: Theme) => {
        const resolved = resolveTheme(theme);
        applyTheme(resolved);
        set({ theme, resolvedTheme: resolved });
      },

      cycleTheme: () => {
        const current = get().theme;
        const idx = CYCLE_ORDER.indexOf(current);
        const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
        get().setTheme(next);
      },

      initSystemListener: () => {
        // Apply the persisted theme on mount
        const { theme } = get();
        const resolved = resolveTheme(theme);
        applyTheme(resolved);
        set({ resolvedTheme: resolved });

        // Listen for OS preference changes (only matters when theme === 'system')
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => {
          const { theme: currentTheme } = get();
          if (currentTheme === 'system') {
            const newResolved = getSystemPreference();
            applyTheme(newResolved);
            set({ resolvedTheme: newResolved });
          }
        };
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      },
    }),
    {
      name: 'beetlesense-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolved = resolveTheme(state.theme);
          applyTheme(resolved);
          state.resolvedTheme = resolved;
        }
      },
    },
  ),
);
