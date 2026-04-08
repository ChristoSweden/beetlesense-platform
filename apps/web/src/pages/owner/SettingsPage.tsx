import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Bell } from 'lucide-react';
import { ProfileSettings } from '@/components/settings/ProfileSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { ParcelManagement } from '@/components/settings/ParcelManagement';
import { TourSettings } from '@/components/settings/TourSettings';
import { IntegrationStatusPanel } from '@/components/settings/IntegrationStatus';
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection';

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.settings')}</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-6">{t('nav.settings')}</h1>

      <div className="space-y-6">
        <ProfileSettings />
        <ParcelManagement />
        <NotificationSettings />

        {/* Link to full notification settings */}
        <Link
          to="/owner/notification-settings"
          className="flex items-center justify-between p-4 rounded-xl border border-[var(--border)] bg-[var(--bg2)] hover:bg-[var(--bg3)] transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <Bell size={16} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--text)]">
                {t('notifications.advancedSettings')}
              </p>
              <p className="text-[10px] text-[var(--text3)]">
                {t('notifications.advancedSettingsDesc')}
              </p>
            </div>
          </div>
          <ChevronRight
            size={14}
            className="text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors"
          />
        </Link>

        <LanguageSettings />
        <TourSettings />
        <IntegrationStatusPanel />
        <DeleteAccountSection />
      </div>
    </div>
  );
}
