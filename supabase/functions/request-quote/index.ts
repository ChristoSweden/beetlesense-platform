/**
 * request-quote  —  Send a quote request from a forest owner to a professional.
 *
 * POST  /request-quote
 * Body: {
 *   professional_id: string,
 *   professional_email: string,
 *   parcel_id: string,
 *   service_type: string,
 *   preferred_date?: string,
 *   notes?: string,
 *   requester_name: string,
 *   requester_email: string,
 * }
 *
 * Stores the request in the `quote_requests` table and triggers email
 * notifications to the professional and the requesting user via Resend.
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, created, err } from "../_shared/response.ts";
import { renderNotificationEmail } from "../_shared/emailTemplate.ts";

// ─── Email helpers ───────────────────────────────────────────────────────────

const SENDER_ADDRESS = "BeetleSense.ai <notifications@beetlesense.ai>";

interface ResendEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via the Resend API.
 * Returns true on success, false on failure (non-throwing so quote
 * creation still succeeds even if email delivery fails).
 */
async function sendEmailViaResend(
  payload: ResendEmailPayload,
): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured — skipping email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Resend API error (${res.status}):`, body);
      return false;
    }

    return true;
  } catch (e) {
    console.error("Failed to call Resend API:", e);
    return false;
  }
}

/**
 * Send the quote notification email to the professional and a
 * confirmation email to the requester.  Both are fire-and-forget:
 * failures are logged but do not block the response.
 */
async function sendQuoteNotificationEmails(opts: {
  professionalEmail: string;
  requesterName: string;
  requesterEmail: string;
  serviceType: string;
  preferredDate: string | null;
  notes: string | null;
  quoteRequestId: string;
}): Promise<{ professionalSent: boolean; requesterSent: boolean }> {
  const {
    professionalEmail,
    requesterName,
    requesterEmail,
    serviceType,
    preferredDate,
    notes,
    quoteRequestId,
  } = opts;

  const dateStr = preferredDate
    ? new Date(preferredDate).toLocaleDateString("sv-SE")
    : "Ej angivet";
  const notesStr = notes || "Inga ytterligare anteckningar.";

  // ── Email to professional ──────────────────────────────────────────────

  const professionalBody = [
    `Du har fått en ny offertförfrågan från ${requesterName} (${requesterEmail}).`,
    "",
    `Tjänst: ${serviceType}`,
    `Önskat datum: ${dateStr}`,
    `Anteckningar: ${notesStr}`,
    "",
    "Logga in i BeetleSense för att svara på förfrågan.",
  ].join("\n");

  const professionalHtml = renderNotificationEmail({
    title: "Ny offertförfrågan",
    body: professionalBody,
    category: "community",
    actionUrl: `https://beetlesense.ai/professional/quotes/${quoteRequestId}`,
    actionLabel: "Visa förfrågan",
  });

  const professionalSent = await sendEmailViaResend({
    from: SENDER_ADDRESS,
    to: professionalEmail,
    subject: `Ny offertförfrågan: ${serviceType} — BeetleSense.ai`,
    html: professionalHtml,
  });

  // ── Confirmation email to requester ────────────────────────────────────

  const requesterBody = [
    `Din offertförfrågan för "${serviceType}" har skickats till den valda professionella partnern.`,
    "",
    `Önskat datum: ${dateStr}`,
    `Anteckningar: ${notesStr}`,
    "",
    "Du får ett meddelande när partnern svarar.",
  ].join("\n");

  const requesterHtml = renderNotificationEmail({
    title: "Offertförfrågan skickad",
    body: requesterBody,
    category: "system",
    actionUrl: `https://beetlesense.ai/owner/quotes/${quoteRequestId}`,
    actionLabel: "Visa din förfrågan",
    userName: requesterName,
  });

  const requesterSent = await sendEmailViaResend({
    from: SENDER_ADDRESS,
    to: requesterEmail,
    subject: `Offertförfrågan skickad: ${serviceType} — BeetleSense.ai`,
    html: requesterHtml,
  });

  return { professionalSent, requesterSent };
}

// ─── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return err("Method not allowed", 405);
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const user = await getUser(req);

    // ── Input validation ────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) {
      return err("Invalid JSON body");
    }

    const {
      professional_id,
      professional_email,
      parcel_id,
      service_type,
      preferred_date,
      notes,
      requester_name,
      requester_email,
    } = body as {
      professional_id?: string;
      professional_email?: string;
      parcel_id?: string;
      service_type?: string;
      preferred_date?: string | null;
      notes?: string | null;
      requester_name?: string;
      requester_email?: string;
    };

    if (!professional_id || typeof professional_id !== "string") {
      return err("professional_id is required");
    }
    if (!professional_email || typeof professional_email !== "string") {
      return err("professional_email is required");
    }
    if (!parcel_id || typeof parcel_id !== "string") {
      return err("parcel_id is required");
    }
    if (!service_type || typeof service_type !== "string") {
      return err("service_type is required");
    }

    // ── Store the quote request ────────────────────────────────────────
    const supabase = createServiceClient();

    const resolvedRequesterName = requester_name || user.email;
    const resolvedRequesterEmail = requester_email || user.email;

    const { data: quoteRequest, error: insertErr } = await supabase
      .from("quote_requests")
      .insert({
        requester_id: user.id,
        professional_id,
        professional_email,
        parcel_id,
        service_type,
        preferred_date: preferred_date || null,
        notes: notes?.trim() || null,
        requester_name: resolvedRequesterName,
        requester_email: resolvedRequesterEmail,
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (insertErr) {
      console.error("quote_request insert error:", insertErr);
      return err("Failed to create quote request", 500);
    }

    // ── Trigger email notifications (fire-and-forget) ──────────────────
    const emailResults = await sendQuoteNotificationEmails({
      professionalEmail: professional_email,
      requesterName: resolvedRequesterName,
      requesterEmail: resolvedRequesterEmail,
      serviceType: service_type,
      preferredDate: preferred_date || null,
      notes: notes?.trim() || null,
      quoteRequestId: quoteRequest.id,
    });

    return created({
      quote_request_id: quoteRequest.id,
      status: quoteRequest.status,
      created_at: quoteRequest.created_at,
      notifications: {
        professional_email_sent: emailResults.professionalSent,
        requester_email_sent: emailResults.requesterSent,
      },
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("request-quote error:", e);
    return err(message, status);
  }
});
