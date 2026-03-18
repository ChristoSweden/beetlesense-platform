/**
 * alerts-subscribe  —  Store push subscription & notification preferences.
 *
 * POST  /alerts-subscribe
 * Body: {
 *   subscription: PushSubscription,
 *   preferences: {
 *     survey_complete: boolean,
 *     new_job: boolean,
 *     report_shared: boolean,
 *     email_enabled?: boolean,
 *     push_enabled?: boolean,
 *     email_frequency?: "immediate" | "daily" | "weekly",
 *   }
 * }
 *
 * Stores / updates the push subscription in `push_subscriptions` and
 * syncs the user's notification preferences into `user_preferences` so
 * the send-notification function and digest worker respect them.
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface AlertPreferences {
  // Per-topic toggles
  survey_complete: boolean;
  new_job: boolean;
  report_shared: boolean;
  // Channel-level controls (optional — default to true / "immediate")
  email_enabled?: boolean;
  push_enabled?: boolean;
  email_frequency?: "immediate" | "daily" | "weekly";
}

// ─── Validation helpers ──────────────────────────────────────────────────────

function isValidSubscription(sub: unknown): sub is PushSubscription {
  if (!sub || typeof sub !== "object") return false;
  const s = sub as Record<string, unknown>;
  if (typeof s.endpoint !== "string" || !s.endpoint.startsWith("https://")) {
    return false;
  }
  if (!s.keys || typeof s.keys !== "object") return false;
  const keys = s.keys as Record<string, unknown>;
  if (typeof keys.p256dh !== "string" || typeof keys.auth !== "string") {
    return false;
  }
  return true;
}

function isValidPreferences(prefs: unknown): prefs is AlertPreferences {
  if (!prefs || typeof prefs !== "object") return false;
  const p = prefs as Record<string, unknown>;

  // The three topic booleans are required
  if (
    typeof p.survey_complete !== "boolean" ||
    typeof p.new_job !== "boolean" ||
    typeof p.report_shared !== "boolean"
  ) {
    return false;
  }

  // Optional channel-level fields — validate types when present
  if (p.email_enabled !== undefined && typeof p.email_enabled !== "boolean") {
    return false;
  }
  if (p.push_enabled !== undefined && typeof p.push_enabled !== "boolean") {
    return false;
  }
  if (
    p.email_frequency !== undefined &&
    !["immediate", "daily", "weekly"].includes(p.email_frequency as string)
  ) {
    return false;
  }

  return true;
}

// ─── Preference mapping ─────────────────────────────────────────────────────

/**
 * Maps the flat AlertPreferences into the nested notification_preferences
 * structure expected by `send-notification` and the digest worker.
 *
 * The send-notification function reads:
 *   notification_preferences.categories.<category>.{in_app, email, push}
 *   notification_preferences.email_frequency
 *   notification_preferences.quiet_hours_*
 *
 * We map our three topic booleans to the matching categories:
 *   survey_complete  ->  surveys
 *   new_job          ->  community
 *   report_shared    ->  alerts
 */
function buildNotificationPreferences(prefs: AlertPreferences) {
  const emailEnabled = prefs.email_enabled ?? true;
  const pushEnabled = prefs.push_enabled ?? true;
  const emailFrequency = prefs.email_frequency ?? "immediate";

  const makeCategoryPrefs = (topicEnabled: boolean) => ({
    in_app: topicEnabled,
    email: topicEnabled && emailEnabled,
    push: topicEnabled && pushEnabled,
  });

  return {
    categories: {
      surveys: makeCategoryPrefs(prefs.survey_complete),
      community: makeCategoryPrefs(prefs.new_job),
      alerts: makeCategoryPrefs(prefs.report_shared),
      // Keep permits and system enabled by default
      permits: makeCategoryPrefs(true),
      system: makeCategoryPrefs(true),
    },
    email_frequency: emailFrequency,
  };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "POST") return err("Method not allowed", 405);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getUser(req);

    // ── Input validation ─────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const { subscription, preferences } = body as {
      subscription?: unknown;
      preferences?: unknown;
    };

    if (!isValidSubscription(subscription)) {
      return err(
        "subscription must be a valid PushSubscription object with endpoint and keys (p256dh, auth)",
      );
    }

    if (!isValidPreferences(preferences)) {
      return err(
        "preferences must include survey_complete (bool), new_job (bool), and report_shared (bool). " +
          "Optional: email_enabled (bool), push_enabled (bool), email_frequency ('immediate'|'daily'|'weekly').",
      );
    }

    // ── Upsert push subscription ─────────────────────────────────────────
    const supabase = createServiceClient();

    // Use the endpoint as a natural unique key — a user may have multiple
    // devices / browsers, each with its own endpoint.
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();

    let subscriptionId: string;
    let subscriptionStatus: "created" | "updated";

    if (existing) {
      // Update existing subscription (keys may have rotated)
      const { error: updateErr } = await supabase
        .from("push_subscriptions")
        .update({
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          expiration_time: subscription.expirationTime ?? null,
          preferences,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateErr) {
        console.error("push subscription update error:", updateErr);
        return err("Failed to update subscription", 500);
      }

      subscriptionId = existing.id;
      subscriptionStatus = "updated";
    } else {
      // Insert new subscription
      const { data: inserted, error: insertErr } = await supabase
        .from("push_subscriptions")
        .insert({
          user_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          expiration_time: subscription.expirationTime ?? null,
          preferences,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("push subscription insert error:", insertErr);
        return err("Failed to store subscription", 500);
      }

      subscriptionId = inserted.id;
      subscriptionStatus = "created";
    }

    // ── Sync notification preferences to user_preferences ────────────────
    // This ensures send-notification and the digest worker see consistent
    // settings regardless of which device saved last.
    const notificationPreferences = buildNotificationPreferences(preferences);

    const { error: prefUpsertErr } = await supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          notification_preferences: notificationPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (prefUpsertErr) {
      // Non-fatal: the push subscription was already saved, so log and
      // continue rather than failing the whole request.
      console.error("user_preferences upsert error:", prefUpsertErr);
    }

    return ok({
      subscription_id: subscriptionId,
      status: subscriptionStatus,
      preferences,
      notification_preferences_synced: !prefUpsertErr,
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("alerts-subscribe error:", e);
    return err(message, status);
  }
});
