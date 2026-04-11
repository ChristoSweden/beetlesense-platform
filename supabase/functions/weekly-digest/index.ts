/**
 * weekly-digest — BeetleSense Forest Intelligence Digest
 *
 * Scheduled Edge Function (invoke via cron or manually).
 *
 * 1. Queries all users with digest_enabled = true
 * 2. For each user, fetches their parcels and current risk scores
 * 3. Generates a plain-language Swedish summary per parcel
 * 4. Sends an HTML email via Resend
 * 5. Logs delivery to digest_log
 * 6. Returns count of sent digests
 *
 * Rate-limits to batches of 10 concurrent sends.
 *
 * POST /functions/v1/weekly-digest
 * Headers: Authorization: Bearer <service-role-key>
 */

import { handleCors } from "../_shared/cors.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";
import { renderDigestEmail } from "../_shared/emailTemplate.ts";

// ── Types ────────────────────────────────────────────────────────────────────

interface DigestUser {
  user_id: string;
  digest_email: string;
  digest_frequency: string;
  alert_beetle: boolean;
  alert_fire: boolean;
  alert_storm: boolean;
  alert_market: boolean;
  alert_compliance: boolean;
}

interface Parcel {
  id: string;
  name: string;
  area_hectares: number;
  status: string;
  risk_score?: number;
  species_dominant?: string;
}

interface RecentAlert {
  id: string;
  title: string;
  body: string;
  type: string;
  severity: string;
  parcel_id: string | null;
  created_at: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 10;
const RESEND_API_URL = "https://api.resend.com/emails";
const FROM_ADDRESS = "BeetleSense <digest@beetlesense.ai>";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a plain-language summary for one parcel.
 */
function summarizeParcel(parcel: Parcel, alerts: RecentAlert[]): string {
  const parcelAlerts = alerts.filter((a) => a.parcel_id === parcel.id);

  if (parcelAlerts.length === 0) {
    if (parcel.status === "healthy" || !parcel.status) {
      return `Your forest at ${parcel.name} is healthy. No action needed.`;
    }
    if (parcel.status === "at_risk") {
      return `${parcel.name} shows elevated risk — keep monitoring.`;
    }
    return `${parcel.name}: status is ${parcel.status}.`;
  }

  const critical = parcelAlerts.filter((a) => a.severity === "critical");
  const warnings = parcelAlerts.filter((a) => a.severity === "warning");

  if (critical.length > 0) {
    return (
      `Critical alert at ${parcel.name}: ${critical[0].title}. ` +
      `${critical[0].body.slice(0, 120)}${critical[0].body.length > 120 ? "..." : ""}`
    );
  }

  if (warnings.length > 0) {
    return (
      `Elevated beetle risk detected at ${parcel.name} — ` +
      `consider scheduling a drone survey. (${warnings.length} warning${warnings.length > 1 ? "s" : ""})`
    );
  }

  return `${parcel.name}: ${parcelAlerts.length} info alert${parcelAlerts.length > 1 ? "s" : ""} this week.`;
}

/**
 * Build the full digest summary from all parcels.
 */
function buildDigestSummary(
  parcels: Parcel[],
  alerts: RecentAlert[],
): string {
  if (parcels.length === 0) {
    return "No parcels registered. Add your first forest parcel to start receiving personalized insights.";
  }

  return parcels.map((p) => summarizeParcel(p, alerts)).join("\n\n");
}

/**
 * Send an email via Resend.
 */
async function sendEmail(
  resendKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`Resend error (${res.status}):`, detail);
      return { success: false, error: `Resend ${res.status}: ${detail}` };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Email send failed:", message);
    return { success: false, error: message };
  }
}

/**
 * Process a batch of users concurrently.
 */
async function processBatch(
  users: DigestUser[],
  supabase: ReturnType<typeof createServiceClient>,
  resendKey: string,
  since: string,
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const results = await Promise.allSettled(
    users.map(async (user) => {
      try {
        // Fetch user's parcels
        const { data: parcels } = await supabase
          .from("parcels")
          .select("id, name, area_hectares, status, risk_score, species_dominant")
          .eq("user_id", user.user_id)
          .order("name");

        const userParcels: Parcel[] = (parcels ?? []) as Parcel[];

        // Fetch recent alerts for this user since last digest
        const { data: alertsData } = await supabase
          .from("alerts")
          .select("id, title, body, type, severity, parcel_id, created_at")
          .eq("user_id", user.user_id)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(50);

        const recentAlerts: RecentAlert[] = (alertsData ?? []) as RecentAlert[];

        // Filter alerts by user's enabled types
        const enabledTypes: string[] = [];
        if (user.alert_beetle) enabledTypes.push("beetle");
        if (user.alert_fire) enabledTypes.push("fire");
        if (user.alert_storm) enabledTypes.push("storm");
        if (user.alert_market) enabledTypes.push("market");
        if (user.alert_compliance) enabledTypes.push("compliance");

        const filteredAlerts = recentAlerts.filter(
          (a) => enabledTypes.includes(a.type) || a.type === "system",
        );

        // Build plain-language summary
        const summary = buildDigestSummary(userParcels, filteredAlerts);

        // Get user profile for name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.user_id)
          .single();

        // Build digest email notifications for the template
        const digestNotifications = filteredAlerts.slice(0, 15).map((a) => ({
          title: a.title,
          body: a.body,
          category: a.type,
          actionUrl: `https://beetlesense.ai/owner/alerts`,
          createdAt: a.created_at,
        }));

        // If no alerts, add a summary-only notification
        if (digestNotifications.length === 0) {
          digestNotifications.push({
            title: "Forest Status Summary",
            body: summary,
            category: "system",
            actionUrl: "https://beetlesense.ai/owner/dashboard",
            createdAt: new Date().toISOString(),
          });
        }

        // Render branded HTML email
        const html = renderDigestEmail({
          userName: (profile as { full_name?: string })?.full_name ?? undefined,
          period: user.digest_frequency === "daily" ? "daily" : "weekly",
          notifications: digestNotifications,
        });

        // Send email
        const subject =
          user.digest_frequency === "daily"
            ? "Your Daily Forest Report — BeetleSense.ai"
            : "Your Weekly Forest Report — BeetleSense.ai";

        const emailResult = await sendEmail(
          resendKey,
          user.digest_email,
          subject,
          html,
        );

        if (!emailResult.success) {
          console.error(`Failed to send digest to ${user.digest_email}:`, emailResult.error);
          return false;
        }

        // Log delivery
        await supabase.from("digest_log").insert({
          user_id: user.user_id,
          email: user.digest_email,
          summary,
          parcels_included: userParcels.length,
          alerts_included: filteredAlerts.length,
        });

        return true;
      } catch (e) {
        console.error(`Digest processing failed for user ${user.user_id}:`, e);
        return false;
      }
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value === true) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

// ── Main Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors(req);

  // Only accept POST (invoked by cron or admin)
  if (req.method !== "POST") return err("Method not allowed", 405);

  // Verify service-role key for server-to-server calls
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return err("RESEND_API_KEY not configured", 500);
  }

  const supabase = createServiceClient();

  try {
    // Parse optional body for frequency override
    let frequency = "weekly";
    try {
      const body = await req.json();
      if (body?.frequency && ["daily", "weekly", "monthly"].includes(body.frequency)) {
        frequency = body.frequency;
      }
    } catch {
      // No body or invalid JSON — use default "weekly"
    }

    // Calculate "since" date based on frequency
    const now = new Date();
    const since = new Date(now);
    if (frequency === "daily") {
      since.setDate(since.getDate() - 1);
    } else if (frequency === "weekly") {
      since.setDate(since.getDate() - 7);
    } else {
      since.setDate(since.getDate() - 30);
    }

    console.log(`Running ${frequency} digest for alerts since ${since.toISOString()}`);

    // Fetch all users with digest enabled and matching frequency
    const { data: users, error: usersError } = await supabase
      .from("user_preferences")
      .select(
        "user_id, digest_email, digest_frequency, alert_beetle, alert_fire, alert_storm, alert_market, alert_compliance",
      )
      .eq("digest_enabled", true)
      .eq("digest_frequency", frequency)
      .not("digest_email", "is", null);

    if (usersError) {
      console.error("Failed to fetch digest users:", usersError);
      return err("Failed to fetch digest users", 500);
    }

    const eligibleUsers = (users ?? []) as DigestUser[];

    if (eligibleUsers.length === 0) {
      console.log("No users with digest enabled for this frequency.");
      return ok({ sent: 0, failed: 0, total: 0, frequency });
    }

    console.log(`Processing ${eligibleUsers.length} users in batches of ${BATCH_SIZE}`);

    let totalSent = 0;
    let totalFailed = 0;

    // Process in batches of BATCH_SIZE to respect rate limits
    for (let i = 0; i < eligibleUsers.length; i += BATCH_SIZE) {
      const batch = eligibleUsers.slice(i, i + BATCH_SIZE);
      const { sent, failed } = await processBatch(
        batch,
        supabase,
        resendKey,
        since.toISOString(),
      );
      totalSent += sent;
      totalFailed += failed;

      // Brief pause between batches to respect Resend rate limits
      if (i + BATCH_SIZE < eligibleUsers.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`Digest complete: ${totalSent} sent, ${totalFailed} failed`);

    return ok({
      sent: totalSent,
      failed: totalFailed,
      total: eligibleUsers.length,
      frequency,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("weekly-digest error:", e);
    return err(message, 500);
  }
});
