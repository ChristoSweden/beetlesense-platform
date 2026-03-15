const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

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

export async function requestPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (!('Notification' in window)) {
    console.warn('Push notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) {
    console.warn('Service worker or VAPID key not available');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }

    // Send subscription to backend
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

    const response = await fetch(`${supabaseUrl}/functions/v1/alerts-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      console.error('Failed to register push subscription:', response.status);
    }

    return subscription;
  } catch (err) {
    console.error('Push subscription failed:', err);
    return null;
  }
}

export async function unsubscribe(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }

    return false;
  } catch (err) {
    console.error('Push unsubscribe failed:', err);
    return false;
  }
}
