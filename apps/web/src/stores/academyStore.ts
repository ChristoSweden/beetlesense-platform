import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SectionProgress {
  completed: boolean;
  quizAnswered?: boolean;
  quizCorrect?: boolean;
}

export interface LessonProgress {
  lessonId: string;
  started: boolean;
  completed: boolean;
  currentSection: number;
  sections: Record<number, SectionProgress>;
  startedAt: number;
  completedAt?: number;
}

// ─── Store ──────────────────────────────────────────────────────────────────────

interface AcademyState {
  lessonProgress: Record<string, LessonProgress>;
  currentLessonId: string | null;

  // Actions
  startLesson: (lessonId: string, totalSections: number) => void;
  completeSection: (lessonId: string, sectionIndex: number, quiz?: { answered: boolean; correct: boolean }) => void;
  completeLesson: (lessonId: string) => void;
  setCurrentLesson: (lessonId: string | null) => void;
  resetProgress: () => void;

  // Computed
  completedLessonIds: () => string[];
  completedCount: () => number;
  inProgressLessonIds: () => string[];
  getLessonProgress: (lessonId: string) => LessonProgress | undefined;
}

export const useAcademyStore = create<AcademyState>()(
  persist(
    (set, get) => ({
      lessonProgress: {},
      currentLessonId: null,

      startLesson: (lessonId, _totalSections) => {
        const existing = get().lessonProgress[lessonId];
        if (existing?.started) {
          set({ currentLessonId: lessonId });
          return;
        }
        set((state) => ({
          currentLessonId: lessonId,
          lessonProgress: {
            ...state.lessonProgress,
            [lessonId]: {
              lessonId,
              started: true,
              completed: false,
              currentSection: 0,
              sections: {},
              startedAt: Date.now(),
            },
          },
        }));
      },

      completeSection: (lessonId, sectionIndex, quiz) => {
        set((state) => {
          const lesson = state.lessonProgress[lessonId];
          if (!lesson) return state;
          return {
            lessonProgress: {
              ...state.lessonProgress,
              [lessonId]: {
                ...lesson,
                currentSection: Math.max(lesson.currentSection, sectionIndex + 1),
                sections: {
                  ...lesson.sections,
                  [sectionIndex]: {
                    completed: true,
                    quizAnswered: quiz?.answered,
                    quizCorrect: quiz?.correct,
                  },
                },
              },
            },
          };
        });
      },

      completeLesson: (lessonId) => {
        set((state) => {
          const lesson = state.lessonProgress[lessonId];
          if (!lesson) return state;
          return {
            lessonProgress: {
              ...state.lessonProgress,
              [lessonId]: {
                ...lesson,
                completed: true,
                completedAt: Date.now(),
              },
            },
          };
        });
      },

      setCurrentLesson: (lessonId) => set({ currentLessonId: lessonId }),

      resetProgress: () => set({ lessonProgress: {}, currentLessonId: null }),

      completedLessonIds: () => {
        const { lessonProgress } = get();
        return Object.values(lessonProgress)
          .filter((lp) => lp.completed)
          .map((lp) => lp.lessonId);
      },

      completedCount: () => {
        const { lessonProgress } = get();
        return Object.values(lessonProgress).filter((lp) => lp.completed).length;
      },

      inProgressLessonIds: () => {
        const { lessonProgress } = get();
        return Object.values(lessonProgress)
          .filter((lp) => lp.started && !lp.completed)
          .map((lp) => lp.lessonId);
      },

      getLessonProgress: (lessonId) => get().lessonProgress[lessonId],
    }),
    {
      name: 'beetlesense-academy',
      partialize: (state) => ({
        lessonProgress: state.lessonProgress,
        currentLessonId: state.currentLessonId,
      }),
    },
  ),
);
