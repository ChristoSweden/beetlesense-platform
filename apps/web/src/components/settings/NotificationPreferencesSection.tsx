import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { isDemoMode } from '@/lib/dataMode';
import { Bell, Loader2, Check } from 'lucide-react';

// ─── Types ───

interface NotificationPreferences {
  beetle_risk_alerts: boolean;
  weekly_digest_email: boolean;
  satellite_data_updates: boolean;
  weather_warnings: boolean;
  carbon_credit_milestones: boolean;
  neighbour_comparison_reports: boolean;
  survey_reminders: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  beetle_risk_alerts: true,
  weekly_digest_email: true,
  satellite_data_updates: false,
  weather_warnings: true,
  carbon_credit_milestones: false,
  neighbour_comparison_reports: false,
  survey_reminders: true,
};

const PREF_ITEMS: {
  key: keyof NotificationPreferences;
  label: string;
  desc: string;
}[] = [
  {
    key: 'beetle_risk_alerts',
    label: 'Beetle risk alerts',
    desc: 'Notified when risk score changes significantly for your parcels',
  },
  {
    key: 'weekly_digest_email',
    label: 'Weekly digest email',
    desc: 'A summary of forest health, alerts, and market updates every week',
  },
  {
    key: 'satellite_data_updates',
    label: 'Satellite data updates',
    desc: 'Notified when new satellite imagery is processed for your parcels',
  },
  {
    key: 'weather_warnings',
    label: 'Weather warnings',
    desc: 'Storm, frost, and drought warnings relevant to your forest locations',
  },
  {
    key: 'carbon_credit_milestones',
    label: 'Carbon credit milestones',
    desc: 'Alerts when you reach carbon sequestration milestones or new credits are issued',
  },
  {
    key: 'neighbour_comparison_reports',
    label: 'Neighbour comparison reports',
    desc: 'Monthly benchmarks comparing your forest health to similar parcels',
  },
  {
    key: 'survey_reminders',
    label: 'Survey reminders',
    desc: 'Reminders to complete scheduled forest health surveys',
  },
];

// ─── Toggle ───

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
      type="button"
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

// ─── Component ───

export function NotificationPreferencesSection() {
  const { profile } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load preferences on mount
  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }

    if (isDemoMode() || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('notification_preferences')
        .eq('id', profile!.id)
        .single();

      if (data?.notification_preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.notification_preferences as Partial<NotificationPreferences>) });
      }
      setLoading(false);
    }

    load();
  }, [profile]);

  const savePrefs = useCallback(
    async (newPrefs: NotificationPreferences) => {
      if (!profile || isDemoMode() || !isSupabaseConfigured) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        return;
      }

      setSaving(true);

      await supabase
        .from('profiles')
        .update({
          notification_preferences: newPrefs,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [profile],
  );

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);

    // Debounced save (600ms)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => savePrefs(newPrefs), 600);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={16} className="animate-spin text-[var(--green)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider flex items-center gap-2">
          <Bell size={12} className="text-[var(--green)]" />
          Notification Preferences
        </h3>
        {saving && (
          <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            Saving...
          </span>
        )}
        {saved && !saving && (
          <span className="text-[10px] text-[var(--green)] flex items-center gap-1">
            <Check size={10} />
            Saved
          </span>
        )}
      </div>

      <p className="text-[10px] text-[var(--text3)] mb-3 px-1">
        Choose which types of notifications you want to receive.
      </p>

      <div className="space-y-1">
        {PREF_ITEMS.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg3)] transition-colors"
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-xs font-medium text-[var(--text)]">{item.label}</p>
              <p className="text-[10px] text-[var(--text3)]">{item.desc}</p>
            </div>
            <Toggle
              enabled={prefs[item.key]}
              onChange={() => handleToggle(item.key)}
              label={item.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
