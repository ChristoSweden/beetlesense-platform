/**
 * Push notification service for BeetleSense PWA.
 *
 * Handles browser permission requests, Web Push subscription management,
 * and syncing subscriptions to Supabase for server-side delivery.
 */

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// ─── Helpers ───

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─── Permission ───

/**
 * Request browser notification permission.
 * Returns the resulting permission state.
 */
export async function requestPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!('Notification' in window)) {
    console.warn('Push notifications not supported in this browser');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Check current permission state without prompting the user.
 */
export function getPermissionState(): 'granted' | 'denied' | 'default' | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as 'granted' | 'denied' | 'default';
}

// ─── Subscribe / Unsubscribe ───

/**
 * Subscribe the browser to push notifications.
 * Stores the subscription in Supabase via the alerts-subscribe edge function.
 */
export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) {
    console.warn('Service worker or VAPID key not available');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription first
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Persist subscription to Supabase
    await syncSubscription(userId, subscription);

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

/**
 * Unsubscribe from push notifications and remove from Supabase.
 */
export async function unsubscribe(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove from backend
      await removeSubscription(endpoint);
      return true;
    }

    return false;
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    return false;
  }
}

/**
 * Get the current push subscription (if any).
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

// ─── Backend Sync ───

async function syncSubscription(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  const response = await fetch(`${SUPABASE_URL}/functions/v1/alerts-subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_KEY}`,
      apikey: SUPABASE_KEY,
    },
    body: JSON.stringify({
      userId,
      subscription: subscription.toJSON(),
    }),
  });

  if (!response.ok) {
    console.error('Failed to register push subscription:', response.status);
  }
}

async function removeSubscription(endpoint: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;

  try {
    await fetch(`${SUPABASE_URL}/functions/v1/alerts-subscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_KEY}`,
        apikey: SUPABASE_KEY,
      },
      body: JSON.stringify({ endpoint }),
    });
  } catch (err) {
    console.error('Failed to remove push subscription:', err);
  }
}

// ─── Incoming Push Handler ───

/**
 * Register the service worker push event handler.
 * Call this once during app initialization.
 */
export function registerPushHandler(): void {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PUSH_NOTIFICATION_CLICK') {
      const url = event.data.url;
      if (url) {
        window.location.href = url;
      }
    }
  });
}

// ─── Init Helper ───

/**
 * One-shot push notification setup.
 * Registers the SW message handler, requests permission, and subscribes
 * the browser if not already subscribed.  Designed to be called once
 * per session after the user is authenticated.
 */
export async function initPushNotifications(userId: string): Promise<void> {
  registerPushHandler();

  const permission = await requestPermission();
  if (permission !== 'granted') return;

  const existing = await getCurrentSubscription();
  if (!existing) {
    await subscribeToPush(userId);
  }
}

/**
 * Show a native notification from the app (not from push).
 * Used for testing and local alert display.
 */
export function showLocalNotification(
  title: string,
  options?: NotificationOptions & { actionUrl?: string },
): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    ...options,
  });

  if (options?.actionUrl) {
    notification.onclick = () => {
      window.focus();
      window.location.href = options.actionUrl!;
      notification.close();
    };
  }
}
