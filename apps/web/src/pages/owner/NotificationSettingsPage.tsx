import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Bell,
  Mail,
  Smartphone,
  Moon,
  Send,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import {
  useNotificationStore,
  ALL_CATEGORIES,
  type NotificationCategory,
  type EmailFrequency,
} from '@/stores/notificationStore';
import {
  requestPermission,
  subscribeToPush,
  unsubscribe as unsubscribePush,
} from '@/lib/pushNotifications';
import { useAuthStore } from '@/stores/authStore';

// ─── Category Labels ───

const CATEGORY_LABEL_KEYS: Record<NotificationCategory, string> = {
  alerts: 'notifications.categories.alerts',
  permits: 'notifications.categories.permits',
  surveys: 'notifications.categories.surveys',
  community: 'notifications.categories.community',
  system: 'notifications.categories.system',
};

const CATEGORY_DESC_KEYS: Record<NotificationCategory, string> = {
  alerts: 'notifications.categories.alertsDesc',
  permits: 'notifications.categories.permitsDesc',
  surveys: 'notifications.categories.surveysDesc',
  community: 'notifications.categories.communityDesc',
  system: 'notifications.categories.systemDesc',
};

// ─── Toggle Component ───

function Toggle({
  enabled,
  onChange,
  label,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${
        enabled ? 'bg-[var(--green)]' : 'bg-[var(--text3)]/30'
      }`}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
    >
      <div
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
        style={{ left: enabled ? '22px' : '2px' }}
      />
    </button>
  );
}

// ─── Page Component ───

export default function NotificationSettingsPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const {
    preferences,
    preferencesLoading,
    pushPermission,
    checkPushPermission,
    loadPreferences,
    updatePreferences,
    updateCategoryPref,
  } = useNotificationStore();

  const [testSent, setTestSent] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    checkPushPermission();
    loadPreferences();
  }, [checkPushPermission, loadPreferences]);

  // ─── Push permission flow ───
  const handleEnablePush = useCallback(async () => {
    if (!profile) return;
    setPushLoading(true);
    try {
      const permission = await requestPermission();
      checkPushPermission();
      if (permission === 'granted') {
        await subscribeToPush(profile.id);
      }
    } catch (err) {
      console.error('Push enable failed:', err);
    } finally {
      setPushLoading(false);
    }
  }, [profile, checkPushPermission]);

  const handleDisablePush = useCallback(async () => {
    setPushLoading(true);
    try {
      await unsubscribePush();
      checkPushPermission();
    } catch (err) {
      console.error('Push disable failed:', err);
    } finally {
      setPushLoading(false);
    }
  }, [checkPushPermission]);

  // ─── Test notification ───
  const handleTestNotification = useCallback(async () => {
    setTestSent(true);

    // Show a browser notification if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('BeetleSense Test', {
        body: t('notifications.testBody'),
        icon: '/icon-192.png',
      });
    }

    setTimeout(() => setTestSent(false), 3000);
  }, [t]);

  if (preferencesLoading) {
    return (
      <div className="p-4 lg:p-6 max-w-3xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[var(--green)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <Link to="/owner/settings" className="hover:text-[var(--text2)]">
          {t('nav.settings')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('notifications.settingsTitle')}</span>
      </nav>

      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-6">
        {t('notifications.settingsTitle')}
      </h1>

      <div className="space-y-6">
        {/* ─── Push Notification Section ─── */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone size={14} className="text-[var(--green)]" />
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              {t('notifications.push.title')}
            </h3>
          </div>

          {pushPermission === 'unsupported' && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text3)]">
                {t('notifications.push.unsupported')}
              </p>
            </div>
          )}

          {pushPermission === 'denied' && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-amber-300 font-medium">
                  {t('notifications.push.blocked')}
                </p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  {t('notifications.push.blockedDesc')}
                </p>
              </div>
            </div>
          )}

          {pushPermission === 'default' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg3)]">
              <div>
                <p className="text-xs font-medium text-[var(--text)]">
                  {t('notifications.push.enable')}
                </p>
                <p className="text-[10px] text-[var(--text3)]">
                  {t('notifications.push.enableDesc')}
                </p>
              </div>
              <button
                onClick={handleEnablePush}
                disabled={pushLoading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--green)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
              >
                {pushLoading && <Loader2 size={12} className="animate-spin" />}
                {t('notifications.push.enableBtn')}
              </button>
            </div>
          )}

          {pushPermission === 'granted' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[var(--green)]" />
                <p className="text-xs font-medium text-[var(--text)]">
                  {t('notifications.push.enabled')}
                </p>
              </div>
              <button
                onClick={handleDisablePush}
                disabled={pushLoading}
                className="text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
              >
                {t('notifications.push.disable')}
              </button>
            </div>
          )}
        </section>

        {/* ─── Category Preferences ─── */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-[var(--green)]" />
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              {t('notifications.categoryPrefs')}
            </h3>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[1fr_60px_60px_60px] gap-2 px-3 pb-2 border-b border-[var(--border)]">
            <div />
            <p className="text-[10px] text-[var(--text3)] text-center">{t('notifications.channel.inApp')}</p>
            <p className="text-[10px] text-[var(--text3)] text-center">{t('notifications.channel.email')}</p>
            <p className="text-[10px] text-[var(--text3)] text-center">{t('notifications.channel.push')}</p>
          </div>

          <div className="space-y-1 mt-1">
            {ALL_CATEGORIES.map((category) => (
              <div
                key={category}
                className="grid grid-cols-[1fr_60px_60px_60px] gap-2 items-center p-3 rounded-lg hover:bg-[var(--bg3)] transition-colors"
              >
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">
                    {t(CATEGORY_LABEL_KEYS[category])}
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">
                    {t(CATEGORY_DESC_KEYS[category])}
                  </p>
                </div>
                <div className="flex justify-center">
                  <Toggle
                    enabled={preferences.categories[category].in_app}
                    onChange={(val) => updateCategoryPref(category, 'in_app', val)}
                    label={`${t(CATEGORY_LABEL_KEYS[category])} in-app`}
                  />
                </div>
                <div className="flex justify-center">
                  <Toggle
                    enabled={preferences.categories[category].email}
                    onChange={(val) => updateCategoryPref(category, 'email', val)}
                    label={`${t(CATEGORY_LABEL_KEYS[category])} email`}
                  />
                </div>
                <div className="flex justify-center">
                  <Toggle
                    enabled={preferences.categories[category].push}
                    onChange={(val) => updateCategoryPref(category, 'push', val)}
                    label={`${t(CATEGORY_LABEL_KEYS[category])} push`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Email Frequency ─── */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mail size={14} className="text-[var(--green)]" />
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              {t('notifications.emailFrequency.title')}
            </h3>
          </div>

          <div className="space-y-1">
            {(['immediate', 'daily', 'weekly'] as EmailFrequency[]).map((freq) => (
              <button
                key={freq}
                onClick={() => updatePreferences({ email_frequency: freq })}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                  preferences.email_frequency === freq
                    ? 'bg-[var(--green)]/10 border border-[var(--green)]/30'
                    : 'hover:bg-[var(--bg3)]'
                }`}
              >
                <div className="text-left">
                  <p className="text-xs font-medium text-[var(--text)]">
                    {t(`notifications.emailFrequency.${freq}`)}
                  </p>
                  <p className="text-[10px] text-[var(--text3)]">
                    {t(`notifications.emailFrequency.${freq}Desc`)}
                  </p>
                </div>
                {preferences.email_frequency === freq && (
                  <Check size={14} className="text-[var(--green)] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Quiet Hours ─── */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Moon size={14} className="text-[var(--green)]" />
              <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
                {t('notifications.quietHours.title')}
              </h3>
            </div>
            <Toggle
              enabled={preferences.quiet_hours_enabled}
              onChange={(val) => updatePreferences({ quiet_hours_enabled: val })}
              label={t('notifications.quietHours.title')}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg3)]">
              <div className="flex-1">
                <label className="text-[10px] text-[var(--text3)] block mb-1">
                  {t('notifications.quietHours.from')}
                </label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start}
                  onChange={(e) =>
                    updatePreferences({ quiet_hours_start: e.target.value })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg1)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-[var(--text3)] block mb-1">
                  {t('notifications.quietHours.to')}
                </label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end}
                  onChange={(e) =>
                    updatePreferences({ quiet_hours_end: e.target.value })
                  }
                  className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg1)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                />
              </div>
            </div>
          )}

          <p className="text-[10px] text-[var(--text3)] mt-2 px-1">
            {t('notifications.quietHours.desc')}
          </p>
        </section>

        {/* ─── Test Notification ─── */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={14} className="text-[var(--green)]" />
              <div>
                <p className="text-xs font-medium text-[var(--text)]">
                  {t('notifications.test.title')}
                </p>
                <p className="text-[10px] text-[var(--text3)]">
                  {t('notifications.test.desc')}
                </p>
              </div>
            </div>
            <button
              onClick={handleTestNotification}
              disabled={testSent}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg3)] text-[var(--text)] hover:bg-[var(--bg3)]/80 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
            >
              {testSent ? (
                <>
                  <Check size={12} className="text-[var(--green)]" />
                  {t('notifications.test.sent')}
                </>
              ) : (
                t('notifications.test.sendBtn')
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
