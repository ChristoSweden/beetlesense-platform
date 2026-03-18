import { useTranslation } from 'react-i18next';
import { useEmergencyStore } from '@/stores/emergencyStore';
import { AlertTriangle } from 'lucide-react';

/**
 * Emergency "Something's Wrong" FAB.
 * Fixed bottom-right on mobile, rendered inline in the sidebar on desktop.
 * Pulsing animation to draw attention during emergencies.
 */
export function EmergencyButton() {
  const { t } = useTranslation();
  const openEmergency = useEmergencyStore((s) => s.openEmergency);

  return (
    <button
      onClick={openEmergency}
      className="
        group relative flex items-center gap-2.5
        bg-red-600 hover:bg-red-500 active:bg-red-700
        text-white font-semibold
        rounded-full shadow-lg shadow-red-900/40
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]
      "
      aria-label={t('emergency.somethingsWrong')}
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full animate-ping bg-red-500/30 pointer-events-none" />

      <span className="relative flex items-center gap-2.5 px-5 py-3.5 z-10">
        <AlertTriangle size={20} className="flex-shrink-0" aria-hidden="true" />
        <span className="text-sm whitespace-nowrap">
          {t('emergency.somethingsWrong')}
        </span>
      </span>
    </button>
  );
}

/**
 * Floating version — fixed bottom-right, above mobile nav.
 * Shown on mobile and on desktop pages without a sidebar slot.
 */
export function EmergencyFAB() {
  const { t } = useTranslation();
  const openEmergency = useEmergencyStore((s) => s.openEmergency);
  const isOpen = useEmergencyStore((s) => s.isOpen);

  if (isOpen) return null;

  return (
    <button
      onClick={openEmergency}
      className="
        fixed z-50
        bottom-[calc(var(--mobile-nav-height)+16px)] right-4
        lg:bottom-6 lg:right-6
        group flex items-center gap-2
        bg-red-600 hover:bg-red-500 active:bg-red-700
        text-white font-semibold
        rounded-full shadow-lg shadow-red-900/40
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]
      "
      aria-label={t('emergency.somethingsWrong')}
    >
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full animate-ping bg-red-500/30 pointer-events-none" />

      <span className="relative flex items-center gap-2 px-4 py-3 lg:px-5 lg:py-3.5 z-10">
        <AlertTriangle size={18} className="flex-shrink-0" aria-hidden="true" />
        <span className="text-sm whitespace-nowrap hidden sm:inline">
          {t('emergency.somethingsWrong')}
        </span>
      </span>
    </button>
  );
}
