import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTourStore, OWNER_TOUR_STEPS } from '@/stores/tourStore';
import { useAuthStore } from '@/stores/authStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';
import { TourStep } from './TourStep';

export function ProductTour() {
  const { isActive, currentStep, nextStep, prevStep, skipTour, checkAutoStart, checkDemoAutoStart } = useTourStore();
  const { profile } = useAuthStore();
  const location = useLocation();

  const isDemoMode = isDemo() || !isSupabaseConfigured;

  // Auto-start tour on dashboard
  useEffect(() => {
    const isDashboard =
      location.pathname === '/owner/dashboard' ||
      location.pathname === '/pilot/dashboard' ||
      location.pathname === '/inspector/dashboard';

    if (isDashboard) {
      if (isDemoMode) {
        // In demo mode, always auto-start (no profile required)
        checkDemoAutoStart();
      } else if (profile) {
        checkAutoStart();
      }
    }
  }, [location.pathname, profile, isDemoMode, checkAutoStart, checkDemoAutoStart]);

  // Prevent body scroll when tour is active
  useEffect(() => {
    if (isActive) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive]);

  // Only show tour for owner role on dashboard (or demo mode)
  if (!isActive) return null;
  if (!isDemoMode && profile?.role !== 'owner' && profile?.role !== 'admin') return null;

  // In demo mode, override the first step's i18n keys
  const overriddenSteps = isDemoMode
    ? OWNER_TOUR_STEPS.map((step, i) =>
        i === 0
          ? { ...step, i18nTitleKey: 'tour.demoWelcomeTitle', i18nDescKey: 'tour.demoWelcomeDesc' }
          : step,
      )
    : OWNER_TOUR_STEPS;

  return (
    <TourStep
      stepIndex={currentStep}
      totalSteps={overriddenSteps.length}
      onNext={nextStep}
      onPrev={prevStep}
      onSkip={skipTour}
      steps={overriddenSteps}
    />
  );
}
