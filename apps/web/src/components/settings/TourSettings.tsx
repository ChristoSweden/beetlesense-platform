import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, RotateCcw } from 'lucide-react';
import { useTourStore } from '@/stores/tourStore';
import { useAuthStore } from '@/stores/authStore';

export function TourSettings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startTour, hasCompletedTour } = useTourStore();
  const { profile } = useAuthStore();

  const handleRestartTour = () => {
    // Navigate to dashboard first, then start tour
    const rolePrefix = profile?.role ?? 'owner';
    navigate(`/${rolePrefix}/dashboard`);
    // Small delay to let the dashboard render
    setTimeout(() => {
      startTour();
    }, 500);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3 flex items-center gap-2">
        <HelpCircle size={12} className="text-[var(--green)]" />
        {t('tour.settingsTitle')}
      </h3>

      <p className="text-xs text-[var(--text3)] mb-3">
        {t('tour.settingsDesc')}
      </p>

      <button
        onClick={handleRestartTour}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors w-full justify-center"
      >
        <RotateCcw size={14} />
        {t('tour.restart')}
      </button>

      {hasCompletedTour && (
        <p className="text-[10px] text-[var(--text3)] mt-2 text-center">
          {t('tour.completed')}
        </p>
      )}
    </div>
  );
}
