/**
 * send-alert — BeetleSense Real-Time Alert Delivery
 *
 * Accepts an alert payload, stores it in the alerts table, attempts push
 * notification delivery, falls back to email, and returns the channel used.
 *
 * POST /functions/v1/send-alert
 * Body: { userId, title, body, type, parcelId?, severity }
 *
 * Returns: { success: true, channel: 'push' | 'email' | 'both', alertId }
 *
 * Requires service-role key for server-to-server calls.
 */

import { handleCors } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err, created } from "../_shared/response.ts";
import { renderNotificationEmail } from "../_shared/emailTemplate.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface AlertPayload {
  userId: string;
  title: string;
  body: string;
  type: "beetle" | "fire" | "storm" | "market" | "compliance" | "system";
  severity: "info" | "warning" | "critical";
  parcelId?: string;
}

const VALID_TYPES = new Set(["beetle", "fire", "storm", "market", "compliance", "system"]);
const VALID_SEVERITIES = new Set(["info", "warning", "critical"]);

// Map alert types to notification categories for the email template
const TYPE_TO_CATEGORY: Record<string, string> = {
  beetle: "alerts",
  fire: "alerts",
  storm: "alerts",
  market: "system",
  compliance: "permits",
  system: "system",
};

const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "BeetleSense <alerts@beetlesense.ai>";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Check if current time is within the user's quiet hours.
 */
function isInQuietHours(start?: string | null, end?: string | null): boolean {
  if (!start || !end) return false;

  const now = new Date();
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  const parseTime = (timeStr: string): number => {
    const [h, m] = timeStr.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };

  const startMin = parseTime(start);
  const endMin = parseTime(end);

  if (startMin > endMin) {
    // Overnight range (e.g. 22:00–07:00)
    return currentMinutes >= startMin || currentMinutes < endMin;
  }
  return currentMinutes >= startMin && currentMinutes < endMin;
}

/**
 * Send push notification to all subscriptions for a user.
 * Returns true if at least one push was delivered.
 */
async function sendPush(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  payload: { title: string; body: string; type: string; alertId: string },
): Promise<boolean> {
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);

  if (!subscriptions || subscriptions.length === 0) {
    return false;
  }

  const webPushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-72.png",
    data: {
      url: "/owner/alerts",
      type: payload.type,
      alert_id: payload.alertId,
    },
  });

  let delivered = false;

  for (const sub of subscriptions) {
    try {
      const pushSub = sub.subscription;
      if (!pushSub?.endpoint) continue;

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
        continue;
      }

      if (response.ok || response.status === 201) {
        delivered = true;
      }
    } catch (pushErr) {
      console.error("Push delivery failed for subscription:", pushErr);
    }
  }

  return delivered;
}

/**
 * Send an email notification via Resend as fallback.
 */
async function sendEmailFallback(
  resendKey: string,
  email: string,
  userName: string | undefined,
  payload: AlertPayload,
): Promise<boolean> {
  const category = TYPE_TO_CATEGORY[payload.type] ?? "alerts";
  const html = renderNotificationEmail({
    title: payload.title,
    body: payload.body,
    category,
    actionUrl: "https://beetlesense.ai/owner/alerts",
    actionLabel: "View in BeetleSense",
    userName,
  });

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [email],
        subject: `${payload.severity === "critical" ? "[URGENT] " : ""}${payload.title} — BeetleSense.ai`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`Resend error (${res.status}):`, detail);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Email fallback failed:", e);
    return false;
  }
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);
  if (req.method !== "POST") return err("Method not allowed", 405);

  // Verify service-role key for server-to-server calls
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createServiceClient();

  // Parse and validate payload
  let payload: AlertPayload;
  try {
    payload = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  // Validation
  if (!payload.userId || !payload.title || !payload.body || !payload.type || !payload.severity) {
    return err(
      "Missing required fields: userId, title, body, type, severity",
      400,
    );
  }

  if (!VALID_TYPES.has(payload.type)) {
    return err(`Invalid type. Must be one of: ${[...VALID_TYPES].join(", ")}`, 400);
  }

  if (!VALID_SEVERITIES.has(payload.severity)) {
    return err(`Invalid severity. Must be one of: ${[...VALID_SEVERITIES].join(", ")}`, 400);
  }

  try {
    // ─── 1. Store alert in database ───────────────────────────────────

    // Resolve parcel name if parcelId is provided
    let parcelName: string | null = null;
    if (payload.parcelId) {
      const { data: parcel } = await supabase
        .from("parcels")
        .select("name")
        .eq("id", payload.parcelId)
        .single();
      parcelName = (parcel as { name?: string })?.name ?? null;
    }

    const { data: alert, error: insertError } = await supabase
      .from("alerts")
      .insert({
        user_id: payload.userId,
        title: payload.title,
        body: payload.body,
        message: payload.body, // duplicate for useAlerts hook compatibility
        type: payload.type,
        category: payload.type.toUpperCase(), // useAlerts expects uppercase categories
        severity: payload.severity,
        parcel_id: payload.parcelId ?? null,
        parcel_name: parcelName,
        channel: "in_app", // will be updated after delivery
        read: false,
        is_read: false,
        is_dismissed: false,
        metadata: {},
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError || !alert) {
      console.error("Failed to insert alert:", insertError);
      return err("Failed to store alert", 500);
    }

    const alertId = (alert as { id: string }).id;

    // ─── 2. Load user preferences ─────────────────────────────────────

    const { data: prefs } = await supabase
      .from("user_preferences")
      .select("push_enabled, quiet_hours_start, quiet_hours_end, digest_email")
      .eq("user_id", payload.userId)
      .single();

    const userPrefs = prefs as {
      push_enabled?: boolean;
      quiet_hours_start?: string;
      quiet_hours_end?: string;
      digest_email?: string;
    } | null;

    // Check quiet hours — critical alerts bypass quiet hours
    const quietHoursActive =
      payload.severity !== "critical" &&
      isInQuietHours(
        userPrefs?.quiet_hours_start,
        userPrefs?.quiet_hours_end,
      );

    if (quietHoursActive) {
      // Store alert but don't push/email — user will see it in-app
      return created({
        success: true,
        channel: "in_app" as const,
        alertId,
        quietHoursActive: true,
      });
    }

    // ─── 3. Attempt push notification ─────────────────────────────────

    let pushSent = false;
    const pushEnabled = userPrefs?.push_enabled !== false; // default true

    if (pushEnabled) {
      pushSent = await sendPush(supabase, payload.userId, {
        title: payload.title,
        body: payload.body,
        type: payload.type,
        alertId,
      });
    }

    // ─── 4. Fall back to email if push not delivered ──────────────────

    let emailSent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");

    if (!pushSent && resendKey) {
      // Get user email
      const email = userPrefs?.digest_email;

      if (!email) {
        // Try to get email from auth.users
        const { data: authUser } = await supabase.auth.admin.getUserById(
          payload.userId,
        );
        const userEmail = authUser?.user?.email;

        if (userEmail) {
          // Get user name for email personalization
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", payload.userId)
            .single();

          emailSent = await sendEmailFallback(
            resendKey,
            userEmail,
            (profile as { full_name?: string })?.full_name ?? undefined,
            payload,
          );
        }
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", payload.userId)
          .single();

        emailSent = await sendEmailFallback(
          resendKey,
          email,
          (profile as { full_name?: string })?.full_name ?? undefined,
          payload,
        );
      }
    }

    // ─── 5. Update alert with delivery channel ────────────────────────

    let channel: "push" | "email" | "both" | "in_app" = "in_app";
    if (pushSent && emailSent) channel = "both";
    else if (pushSent) channel = "push";
    else if (emailSent) channel = "email";

    await supabase
      .from("alerts")
      .update({ channel })
      .eq("id", alertId);

    return created({
      success: true,
      channel,
      alertId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("send-alert error:", e);
    return err(message, 500);
  }
});
