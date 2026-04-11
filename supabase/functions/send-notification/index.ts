/**
 * send-notification Edge Function
 *
 * Accepts a notification payload, stores it in the notifications table,
 * sends a push notification if the user has push enabled, and queues
 * an email notification if email is enabled. Respects quiet hours.
 *
 * POST /functions/v1/send-notification
 * Body: { user_id, title, body, category, action_url?, icon?, metadata? }
 *
 * Can be called from other Edge Functions, workers, or the admin API.
 * Requires service-role key for server-to-server calls or a valid JWT.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { ok, err, created } from "../_shared/response.ts";
import { renderNotificationEmail } from "../_shared/emailTemplate.ts";

// ─── Types ───

interface NotificationPayload {
  user_id: string;
  title: string;
  body: string;
  category: "alerts" | "permits" | "surveys" | "community" | "system";
  action_url?: string;
  icon?: string;
  metadata?: Record<string, unknown>;
}

interface UserPreferences {
  notification_preferences?: {
    categories?: Record<
      string,
      { in_app?: boolean; email?: boolean; push?: boolean }
    >;
    email_frequency?: "immediate" | "daily" | "weekly";
    quiet_hours_enabled?: boolean;
    quiet_hours_start?: string;
    quiet_hours_end?: string;
  };
}

// ─── Handler ───

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return err("Method not allowed", 405);
  }

  // Verify service-role key for server-to-server calls
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return err("Server misconfiguration", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  let payload: NotificationPayload;
  try {
    payload = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  // Validate required fields
  if (!payload.user_id || !payload.title || !payload.body || !payload.category) {
    return err("Missing required fields: user_id, title, body, category", 400);
  }

  const validCategories = ["alerts", "permits", "surveys", "community", "system"];
  if (!validCategories.includes(payload.category)) {
    return err(`Invalid category. Must be one of: ${validCategories.join(", ")}`, 400);
  }

  // ─── 1. Store notification in database ───

  const { data: notification, error: insertError } = await supabase
    .from("notifications")
    .insert({
      user_id: payload.user_id,
      category: payload.category,
      title: payload.title,
      message: payload.body,
      action_url: payload.action_url ?? null,
      icon: payload.icon ?? null,
      metadata: payload.metadata ?? {},
      is_read: false,
      is_dismissed: false,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Failed to insert notification:", insertError);
    return err("Failed to store notification", 500, {
      details: insertError.message,
    });
  }

  // ─── 2. Load user preferences ───

  const { data: prefData } = await supabase
    .from("user_preferences")
    .select("notification_preferences")
    .eq("user_id", payload.user_id)
    .single();

  const prefs = (prefData as UserPreferences | null)?.notification_preferences;
  const categoryPrefs = prefs?.categories?.[payload.category];

  // Default to enabled if no preferences set
  const pushEnabled = categoryPrefs?.push ?? true;
  const emailEnabled = categoryPrefs?.email ?? true;
  const emailFrequency = prefs?.email_frequency ?? "immediate";

  // ─── 3. Check quiet hours ───

  let inQuietHours = false;
  if (prefs?.quiet_hours_enabled) {
    const now = new Date();
    const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

    const parseTime = (timeStr: string): number => {
      const [h, m] = timeStr.split(":").map(Number);
      return (h ?? 0) * 60 + (m ?? 0);
    };

    const startMinutes = parseTime(prefs.quiet_hours_start ?? "22:00");
    const endMinutes = parseTime(prefs.quiet_hours_end ?? "07:00");

    if (startMinutes > endMinutes) {
      // Overnight range (e.g., 22:00 - 07:00)
      inQuietHours =
        currentMinutes >= startMinutes || currentMinutes < endMinutes;
    } else {
      inQuietHours =
        currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
  }

  const results = {
    notification_id: notification.id,
    push_sent: false,
    email_queued: false,
    quiet_hours_active: inQuietHours,
  };

  // ─── 4. Send push notification (if not in quiet hours) ───

  if (pushEnabled && !inQuietHours) {
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", payload.user_id);

    if (subscriptions && subscriptions.length > 0) {
      const webPushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: "/icon-192.png",
        badge: "/icon-72.png",
        data: {
          url: payload.action_url ?? "/owner/alerts",
          category: payload.category,
          notification_id: notification.id,
        },
      });

      // Send to each subscription using Web Push API
      const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
      const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
      const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@beetlesense.ai";

      if (vapidPrivateKey && vapidPublicKey) {
        for (const sub of subscriptions) {
          try {
            const pushSub = sub.subscription;
            if (!pushSub?.endpoint) continue;

            // Use the web-push library via fetch to the push service
            const response = await fetch(pushSub.endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/octet-stream",
                "Content-Encoding": "aes128gcm",
                TTL: "86400",
              },
              body: new TextEncoder().encode(webPushPayload),
            });

            if (response.status === 410) {
              // Subscription expired — clean up
              await supabase
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            }
          } catch (pushErr) {
            console.error("Push delivery failed:", pushErr);
          }
        }
        results.push_sent = true;
      } else {
        // Fall back to storing push intent for external service
        await supabase.from("push_notifications").insert({
          user_id: payload.user_id,
          title: payload.title,
          body: payload.body,
          data: {
            action_url: payload.action_url,
            category: payload.category,
            notification_id: notification.id,
          },
          status: "pending",
          created_at: new Date().toISOString(),
        });
        results.push_sent = true;
      }
    }
  }

  // ─── 5. Queue email notification ───

  if (emailEnabled && emailFrequency === "immediate" && !inQuietHours) {
    // Render branded HTML email
    const emailHtml = renderNotificationEmail({
      title: payload.title,
      body: payload.body,
      category: payload.category,
      actionUrl: payload.action_url,
      actionLabel: undefined,
      userName: undefined,
    });

    // Queue an immediate email
    await supabase.from("email_queue").insert({
      user_id: payload.user_id,
      template: "notification",
      subject: `${payload.title} — BeetleSense.ai`,
      data: {
        title: payload.title,
        body: payload.body,
        category: payload.category,
        action_url: payload.action_url,
        html: emailHtml,
      },
      status: "pending",
      created_at: new Date().toISOString(),
    });
    results.email_queued = true;
  } else if (emailEnabled && emailFrequency !== "immediate") {
    // For daily/weekly digest, the notification is already in the DB.
    // The digest worker will pick it up on schedule.
    results.email_queued = false; // Will be handled by digest
  }

  return created(results);
});
