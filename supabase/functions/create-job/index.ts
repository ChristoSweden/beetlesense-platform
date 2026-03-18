/**
 * create-job  —  Create a pilot job from a survey request.
 *
 * POST /create-job
 * Body: { survey_id, title?, description?, modules_required?, deadline? }
 *
 * Fee is calculated automatically based on parcel area and required modules:
 *   base 500 SEK + 200 SEK/ha + module surcharges.
 *
 * Triggers notification to nearby pilots after creation.
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, created, err } from "../_shared/response.ts";

interface CreateJobBody {
  survey_id: string;
  title?: string;
  description?: string;
  modules_required?: string[];
  deadline?: string;
}

// Module surcharges (must match the SQL function)
const MODULE_SURCHARGES: Record<string, number> = {
  LiDAR: 500,
  lidar: 500,
  Multispectral: 300,
  multispectral: 300,
  Thermal: 250,
  thermal: 250,
  "3D Model": 400,
  "3d_model": 400,
};

function calculateFee(areaHa: number, modules: string[]): number {
  const baseFee = 500;
  const areaFee = areaHa * 200;
  const moduleSurcharge = modules.reduce(
    (sum, m) => sum + (MODULE_SURCHARGES[m] ?? 0),
    0,
  );
  return Math.round(baseFee + areaFee + moduleSurcharge);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "POST") return err("Method not allowed", 405);

  try {
    // ── Auth ──
    const user = await getUser(req);

    // ── Parse body ──
    const body: CreateJobBody = await req.json();

    if (!body.survey_id) {
      return err("survey_id is required");
    }

    const supabase = createServiceClient();

    // ── Fetch survey + parcel data ──
    const { data: survey, error: surveyErr } = await supabase
      .from("surveys")
      .select(`
        id,
        parcel_id,
        requested_by,
        modules,
        sla_deadline,
        parcels!inner(
          id,
          name,
          area_ha,
          centroid,
          municipality,
          owner_id
        )
      `)
      .eq("id", body.survey_id)
      .single();

    if (surveyErr || !survey) {
      return err("Survey not found", 404);
    }

    // deno-lint-ignore no-explicit-any
    const parcel = (survey as any).parcels;

    // Verify the caller owns the survey / is an admin
    if (survey.requested_by !== user.id && user.role !== "admin") {
      return err("You are not authorized to create a job for this survey", 403);
    }

    // ── Calculate fee ──
    const modules = body.modules_required ?? survey.modules ?? [];
    const areaHa = parcel?.area_ha ?? 0;
    const feeSek = calculateFee(Number(areaHa), modules);

    // ── Extract location from parcel centroid ──
    // centroid is a PostGIS Point(4326); extract lat/lng
    let locationLat: number | null = null;
    let locationLng: number | null = null;

    if (parcel?.centroid) {
      // Use ST_X / ST_Y via a raw query
      const { data: coords } = await supabase.rpc("get_point_coords", {
        geom: parcel.centroid,
      }).maybeSingle();

      if (coords) {
        locationLng = coords.x;
        locationLat = coords.y;
      }
    }

    // ── Build job title ──
    const title =
      body.title ??
      `Drönarmission — ${parcel?.name ?? "Okänt skifte"}`;

    // ── Deadline ──
    const deadline =
      body.deadline ??
      (survey.sla_deadline
        ? new Date(survey.sla_deadline).toISOString().slice(0, 10)
        : null);

    // ── Insert pilot_jobs record ──
    const { data: job, error: insertErr } = await supabase
      .from("pilot_jobs")
      .insert({
        title,
        description:
          body.description ??
          `Flyguppdrag för ${parcel?.name ?? "skifte"} i ${parcel?.municipality ?? "okänd kommun"}. ${modules.join(", ")}.`,
        parcel_id: survey.parcel_id,
        survey_id: survey.id,
        owner_id: user.id,
        status: "open",
        fee_sek: feeSek,
        location_lat: locationLat,
        location_lng: locationLng,
        modules_required: modules,
        deadline,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("create-job insert error:", insertErr);
      return err("Failed to create job: " + insertErr.message, 500);
    }

    // ── Update survey status to 'requested' ──
    await supabase
      .from("surveys")
      .update({ status: "requested" })
      .eq("id", survey.id)
      .eq("status", "draft");

    // ── Notify nearby pilots ──
    // Find pilots whose coverage_area intersects the parcel centroid
    if (locationLat && locationLng) {
      const { data: nearbyPilots } = await supabase
        .from("pilot_profiles")
        .select("id")
        .eq("application_status", "approved")
        .limit(50);

      // Send notifications (non-blocking — don't fail the request)
      if (nearbyPilots && nearbyPilots.length > 0) {
        const notifications = nearbyPilots.map((pilot) => ({
          user_id: pilot.id,
          type: "new_job",
          title: "Nytt uppdrag tillgängligt",
          body: `${title} — ${feeSek.toLocaleString("sv-SE")} kr`,
          data: { job_id: job.id },
          read: false,
        }));

        // Best-effort insert — we don't want notification failure to block job creation
        try {
          await supabase.from("notifications").insert(notifications);
        } catch (notifyErr) {
          console.warn("Failed to send pilot notifications:", notifyErr);
        }
      }
    }

    return created({
      job,
      fee_breakdown: {
        base: 500,
        area: Math.round(Number(areaHa) * 200),
        modules: modules.reduce(
          (sum: number, m: string) => sum + (MODULE_SURCHARGES[m] ?? 0),
          0,
        ),
        total: feeSek,
      },
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("create-job error:", e);
    return err(message, status);
  }
});
