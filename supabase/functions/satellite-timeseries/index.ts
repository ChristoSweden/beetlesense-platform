/**
 * satellite-timeseries  —  NDVI time-series for a parcel.
 *
 * GET  /satellite-timeseries?parcel_id=<uuid>&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD
 *
 * Returns: { dates, ndvi_mean, ndvi_min, ndvi_max }
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "GET") return err("Method not allowed", 405);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getUser(req);

    if (!user.organization_id) {
      return err("User is not a member of any organisation", 403);
    }

    // ── Input ─────────────────────────────────────────────────────────────
    const url = new URL(req.url);
    const parcelId = url.searchParams.get("parcel_id");
    const dateFrom = url.searchParams.get("date_from");
    const dateTo = url.searchParams.get("date_to");

    if (!parcelId) {
      return err("parcel_id query parameter is required");
    }

    if (dateFrom && !ISO_DATE_RE.test(dateFrom)) {
      return err("date_from must be in YYYY-MM-DD format");
    }
    if (dateTo && !ISO_DATE_RE.test(dateTo)) {
      return err("date_to must be in YYYY-MM-DD format");
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return err("date_from must be before or equal to date_to");
    }

    // ── Access check ──────────────────────────────────────────────────────
    const supabase = createServiceClient();

    const { data: parcel } = await supabase
      .from("parcels")
      .select("id, organization_id")
      .eq("id", parcelId)
      .maybeSingle();

    if (!parcel) {
      return err("Parcel not found", 404);
    }
    if (parcel.organization_id !== user.organization_id) {
      return err("You do not have access to this parcel", 403);
    }

    // ── Query satellite observations ──────────────────────────────────────
    let query = supabase
      .from("satellite_observations")
      .select("observation_date, ndvi_mean, ndvi_min, ndvi_max")
      .eq("parcel_id", parcelId)
      .order("observation_date", { ascending: true });

    if (dateFrom) {
      query = query.gte("observation_date", dateFrom);
    }
    if (dateTo) {
      query = query.lte("observation_date", dateTo);
    }

    const { data: rows, error: queryErr } = await query;

    if (queryErr) {
      console.error("satellite query error:", queryErr);
      return err("Failed to fetch satellite data", 500);
    }

    const observations = rows ?? [];

    return ok({
      parcel_id: parcelId,
      count: observations.length,
      dates: observations.map((r) => r.observation_date),
      ndvi_mean: observations.map((r) => r.ndvi_mean),
      ndvi_min: observations.map((r) => r.ndvi_min),
      ndvi_max: observations.map((r) => r.ndvi_max),
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("satellite-timeseries error:", e);
    return err(message, status);
  }
});
