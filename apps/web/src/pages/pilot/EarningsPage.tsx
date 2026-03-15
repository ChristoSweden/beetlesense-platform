import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { EarningsDashboard } from '@/components/pilot/EarningsDashboard';

export default function EarningsPage() {
  const { t } = useTranslation();

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/pilot/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.earnings')}</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-4">
        {t('nav.earnings')}
      </h1>

      <EarningsDashboard />
    </div>
  );
}
