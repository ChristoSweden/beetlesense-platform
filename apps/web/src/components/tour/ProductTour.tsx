import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTourStore, OWNER_TOUR_STEPS } from '@/stores/tourStore';
import { useAuthStore } from '@/stores/authStore';
import { TourStep } from './TourStep';

export function ProductTour() {
  const { isActive, currentStep, nextStep, prevStep, skipTour, checkAutoStart } = useTourStore();
  const { profile } = useAuthStore();
  const location = useLocation();

  // Auto-start tour on dashboard for first-time users
  useEffect(() => {
    const isDashboard =
      location.pathname === '/owner/dashboard' ||
      location.pathname === '/pilot/dashboard' ||
      location.pathname === '/inspector/dashboard';

    if (isDashboard && profile) {
      checkAutoStart();
    }
  }, [location.pathname, profile, checkAutoStart]);

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

  // Only show tour for owner role on dashboard
  if (!isActive) return null;
  if (profile?.role !== 'owner' && profile?.role !== 'admin') return null;

  return (
    <TourStep
      stepIndex={currentStep}
      totalSteps={OWNER_TOUR_STEPS.length}
      onNext={nextStep}
      onPrev={prevStep}
      onSkip={skipTour}
    />
  );
}
