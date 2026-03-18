/**
 * Privacy-friendly analytics for BeetleSense.ai
 *
 * No third-party tracking. Events are stored in localStorage and can be
 * batch-sent to a Supabase `analytics_events` table when online.
 * Respects the DNT (Do Not Track) header.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

/* ─── Types ─── */

export interface AnalyticsEvent {
  type: 'page_view' | 'event' | 'timing';
  sessionId: string;
  timestamp: number;
  path?: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  variable?: string;
  time?: number;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  pageViewCounts: Record<string, number>;
  totalEvents: number;
  popularFeatures: { category: string; action: string; count: number }[];
  sessionCount: number;
}

/* ─── Constants ─── */

const STORAGE_KEY = 'beetlesense-analytics';
const SESSION_KEY = 'beetlesense-session-id';
const MAX_STORED_EVENTS = 500;

/* ─── Helpers ─── */

function isDNTEnabled(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.doNotTrack === '1' || (navigator as any).globalPrivacyControl === true;
}

function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return 'unknown';

  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function readEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AnalyticsEvent[]): void {
  try {
    // Keep only the most recent entries
    const trimmed = events.slice(-MAX_STORED_EVENTS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage full or unavailable — silently discard
  }
}

function pushEvent(event: AnalyticsEvent): void {
  if (isDNTEnabled()) return;

  const events = readEvents();
  events.push(event);
  writeEvents(events);
}

/* ─── Public API ─── */

/**
 * Track a page view.
 */
export function trackPageView(path: string): void {
  pushEvent({
    type: 'page_view',
    sessionId: getSessionId(),
    timestamp: Date.now(),
    path,
  });

  if (import.meta.env.DEV) {
    console.debug('[Analytics] Page view:', path);
  }
}

/**
 * Track a custom event.
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number,
): void {
  pushEvent({
    type: 'event',
    sessionId: getSessionId(),
    timestamp: Date.now(),
    category,
    action,
    ...(label !== undefined ? { label } : {}),
    ...(value !== undefined ? { value } : {}),
  });

  if (import.meta.env.DEV) {
    console.debug('[Analytics] Event:', category, action, label ?? '', value ?? '');
  }
}

/**
 * Track a performance timing measurement.
 */
export function trackTiming(category: string, variable: string, time: number): void {
  pushEvent({
    type: 'timing',
    sessionId: getSessionId(),
    timestamp: Date.now(),
    category,
    variable,
    time,
  });

  if (import.meta.env.DEV) {
    console.debug('[Analytics] Timing:', category, variable, `${time}ms`);
  }
}

/**
 * Batch-send stored events to Supabase `analytics_events` table.
 * Falls back to console logging when Supabase is not configured or offline.
 * Returns the number of events sent.
 */
export async function flushAnalytics(): Promise<number> {
  const events = readEvents();
  if (events.length === 0) return 0;

  if (!isSupabaseConfigured || !navigator.onLine) {
    if (import.meta.env.DEV) {
      console.info('[Analytics] Flush (offline/no backend):', events.length, 'events');
    }
    return 0;
  }

  try {
    const { error } = await supabase.from('analytics_events').insert(
      events.map((e) => ({
        type: e.type,
        session_id: e.sessionId,
        occurred_at: new Date(e.timestamp).toISOString(),
        path: e.path ?? null,
        category: e.category ?? null,
        action: e.action ?? null,
        label: e.label ?? null,
        value: e.value ?? null,
        variable: e.variable ?? null,
        time_ms: e.time ?? null,
      })),
    );

    if (error) {
      console.warn('[Analytics] Flush failed:', error.message);
      return 0;
    }

    // Clear stored events on success
    localStorage.removeItem(STORAGE_KEY);
    return events.length;
  } catch (err) {
    console.warn('[Analytics] Flush error:', err);
    return 0;
  }
}

/**
 * Compute a summary of stored analytics data.
 */
export function getAnalyticsSummary(): AnalyticsSummary {
  const events = readEvents();

  const pageViews = events.filter((e) => e.type === 'page_view');
  const customEvents = events.filter((e) => e.type === 'event');

  // Page view counts by path
  const pageViewCounts: Record<string, number> = {};
  for (const pv of pageViews) {
    const key = pv.path ?? 'unknown';
    pageViewCounts[key] = (pageViewCounts[key] ?? 0) + 1;
  }

  // Popular features (category + action combos)
  const featureMap = new Map<string, { category: string; action: string; count: number }>();
  for (const ev of customEvents) {
    const key = `${ev.category}::${ev.action}`;
    const existing = featureMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      featureMap.set(key, {
        category: ev.category!,
        action: ev.action!,
        count: 1,
      });
    }
  }

  const popularFeatures = [...featureMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Unique sessions
  const sessionIds = new Set(events.map((e) => e.sessionId));

  return {
    totalPageViews: pageViews.length,
    pageViewCounts,
    totalEvents: customEvents.length,
    popularFeatures,
    sessionCount: sessionIds.size,
  };
}
