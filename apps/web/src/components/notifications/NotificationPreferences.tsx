import { useEffect } from 'react';
import {
  useNotificationStore,
  type NotificationCategory,
  type EmailFrequency,
} from '@/stores/notificationStore';
import {
  Bell,
  Bug,
  Camera,
  FileCheck,
  Users,
  Sparkles,
  Mail,
  Smartphone,
  Clock,
  Settings,
} from 'lucide-react';

// ─── Constants ───

const CATEGORIES: {
  key: NotificationCategory;
  label: string;
  description: string;
  icon: typeof Bell;
  color: string;
}[] = [
  {
    key: 'alerts',
    label: 'Alerts',
    description: 'Bark beetle risk levels, forest health warnings',
    icon: Bug,
    color: '#ef4444',
  },
  {
    key: 'permits',
    label: 'Permits',
    description: 'Felling notifications, permit status updates',
    icon: FileCheck,
    color: '#a78bfa',
  },
  {
    key: 'surveys',
    label: 'Surveys',
    description: 'Drone survey status, analysis results',
    icon: Camera,
    color: '#4ade80',
  },
  {
    key: 'community',
    label: 'Community',
    description: 'Posts, observations from nearby forest owners',
    icon: Users,
    color: '#60a5fa',
  },
  {
    key: 'system',
    label: 'System',
    description: 'New features, maintenance, account updates',
    icon: Sparkles,
    color: '#f59e0b',
  },
];

const CHANNELS: { key: 'in_app' | 'email' | 'push'; label: string; icon: typeof Bell }[] = [
  { key: 'in_app', label: 'In-App', icon: Bell },
  { key: 'email', label: 'Email', icon: Mail },
  { key: 'push', label: 'Push', icon: Smartphone },
];

const EMAIL_FREQUENCIES: { key: EmailFrequency; label: string; description: string }[] = [
  { key: 'immediate', label: 'Immediate', description: 'Get emails as events happen' },
  { key: 'daily', label: 'Daily digest', description: 'One email per day at 08:00' },
  { key: 'weekly', label: 'Weekly digest', description: 'One email per week on Monday' },
];

// ─── Toggle Component ───

function Toggle({
  enabled,
  onChange,
  color = '#10b981',
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
      style={{ background: enabled ? color : 'rgba(16, 185, 129, 0.15)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform"
        style={{ left: enabled ? '18px' : '2px' }}
      />
    </button>
  );
}

// ─── NotificationPreferences ───

export default function NotificationPreferences() {
  const {
    preferences,
    preferencesLoading,
    pushPermission,
    loadPreferences,
    updatePreferences,
    updateCategoryPref,
    checkPushPermission,
  } = useNotificationStore();

  useEffect(() => {
    loadPreferences();
    checkPushPermission();
  }, [loadPreferences, checkPushPermission]);

  const requestPushPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    checkPushPermission();
    if (result === 'granted') {
      // Could register service worker / push subscription here
    }
  };

  if (preferencesLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-emerald-50 flex items-center gap-2">
          <Settings size={20} className="text-emerald-400" />
          Notification Preferences
        </h2>
        <p className="text-xs text-emerald-100/40 mt-1">
          Choose how and when you receive notifications
        </p>
      </div>

      {/* Category / Channel Matrix */}
      <div className="rounded-xl border border-emerald-800/30 overflow-hidden" style={{ background: '#071a0b' }}>
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_repeat(3,64px)] sm:grid-cols-[1fr_repeat(3,80px)] items-center px-4 py-3 border-b border-emerald-800/20">
          <span className="text-xs font-semibold text-emerald-100/50 uppercase tracking-wider">
            Category
          </span>
          {CHANNELS.map((ch) => (
            <div key={ch.key} className="flex flex-col items-center gap-1">
              <ch.icon size={14} className="text-emerald-100/40" />
              <span className="text-[10px] font-medium text-emerald-100/40">{ch.label}</span>
            </div>
          ))}
        </div>

        {/* Category rows */}
        {CATEGORIES.map((cat, i) => (
          <div
            key={cat.key}
            className={`grid grid-cols-[1fr_repeat(3,64px)] sm:grid-cols-[1fr_repeat(3,80px)] items-center px-4 py-3 ${
              i < CATEGORIES.length - 1 ? 'border-b border-emerald-800/10' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${cat.color}15` }}
              >
                <cat.icon size={14} style={{ color: cat.color }} />
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-50">{cat.label}</p>
                <p className="text-[10px] text-emerald-100/30 hidden sm:block">{cat.description}</p>
              </div>
            </div>
            {CHANNELS.map((ch) => (
              <div key={ch.key} className="flex justify-center">
                <Toggle
                  enabled={preferences.categories[cat.key][ch.key]}
                  onChange={(v) => updateCategoryPref(cat.key, ch.key, v)}
                  color={cat.color}
                />
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Email Frequency */}
      <div className="rounded-xl border border-emerald-800/30 p-5" style={{ background: '#071a0b' }}>
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-emerald-50">Email Frequency</h3>
        </div>

        <div className="space-y-2">
          {EMAIL_FREQUENCIES.map((freq) => (
            <label
              key={freq.key}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                preferences.email_frequency === freq.key
                  ? 'bg-emerald-500/10 border border-emerald-500/30'
                  : 'border border-transparent hover:bg-emerald-900/20'
              }`}
            >
              <input
                type="radio"
                name="emailFrequency"
                checked={preferences.email_frequency === freq.key}
                onChange={() => updatePreferences({ email_frequency: freq.key })}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  preferences.email_frequency === freq.key
                    ? 'border-emerald-400'
                    : 'border-emerald-100/20'
                }`}
              >
                {preferences.email_frequency === freq.key && (
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-emerald-50">{freq.label}</p>
                <p className="text-[10px] text-emerald-100/30">{freq.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="rounded-xl border border-emerald-800/30 p-5" style={{ background: '#071a0b' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-50">Quiet Hours</h3>
          </div>
          <Toggle
            enabled={preferences.quiet_hours_enabled}
            onChange={(v) => updatePreferences({ quiet_hours_enabled: v })}
          />
        </div>

        <p className="text-xs text-emerald-100/30 mb-4">
          Mute push notifications during specified hours. Critical alerts are never silenced.
        </p>

        {preferences.quiet_hours_enabled && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[10px] font-medium text-emerald-100/40 uppercase tracking-wider block mb-1">
                Start
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_start}
                onChange={(e) =>
                  updatePreferences({ quiet_hours_start: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#030d05] border border-emerald-800/30 text-sm text-emerald-50 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <span className="text-emerald-100/30 text-sm mt-5">to</span>
            <div className="flex-1">
              <label className="text-[10px] font-medium text-emerald-100/40 uppercase tracking-wider block mb-1">
                End
              </label>
              <input
                type="time"
                value={preferences.quiet_hours_end}
                onChange={(e) =>
                  updatePreferences({ quiet_hours_end: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-[#030d05] border border-emerald-800/30 text-sm text-emerald-50 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Push Notification Permission */}
      <div className="rounded-xl border border-emerald-800/30 p-5" style={{ background: '#071a0b' }}>
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-emerald-50">Push Notifications</h3>
        </div>

        {pushPermission === 'granted' ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Push notifications are enabled
          </div>
        ) : pushPermission === 'denied' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-red-400">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              Push notifications are blocked
            </div>
            <p className="text-[10px] text-emerald-100/30">
              Please enable notifications in your browser settings to receive push alerts.
            </p>
          </div>
        ) : pushPermission === 'unsupported' ? (
          <p className="text-xs text-emerald-100/30">
            Push notifications are not supported in this browser.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-emerald-100/30">
              Enable push notifications to get real-time alerts about bark beetle risks and survey results.
            </p>
            <button
              onClick={requestPushPermission}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
            >
              <Bell size={14} />
              Enable Push Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
