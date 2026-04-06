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
  Bug,
  Flame,
  CloudLightning,
  TrendingUp,
  Shield,
  BookOpen,
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
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo } from '@/lib/demoData';

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

// ─── Alert Type Config ───

interface AlertTypeConfig {
  key: string;
  label: string;
  description: string;
  icon: typeof Bug;
  color: string;
}

const ALERT_TYPES: AlertTypeConfig[] = [
  { key: 'beetle', label: 'Bark Beetle', description: 'Swarming forecasts, infestation risk, and detection alerts', icon: Bug, color: '#ef4444' },
  { key: 'fire', label: 'Fire Risk', description: 'Wildfire risk assessments and fire weather warnings', icon: Flame, color: '#f97316' },
  { key: 'storm', label: 'Storm & Wind', description: 'Storm warnings, windthrow risk, and damage assessment', icon: CloudLightning, color: '#8b5cf6' },
  { key: 'market', label: 'Timber Market', description: 'Price changes, demand shifts, and market opportunities', icon: TrendingUp, color: '#06b6d4' },
  { key: 'compliance', label: 'Compliance', description: 'Regulatory deadlines, permit status, and certification alerts', icon: Shield, color: '#3b82f6' },
];

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

  // Digest-specific state
  const [digestEnabled, setDigestEnabled] = useState(false);
  const [digestEmail, setDigestEmail] = useState('');
  const [digestFrequency, setDigestFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [alertToggles, setAlertToggles] = useState<Record<string, boolean>>({
    beetle: true,
    fire: true,
    storm: true,
    market: false,
    compliance: true,
  });
  const [digestSaving, setDigestSaving] = useState(false);
  const [digestSaved, setDigestSaved] = useState(false);
  const [digestLoading, setDigestLoading] = useState(true);

  useEffect(() => {
    checkPushPermission();
    loadPreferences();
    loadDigestPreferences();
  }, [checkPushPermission, loadPreferences]);

  // Load digest-specific preferences from user_preferences table
  const loadDigestPreferences = useCallback(async () => {
    if (!profile) return;

    if (isDemo() || !isSupabaseConfigured) {
      setDigestEnabled(true);
      setDigestEmail(profile.email ?? 'demo@example.com');
      setDigestFrequency('weekly');
      setDigestLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('digest_enabled, digest_email, digest_frequency, alert_beetle, alert_fire, alert_storm, alert_market, alert_compliance')
        .eq('user_id', profile.id)
        .single();

      if (data) {
        setDigestEnabled(data.digest_enabled ?? false);
        setDigestEmail(data.digest_email ?? profile.email ?? '');
        setDigestFrequency(data.digest_frequency ?? 'weekly');
        setAlertToggles({
          beetle: data.alert_beetle ?? true,
          fire: data.alert_fire ?? true,
          storm: data.alert_storm ?? true,
          market: data.alert_market ?? false,
          compliance: data.alert_compliance ?? true,
        });
      } else {
        setDigestEmail(profile.email ?? '');
      }
    } catch {
      setDigestEmail(profile.email ?? '');
    } finally {
      setDigestLoading(false);
    }
  }, [profile]);

  // Save digest preferences
  const saveDigestPreferences = useCallback(async () => {
    if (!profile) return;
    if (isDemo() || !isSupabaseConfigured) {
      setDigestSaved(true);
      setTimeout(() => setDigestSaved(false), 2000);
      return;
    }

    setDigestSaving(true);
    try {
      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: profile.id,
            digest_enabled: digestEnabled,
            digest_email: digestEmail,
            digest_frequency: digestFrequency,
            alert_beetle: alertToggles.beetle,
            alert_fire: alertToggles.fire,
            alert_storm: alertToggles.storm,
            alert_market: alertToggles.market,
            alert_compliance: alertToggles.compliance,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

      setDigestSaved(true);
      setTimeout(() => setDigestSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save digest preferences:', err);
    } finally {
      setDigestSaving(false);
    }
  }, [profile, digestEnabled, digestEmail, digestFrequency, alertToggles]);

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

        {/* ─── Alert Type Preferences ─── */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-[var(--green)]" />
            <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
              Alert Types
            </h3>
          </div>

          <p className="text-[10px] text-[var(--text3)] mb-3 px-1">
            Choose which alert types you want to receive. This applies to all channels (push, email, digest).
          </p>

          <div className="space-y-1">
            {ALERT_TYPES.map((alertType) => {
              const Icon = alertType.icon;
              return (
                <div
                  key={alertType.key}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg3)] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${alertType.color}15` }}
                    >
                      <Icon size={16} style={{ color: alertType.color }} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">
                        {alertType.label}
                      </p>
                      <p className="text-[10px] text-[var(--text3)]">
                        {alertType.description}
                      </p>
                    </div>
                  </div>
                  <Toggle
                    enabled={alertToggles[alertType.key] ?? true}
                    onChange={(val) =>
                      setAlertToggles((prev) => ({ ...prev, [alertType.key]: val }))
                    }
                    label={`${alertType.label} alerts`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── Email Digest ─── */}
        <section className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-[var(--green)]" />
              <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
                Email Digest
              </h3>
            </div>
            <Toggle
              enabled={digestEnabled}
              onChange={setDigestEnabled}
              label="Email digest"
            />
          </div>

          <p className="text-[10px] text-[var(--text3)] mb-3 px-1">
            Receive a summary of your forest health and alerts by email.
          </p>

          {digestEnabled && (
            <div className="space-y-3">
              {/* Email address */}
              <div className="p-3 rounded-lg bg-[var(--bg3)]">
                <label className="text-[10px] text-[var(--text3)] block mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  value={digestEmail}
                  onChange={(e) => setDigestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg1)] border border-[var(--border)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
                />
              </div>

              {/* Frequency selector */}
              <div className="p-3 rounded-lg bg-[var(--bg3)]">
                <label className="text-[10px] text-[var(--text3)] block mb-2">
                  Delivery frequency
                </label>
                <div className="flex gap-2">
                  {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setDigestFrequency(freq)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        digestFrequency === freq
                          ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                          : 'border border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                      }`}
                    >
                      {freq === 'daily' ? 'Daily' : freq === 'weekly' ? 'Weekly' : 'Monthly'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end mt-3">
            <button
              onClick={saveDigestPreferences}
              disabled={digestSaving || digestSaved}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition disabled:opacity-60 flex items-center gap-1.5"
            >
              {digestSaving && <Loader2 size={12} className="animate-spin" />}
              {digestSaved ? (
                <>
                  <Check size={12} />
                  Saved
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
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
