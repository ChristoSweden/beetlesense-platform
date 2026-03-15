/**
 * alerts-subscribe  —  Store push subscription & notification preferences.
 *
 * POST  /alerts-subscribe
 * Body: {
 *   subscription: PushSubscription,
 *   preferences: {
 *     survey_complete: boolean,
 *     new_job: boolean,
 *     report_shared: boolean
 *   }
 * }
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

interface PushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface AlertPreferences {
  survey_complete: boolean;
  new_job: boolean;
  report_shared: boolean;
}

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
  return (
    typeof p.survey_complete === "boolean" &&
    typeof p.new_job === "boolean" &&
    typeof p.report_shared === "boolean"
  );
}

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
        "preferences must include survey_complete (bool), new_job (bool), and report_shared (bool)",
      );
    }

    // ── Upsert subscription ──────────────────────────────────────────────
    const supabase = createServiceClient();

    // Use the endpoint as a natural unique key — a user may have multiple
    // devices / browsers, each with its own endpoint.
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();

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

      return ok({
        subscription_id: existing.id,
        status: "updated",
        preferences,
      });
    }

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

    return ok({
      subscription_id: inserted.id,
      status: "created",
      preferences,
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("alerts-subscribe error:", e);
    return err(message, status);
  }
});
