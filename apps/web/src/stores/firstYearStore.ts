import { create } from 'zustand';
import { FIRST_YEAR_TASKS } from '@/data/firstYearChecklistData';

const STORAGE_KEY = 'beetlesense-first-year';

interface FirstYearState {
  completedTasks: Set<string>;
  startMonth: number; // the month (1-12) when the user started

  toggleTask: (taskId: string) => void;
  isCompleted: (taskId: string) => boolean;
  resetProgress: () => void;
  getCompletedCount: () => number;
  getTotalCount: () => number;
  getProgressPercent: () => number;
  getNextRecommendedTask: () => string | null;
  getCurrentMonth: () => number;
}

function loadPersistedState(): { completedTasks: string[]; startMonth: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        completedTasks: Array.isArray(parsed.completedTasks) ? parsed.completedTasks : [],
        startMonth: parsed.startMonth ?? new Date().getMonth() + 1,
      };
    }
  } catch {
    // ignore
  }
  return { completedTasks: [], startMonth: new Date().getMonth() + 1 };
}

function persistState(completedTasks: Set<string>, startMonth: number) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedTasks: [...completedTasks], startMonth }),
    );
  } catch {
    // ignore
  }
}

const initial = loadPersistedState();

export const useFirstYearStore = create<FirstYearState>((set, get) => ({
  completedTasks: new Set(initial.completedTasks),
  startMonth: initial.startMonth,

  toggleTask: (taskId: string) => {
    const { completedTasks, startMonth } = get();
    const next = new Set(completedTasks);
    if (next.has(taskId)) {
      next.delete(taskId);
    } else {
      next.add(taskId);
    }
    set({ completedTasks: next });
    persistState(next, startMonth);
  },

  isCompleted: (taskId: string) => {
    return get().completedTasks.has(taskId);
  },

  getCompletedCount: () => {
    return get().completedTasks.size;
  },

  getTotalCount: () => {
    return FIRST_YEAR_TASKS.length;
  },

  getProgressPercent: () => {
    const total = FIRST_YEAR_TASKS.length;
    if (total === 0) return 0;
    return Math.round((get().completedTasks.size / total) * 100);
  },

  getNextRecommendedTask: () => {
    const { completedTasks } = get();
    const currentCalendarMonth = new Date().getMonth() + 1;

    // Find the first uncompleted task, prioritizing the current calendar month
    const currentMonthTask = FIRST_YEAR_TASKS.find(
      (t) => t.month === currentCalendarMonth && !completedTasks.has(t.id),
    );
    if (currentMonthTask) return currentMonthTask.id;

    // Otherwise find the first uncompleted task overall
    const anyTask = FIRST_YEAR_TASKS.find((t) => !completedTasks.has(t.id));
    return anyTask?.id ?? null;
  },

  getCurrentMonth: () => {
    return new Date().getMonth() + 1;
  },

  resetProgress: () => {
    const startMonth = new Date().getMonth() + 1;
    set({ completedTasks: new Set(), startMonth });
    persistState(new Set(), startMonth);
  },
}));
