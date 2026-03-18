import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { isDemo } from '@/lib/demoData';
import type { AlertCategory, AlertSeverity } from '@beetlesense/shared';

// ─── Types ───

export interface Alert {
  id: string;
  user_id: string;
  organization_id: string | null;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  parcel_id: string | null;
  parcel_name: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
}

export interface UseAlertsReturn {
  alerts: Alert[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (alertId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (alertId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

// ─── Demo Alerts ───

const DEMO_ALERTS: Alert[] = [
  {
    id: 'demo-alert-1',
    user_id: 'demo-user',
    organization_id: null,
    category: 'BEETLE_SEASON' as AlertCategory,
    severity: 'critical',
    title: 'Bark beetle swarming season approaching',
    message: 'Bark beetle swarming season begins in ~14 days for Värnamo. Your 3 spruce-heavy parcels are in the risk zone.',
    metadata: { daysUntilPeak: 14, region: 'Värnamo', parcelCount: 3 },
    parcel_id: null,
    parcel_name: null,
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
    read_at: null,
    dismissed_at: null,
  },
  {
    id: 'demo-alert-2',
    user_id: 'demo-user',
    organization_id: null,
    category: 'NDVI_DROP' as AlertCategory,
    severity: 'warning',
    title: 'NDVI drop detected on Granudden',
    message: 'NDVI dropped 18% on Granudden since last month — possible stress detected.',
    metadata: { dropPercent: 18, currentNdvi: 0.52, previousNdvi: 0.63 },
    parcel_id: 'p4',
    parcel_name: 'Granudden',
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 5 * 3600_000).toISOString(),
    read_at: null,
    dismissed_at: null,
  },
  {
    id: 'demo-alert-3',
    user_id: 'demo-user',
    organization_id: null,
    category: 'STORM_WARNING' as AlertCategory,
    severity: 'warning',
    title: 'Storm passed near your forest',
    message: 'Storm "Erik" passed 23km from your forest. Checking satellite data for damage.',
    metadata: { stormName: 'Erik', distance: 23 },
    parcel_id: null,
    parcel_name: null,
    is_read: true,
    is_dismissed: false,
    created_at: new Date(Date.now() - 24 * 3600_000).toISOString(),
    read_at: new Date(Date.now() - 20 * 3600_000).toISOString(),
    dismissed_at: null,
  },
  {
    id: 'demo-alert-4',
    user_id: 'demo-user',
    organization_id: null,
    category: 'HARVEST_WINDOW' as AlertCategory,
    severity: 'info',
    title: 'Optimal thinning window opens',
    message: 'Optimal thinning window opens in 3 weeks based on ground frost forecast. Plan your harvests.',
    metadata: { weeksUntilOpen: 3 },
    parcel_id: null,
    parcel_name: null,
    is_read: true,
    is_dismissed: false,
    created_at: new Date(Date.now() - 48 * 3600_000).toISOString(),
    read_at: new Date(Date.now() - 36 * 3600_000).toISOString(),
    dismissed_at: null,
  },
  {
    id: 'demo-alert-5',
    user_id: 'demo-user',
    organization_id: null,
    category: 'DROUGHT_STRESS' as AlertCategory,
    severity: 'warning',
    title: 'Drought stress warning',
    message: 'Below-average precipitation in the past 30 days for Värnamo. Conifers under drought stress are more susceptible to bark beetle attacks.',
    metadata: { region: 'Värnamo' },
    parcel_id: null,
    parcel_name: null,
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 8 * 3600_000).toISOString(),
    read_at: null,
    dismissed_at: null,
  },
  {
    id: 'demo-alert-6',
    user_id: 'demo-user',
    organization_id: null,
    category: 'REGULATORY_DEADLINE' as AlertCategory,
    severity: 'info',
    title: 'Skogsstyrelsen: Reporting deadline',
    message: 'Skogsstyrelsen deadline for harvesting notifications and environmental considerations is approaching. Verify all operations are reported.',
    metadata: { deadline: '2026-03-01', authority: 'Skogsstyrelsen' },
    parcel_id: null,
    parcel_name: null,
    is_read: true,
    is_dismissed: false,
    created_at: new Date(Date.now() - 72 * 3600_000).toISOString(),
    read_at: new Date(Date.now() - 60 * 3600_000).toISOString(),
    dismissed_at: null,
  },
  {
    id: 'demo-alert-7',
    user_id: 'demo-user',
    organization_id: null,
    category: 'FROST_RISK' as AlertCategory,
    severity: 'info',
    title: 'Frost risk increasing',
    message: 'SMHI forecast indicates ground frost risk in the coming days for Jönköping. Avoid planting new seedlings until frost risk has passed.',
    metadata: { region: 'Jönköping' },
    parcel_id: null,
    parcel_name: null,
    is_read: false,
    is_dismissed: false,
    created_at: new Date(Date.now() - 12 * 3600_000).toISOString(),
    read_at: null,
    dismissed_at: null,
  },
];

// ─── Hook ───

export function useAlerts(): UseAlertsReturn {
  const { profile } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!profile) return;

    // Demo mode
    if (isDemo()) {
      setAlerts(DEMO_ALERTS.filter((a) => !a.is_dismissed));
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setAlerts(DEMO_ALERTS.filter((a) => !a.is_dismissed));
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;
      setAlerts((data as Alert[]) ?? []);
    } catch (err: any) {
      console.error('Failed to fetch alerts:', err);
      setError(err.message ?? 'Failed to load alerts');
      // Fall back to demo alerts on error
      setAlerts(DEMO_ALERTS.filter((a) => !a.is_dismissed));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  // Initial fetch + real-time subscription
  useEffect(() => {
    fetchAlerts();

    // Set up real-time subscription
    if (profile && isSupabaseConfigured && !isDemo()) {
      const channel = supabase
        .channel('alerts-realtime')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'alerts',
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            const newAlert = payload.new as Alert;
            setAlerts((prev) => [newAlert, ...prev]);
          },
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'alerts',
            filter: `user_id=eq.${profile.id}`,
          },
          (payload) => {
            const updated = payload.new as Alert;
            setAlerts((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)).filter((a) => !a.is_dismissed),
            );
          },
        )
        .subscribe();

      subscriptionRef.current = channel;
    }

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [profile, fetchAlerts]);

  const markAsRead = useCallback(
    async (alertId: string) => {
      // Optimistic update
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, is_read: true, read_at: new Date().toISOString() } : a,
        ),
      );

      if (isDemo() || !isSupabaseConfigured) return;

      await supabase
        .from('alerts')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', alertId);
    },
    [],
  );

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setAlerts((prev) => prev.map((a) => ({ ...a, is_read: true, read_at: now })));

    if (isDemo() || !isSupabaseConfigured || !profile) return;

    await supabase
      .from('alerts')
      .update({ is_read: true, read_at: now })
      .eq('user_id', profile.id)
      .eq('is_read', false);
  }, [profile]);

  const dismiss = useCallback(
    async (alertId: string) => {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));

      if (isDemo() || !isSupabaseConfigured) return;

      await supabase
        .from('alerts')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', alertId);
    },
    [],
  );

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return {
    alerts,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    dismiss,
    refresh: fetchAlerts,
  };
}
