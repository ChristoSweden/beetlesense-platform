import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRegulatoryAlerts } from '@/hooks/useRegulatoryData';

export function RegulatoryAlertBanner() {
  const { t } = useTranslation();
  const { affectedParcelCount, totalConstraints, isLoading, dismissed, dismiss } =
    useRegulatoryAlerts();

  if (isLoading || dismissed || affectedParcelCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--amber)]/20 bg-[var(--amber)]/5 mb-4">
      <AlertTriangle size={16} className="text-[var(--amber)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--amber)]">
          {t('regulatory.alertBanner', {
            parcelCount: affectedParcelCount,
            constraintCount: totalConstraints,
          })}
        </p>
      </div>
      <Link
        to="/owner/parcels"
        className="flex items-center gap-1 text-xs text-[var(--amber)] font-medium hover:underline flex-shrink-0"
      >
        {t('owner.dashboard.viewAll')}
        <ChevronRight size={12} />
      </Link>
      <button
        onClick={dismiss}
        className="p-1 rounded text-[var(--amber)]/60 hover:text-[var(--amber)] transition-colors flex-shrink-0"
        title={t('common.close')}
      >
        <X size={14} />
      </button>
    </div>
  );
}
