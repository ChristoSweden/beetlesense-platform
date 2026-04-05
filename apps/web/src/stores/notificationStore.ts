import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isDemo } from '@/lib/demoData';

// ─── Types ───

export type NotificationCategory = 'alerts' | 'permits' | 'surveys' | 'community' | 'system';

export type NotificationSubtype = 'sensor_complete';

export type EmailFrequency = 'immediate' | 'daily' | 'weekly';

export interface NotificationMetadata {
  subtype?: NotificationSubtype;
  surveyId?: string;
  sensorType?: string;
  productCount?: number;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  action_url: string | null;
  icon: string | null;
  metadata?: NotificationMetadata;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at: string | null;
}

/** Subtype-specific display overrides (icon name and color). */
export const SUBTYPE_DISPLAY: Record<NotificationSubtype, { icon: string; color: string }> = {
  sensor_complete: { icon: 'Cpu', color: '#22d3ee' }, // cyan accent
};

export interface NotificationPreferences {
  categories: Record<NotificationCategory, {
    in_app: boolean;
    email: boolean;
    push: boolean;
  }>;
  email_frequency: EmailFrequency;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "22:00"
  quiet_hours_end: string;   // "07:00"
}

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

const ALL_CATEGORIES: NotificationCategory[] = ['alerts', 'permits', 'surveys', 'community', 'system'];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  categories: {
    alerts: { in_app: true, email: true, push: true },
    permits: { in_app: true, email: true, push: false },
    surveys: { in_app: true, email: true, push: true },
    community: { in_app: true, email: false, push: false },
    system: { in_app: true, email: true, push: false },
  },
  email_frequency: 'immediate',
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '07:00',
};

// ─── Demo Notifications ───

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    user_id: 'demo-user',
    category: 'alerts',
    title: 'Bark beetle risk level elevated',
    message: 'Risk level in Värnamo region has increased to high. Check your spruce parcels.',
    action_url: '/owner/alerts',
    icon: 'Bug',
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 1 * 3600_000).toISOString(),
    read_at: null,
  },
  {
    id: 'notif-2',
    user_id: 'demo-user',
    category: 'surveys',
    title: 'Survey analysis complete',
    message: 'Drone survey for parcel Granudden has been processed. View the results.',
    action_url: '/owner/surveys',
    icon: 'Camera',
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
    read_at: null,
  },
  {
    id: 'notif-3',
    user_id: 'demo-user',
    category: 'permits',
    title: 'Permit application approved',
    message: 'Your felling notification for Tallbacken has been approved by Skogsstyrelsen.',
    action_url: '/owner/compliance',
    icon: 'FileCheck',
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
    read_at: null,
  },
  {
    id: 'notif-4',
    user_id: 'demo-user',
    category: 'community',
    title: 'New post in your area',
    message: 'A forest owner near you shared observations about bark beetle activity.',
    action_url: '/owner/community',
    icon: 'Users',
    is_read: true,
    is_dismissed: false,
    created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),
    read_at: new Date(Date.now() - 20 * 3600_000).toISOString(),
  },
  {
    id: 'notif-5',
    user_id: 'demo-user',
    category: 'system',
    title: 'New feature: Storm Risk Map',
    message: 'BeetleSense now includes a storm risk assessment tool. Check it out!',
    action_url: '/owner/storm-risk',
    icon: 'Sparkles',
    is_read: true,
    is_dismissed: false,
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
    read_at: new Date(Date.now() - 40 * 3600_000).toISOString(),
  },
];

// ─── Store ───

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;

  pushPermission: PushPermissionState;
  preferences: NotificationPreferences;
  preferencesLoading: boolean;

  // Actions
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  subscribe: () => () => void;
  checkPushPermission: () => void;
  loadPreferences: () => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  updateCategoryPref: (
    category: NotificationCategory,
    channel: 'in_app' | 'email' | 'push',
    enabled: boolean,
  ) => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: true,
  error: null,

  pushPermission: 'default',
  preferences: DEFAULT_PREFERENCES,
  preferencesLoading: true,

  fetchNotifications: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return;

    if (isDemo() || !isSupabaseConfigured) {
      const items = DEMO_NOTIFICATIONS.filter((n) => !n.is_dismissed);
      set({
        notifications: items,
        unreadCount: items.filter((n) => !n.is_read).length,
        loading: false,
      });
      return;
    }

    try {
      set({ error: null });
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const items = (data as Notification[]) ?? [];
      set({
        notifications: items,
        unreadCount: items.filter((n) => !n.is_read).length,
        loading: false,
      });
    } catch (err: unknown) {
      console.error('Failed to fetch notifications:', err);
      const items = DEMO_NOTIFICATIONS.filter((n) => !n.is_dismissed);
      set({
        notifications: items,
        unreadCount: items.filter((n) => !n.is_read).length,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load notifications',
      });
    }
  },

  markAsRead: async (id: string) => {
    const now = new Date().toISOString();
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true, read_at: now } : n,
      );
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.is_read).length,
      };
    });

    if (isDemo() || !isSupabaseConfigured) return;

    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('id', id);
  },

  markAllAsRead: async () => {
    const profile = useAuthStore.getState().profile;
    const now = new Date().toISOString();

    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true, read_at: now })),
      unreadCount: 0,
    }));

    if (isDemo() || !isSupabaseConfigured || !profile) return;

    await supabase
      .from('notifications')
      .update({ is_read: true, read_at: now })
      .eq('user_id', profile.id)
      .eq('is_read', false);
  },

  dismiss: async (id: string) => {
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.is_read).length,
      };
    });

    if (isDemo() || !isSupabaseConfigured) return;

    await supabase
      .from('notifications')
      .update({ is_dismissed: true })
      .eq('id', id);
  },

  subscribe: () => {
    const profile = useAuthStore.getState().profile;
    if (!profile || isDemo() || !isSupabaseConfigured) {
      return () => {};
    }

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          set((state) => ({
            notifications: [newNotif, ...state.notifications],
            unreadCount: state.unreadCount + (newNotif.is_read ? 0 : 1),
          }));
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          set((state) => {
            const items = state.notifications
              .map((n) => (n.id === updated.id ? updated : n))
              .filter((n) => !n.is_dismissed);
            return {
              notifications: items,
              unreadCount: items.filter((n) => !n.is_read).length,
            };
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  checkPushPermission: () => {
    if (!('Notification' in window)) {
      set({ pushPermission: 'unsupported' });
      return;
    }
    set({ pushPermission: Notification.permission as PushPermissionState });
  },

  loadPreferences: async () => {
    const profile = useAuthStore.getState().profile;
    if (!profile) return;

    if (isDemo() || !isSupabaseConfigured) {
      set({ preferences: DEFAULT_PREFERENCES, preferencesLoading: false });
      return;
    }

    try {
      const { data } = await supabase
        .from('user_preferences')
        .select('notification_preferences')
        .eq('user_id', profile.id)
        .single();

      if (data?.notification_preferences) {
        set({
          preferences: { ...DEFAULT_PREFERENCES, ...data.notification_preferences },
          preferencesLoading: false,
        });
      } else {
        set({ preferencesLoading: false });
      }
    } catch {
      set({ preferencesLoading: false });
    }
  },

  updatePreferences: async (partial: Partial<NotificationPreferences>) => {
    const profile = useAuthStore.getState().profile;
    const current = get().preferences;
    const merged = { ...current, ...partial };

    set({ preferences: merged });

    if (isDemo() || !isSupabaseConfigured || !profile) return;

    await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: profile.id,
          notification_preferences: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
  },

  updateCategoryPref: async (
    category: NotificationCategory,
    channel: 'in_app' | 'email' | 'push',
    enabled: boolean,
  ) => {
    const current = get().preferences;
    const updated: NotificationPreferences = {
      ...current,
      categories: {
        ...current.categories,
        [category]: {
          ...current.categories[category],
          [channel]: enabled,
        },
      },
    };

    await get().updatePreferences(updated);
  },
}));

export { ALL_CATEGORIES };
