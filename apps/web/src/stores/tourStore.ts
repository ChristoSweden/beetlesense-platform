import { create } from 'zustand';

const STORAGE_KEY = 'beetlesense-tour';

export interface TourStep {
  id: string;
  targetSelector: string;
  i18nTitleKey: string;
  i18nDescKey: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
}

export const OWNER_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '[data-tour="welcome"]',
    i18nTitleKey: 'tour.welcomeTitle',
    i18nDescKey: 'tour.welcomeDesc',
    position: 'bottom',
  },
  {
    id: 'health-score',
    targetSelector: '[data-tour="health-score"]',
    i18nTitleKey: 'tour.healthTitle',
    i18nDescKey: 'tour.healthDesc',
    position: 'right',
  },
  {
    id: 'timber-value',
    targetSelector: '[data-tour="timber-value"]',
    i18nTitleKey: 'tour.timberTitle',
    i18nDescKey: 'tour.timberDesc',
    position: 'right',
  },
  {
    id: 'map',
    targetSelector: '[data-tour="map"]',
    i18nTitleKey: 'tour.mapTitle',
    i18nDescKey: 'tour.mapDesc',
    position: 'left',
  },
  {
    id: 'companion',
    targetSelector: '[data-tour="companion"]',
    i18nTitleKey: 'tour.companionTitle',
    i18nDescKey: 'tour.companionDesc',
    position: 'bottom',
  },
  {
    id: 'alerts',
    targetSelector: '[data-tour="alerts"]',
    i18nTitleKey: 'tour.alertsTitle',
    i18nDescKey: 'tour.alertsDesc',
    position: 'bottom',
  },
  {
    id: 'field-mode',
    targetSelector: '[data-tour="field-mode"]',
    i18nTitleKey: 'tour.fieldModeTitle',
    i18nDescKey: 'tour.fieldModeDesc',
    position: 'bottom',
  },
  {
    id: 'complete',
    targetSelector: '[data-tour="welcome"]',
    i18nTitleKey: 'tour.completeTitle',
    i18nDescKey: 'tour.completeDesc',
    position: 'bottom',
  },
];

interface TourState {
  currentStep: number;
  isActive: boolean;
  hasCompletedTour: boolean;

  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  checkAutoStart: () => void;
}

function loadPersistedState(): { hasCompletedTour: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { hasCompletedTour: !!parsed.hasCompletedTour };
    }
  } catch {
    // ignore
  }
  return { hasCompletedTour: false };
}

function persistState(hasCompletedTour: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ hasCompletedTour }));
  } catch {
    // ignore
  }
}

export const useTourStore = create<TourState>((set, get) => ({
  currentStep: 0,
  isActive: false,
  hasCompletedTour: loadPersistedState().hasCompletedTour,

  startTour: () => {
    set({ currentStep: 0, isActive: true });
  },

  nextStep: () => {
    const { currentStep } = get();
    const maxStep = OWNER_TOUR_STEPS.length - 1;
    if (currentStep >= maxStep) {
      get().completeTour();
    } else {
      set({ currentStep: currentStep + 1 });
    }
  },

  prevStep: () => {
    const { currentStep } = get();
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },

  skipTour: () => {
    set({ isActive: false, currentStep: 0, hasCompletedTour: true });
    persistState(true);
  },

  completeTour: () => {
    set({ isActive: false, currentStep: 0, hasCompletedTour: true });
    persistState(true);
  },

  checkAutoStart: () => {
    const { hasCompletedTour, isActive } = get();
    if (!hasCompletedTour && !isActive) {
      // Small delay so the dashboard has time to render its elements
      setTimeout(() => {
        set({ isActive: true, currentStep: 0 });
      }, 800);
    }
  },
}));
