/**
 * parcel-register  —  Register a forestry parcel by fastighets_id.
 *
 * POST  /parcel-register
 * Body: { fastighets_id: string, name?: string }
 *
 * In production this would call the Lantmäteriet API to resolve the
 * property boundary.  For the demo we return a mock polygon near Värnamo
 * in SWEREF 99 TM (EPSG:3006).
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, created, err } from "../_shared/response.ts";

// Mock boundary — a polygon surrounding a forested area near Värnamo
// Coordinates in SWEREF 99 TM (EPSG:3006): [easting, northing]
const MOCK_BOUNDARY = {
  type: "Polygon" as const,
  coordinates: [
    [
      [434500, 6340000],
      [435200, 6340000],
      [435200, 6340600],
      [434800, 6340800],
      [434500, 6340600],
      [434500, 6340000], // closed ring
    ],
  ],
  srid: 3006,
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  if (req.method !== "POST") {
    return err("Method not allowed", 405);
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const user = await getUser(req);

    if (!user.organization_id) {
      return err("User is not a member of any organisation", 403);
    }

    // ── Input validation ────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) {
      return err("Invalid JSON body");
    }

    const { fastighets_id, name } = body as {
      fastighets_id?: string;
      name?: string;
    };

    if (!fastighets_id || typeof fastighets_id !== "string") {
      return err("fastighets_id is required and must be a string");
    }

    // Basic format check  —  Swedish property IDs are typically
    // "KOMMUN TRAKT BLOCK:ENHET", e.g. "VÄRNAMO KÄRDA 1:5".
    const trimmed = fastighets_id.trim();
    if (trimmed.length < 3 || trimmed.length > 100) {
      return err("fastighets_id must be between 3 and 100 characters");
    }

    if (name !== undefined && typeof name !== "string") {
      return err("name must be a string");
    }

    // ── Create parcel record ────────────────────────────────────────────
    const supabase = createServiceClient();

    // Check for duplicate within the same org
    const { data: existing } = await supabase
      .from("parcels")
      .select("id")
      .eq("organization_id", user.organization_id)
      .eq("fastighets_id", trimmed)
      .maybeSingle();

    if (existing) {
      return err(
        "A parcel with this fastighets_id already exists in your organisation",
        409,
      );
    }

    // In production: call Lantmäteriet here to resolve the real boundary.
    // For now we use the mock.
    const boundary = MOCK_BOUNDARY;

    const { data: parcel, error: insertErr } = await supabase
      .from("parcels")
      .insert({
        organization_id: user.organization_id,
        created_by: user.id,
        fastighets_id: trimmed,
        name: name?.trim() || null,
        boundary_geojson: boundary,
        area_ha: 42.5, // mock — would be computed from the real boundary
        status: "pending",
        metadata: {
          source: "mock_lantmateriet",
          registered_at: new Date().toISOString(),
        },
      })
      .select("id, fastighets_id, name, status, area_ha, boundary_geojson")
      .single();

    if (insertErr) {
      console.error("parcel insert error:", insertErr);
      return err("Failed to create parcel", 500);
    }

    return created({
      parcel_id: parcel.id,
      fastighets_id: parcel.fastighets_id,
      name: parcel.name,
      status: parcel.status,
      area_ha: parcel.area_ha,
      boundary: parcel.boundary_geojson,
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("parcel-register error:", e);
    return err(message, status);
  }
});
