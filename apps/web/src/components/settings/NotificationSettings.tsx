import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { Bell, AlertTriangle, Check, Loader2 } from 'lucide-react';

// ─── Types ───

interface NotificationPrefs {
  survey_complete: boolean;
  new_job_available: boolean;
  report_shared: boolean;
  marketing_updates: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  survey_complete: true,
  new_job_available: true,
  report_shared: true,
  marketing_updates: false,
};

// ─── Component ───

export function NotificationSettings() {
  const { profile } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushDenied, setPushDenied] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check push notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'denied') {
      setPushDenied(true);
    }
  }, []);

  // Load preferences
  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { data } = await supabase
        .from('user_preferences')
        .select('notification_prefs')
        .eq('user_id', profile!.id)
        .single();

      if (data?.notification_prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...data.notification_prefs });
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  const savePrefs = useCallback(
    async (newPrefs: NotificationPrefs) => {
      if (!profile) return;
      setSaving(true);

      await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: profile.id,
            notification_prefs: newPrefs,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

      setSaving(false);
    },
    [profile],
  );

  const handleToggle = (key: keyof NotificationPrefs) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);

    // Debounced save (500ms)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => savePrefs(newPrefs), 500);
  };

  const isPilot = profile?.role === 'pilot';

  const toggleItems: {
    key: keyof NotificationPrefs;
    label: string;
    desc: string;
    show: boolean;
  }[] = [
    {
      key: 'survey_complete',
      label: 'Survey Complete',
      desc: 'Get notified when a survey analysis is finished',
      show: true,
    },
    {
      key: 'new_job_available',
      label: 'New Job Available',
      desc: 'Receive alerts for new survey missions nearby',
      show: isPilot,
    },
    {
      key: 'report_shared',
      label: 'Report Shared',
      desc: 'Notification when someone shares a report with you',
      show: true,
    },
    {
      key: 'marketing_updates',
      label: 'Marketing Updates',
      desc: 'Product news, tips, and feature announcements',
      show: true,
    },
  ];

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
          Notifications
        </h3>
        {saving && (
          <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
            <Loader2 size={10} className="animate-spin" />
            Saving...
          </span>
        )}
      </div>

      {/* Push denied banner */}
      {pushDenied && (
        <div className="mb-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/30 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-amber-300 font-medium">Push notifications blocked</p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              To receive push notifications, enable them in your browser settings for this site.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {toggleItems
          .filter((item) => item.show)
          .map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            >
              <div>
                <p className="text-xs font-medium text-[var(--text)]">{item.label}</p>
                <p className="text-[10px] text-[var(--text3)]">{item.desc}</p>
              </div>
              <button
                onClick={() => handleToggle(item.key)}
                className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${
                  prefs[item.key] ? 'bg-[var(--green)]' : 'bg-[var(--text3)]/30'
                }`}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: prefs[item.key] ? '22px' : '2px' }}
                />
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
