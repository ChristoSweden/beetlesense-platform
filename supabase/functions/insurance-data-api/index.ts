/**
 * insurance-data-api — Authenticated B2B endpoint for insurance partners.
 *
 * Insurance underwriters use this endpoint to query forest health data
 * for risk assessment. Access requires an API key and owner consent.
 *
 * GET /insurance-data-api?parcel_id=<uuid>
 * Headers: X-API-Key: <partner key>
 *
 * Revenue model: insurance partners pay per-query subscription fee.
 * Owner consent is required (insurance_data_consent = true in profiles).
 */

import { createServiceClient } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleCors(req);
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
    "Content-Type": "application/json",
  };

  function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: corsHeaders,
    });
  }

  // ── Authentication ────────────────────────────────────────────────────────

  const apiKey = req.headers.get("X-API-Key");
  const expectedKey = Deno.env.get("INSURANCE_API_KEY");

  if (!apiKey || !expectedKey || apiKey !== expectedKey) {
    return jsonError("Unauthorized: invalid or missing API key", 401);
  }

  // ── Routing ───────────────────────────────────────────────────────────────

  if (req.method !== "GET") {
    return jsonError("Method not allowed. Use GET.", 405);
  }

  const url = new URL(req.url);
  const parcelId = url.searchParams.get("parcel_id");

  if (!parcelId) {
    return jsonError("parcel_id query parameter is required", 400);
  }

  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(parcelId)) {
    return jsonError("parcel_id must be a valid UUID", 400);
  }

  // ── Data fetch ────────────────────────────────────────────────────────────

  const supabase = createServiceClient();

  // Fetch parcel with owner consent check
  const { data: parcel, error: parcelError } = await supabase
    .from("parcels")
    .select(`
      id,
      name,
      area_ha,
      species_mix,
      health_score,
      risk_level,
      storm_risk,
      last_survey_at,
      profiles!inner (
        insurance_data_consent
      )
    `)
    .eq("id", parcelId)
    .maybeSingle();

  if (parcelError) {
    console.error("[insurance-data-api] DB error:", parcelError);
    return jsonError("Internal error fetching parcel data", 500);
  }

  if (!parcel) {
    return jsonError("Parcel not found", 404);
  }

  // Type-safe access to the profiles join
  const profiles = parcel.profiles as { insurance_data_consent: boolean } | null;

  if (!profiles?.insurance_data_consent) {
    return jsonError(
      "Owner has not consented to insurance data sharing. Direct the forest owner to enable data sharing in BeetleSense Settings.",
      403
    );
  }

  // ── Log access for audit trail ────────────────────────────────────────────

  await supabase
    .from("api_access_logs")
    .insert({
      parcel_id: parcelId,
      client: "insurance_partner",
      accessed_at: new Date().toISOString(),
    })
    .then(() => {}) // fire-and-forget, don't block response
    .catch((e: unknown) => console.warn("[insurance-data-api] audit log failed:", e));

  // ── Response ──────────────────────────────────────────────────────────────

  const payload = {
    parcel_id: parcelId,
    health_score: (parcel.health_score as number | null) ?? null,
    beetle_risk_level: (parcel.risk_level as string | null) ?? "unknown",
    storm_risk_score: (parcel.storm_risk as number | null) ?? null,
    last_inspection_date: (parcel.last_survey_at as string | null) ?? null,
    area_hectares: (parcel.area_ha as number | null) ?? null,
    species_mix: (parcel.species_mix as unknown[]) ?? [],
    data_as_of: new Date().toISOString(),
    data_source: "BeetleSense AI Forest Platform",
    api_version: "1.0",
    disclaimer:
      "This data is provided for actuarial risk assessment purposes only. BeetleSense does not warrant the accuracy of AI-derived risk scores for insurance underwriting decisions. On-site inspection by a qualified forester is recommended for high-value policies.",
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: corsHeaders,
  });
});
