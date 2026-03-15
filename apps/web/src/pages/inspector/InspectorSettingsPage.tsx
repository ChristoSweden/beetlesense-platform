import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';

export default function InspectorSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.settings')}</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-6">{t('nav.settings')}</h1>

      <div className="space-y-6">
        <ProfileSettings />
        <NotificationSettings />
        <LanguageSettings />
      </div>
    </div>
  );
}
