/**
 * survey-status  —  Get survey processing status + per-module progress.
 *
 * GET  /survey-status?survey_id=<uuid>
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

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
    const surveyId = url.searchParams.get("survey_id");

    if (!surveyId) {
      return err("survey_id query parameter is required");
    }

    // ── Fetch survey with access check ────────────────────────────────────
    const supabase = createServiceClient();

    const { data: survey, error: surveyErr } = await supabase
      .from("surveys")
      .select(`
        id,
        name,
        status,
        created_at,
        started_at,
        completed_at,
        parcel_id,
        parcels!inner(
          organization_id,
          fastighets_id,
          name
        )
      `)
      .eq("id", surveyId)
      .maybeSingle();

    if (surveyErr || !survey) {
      return err("Survey not found", 404);
    }

    // deno-lint-ignore no-explicit-any
    const surveyOrgId = (survey as any).parcels?.organization_id;
    if (surveyOrgId !== user.organization_id) {
      return err("You do not have access to this survey", 403);
    }

    // ── Fetch uploads ─────────────────────────────────────────────────────
    const { data: uploads } = await supabase
      .from("survey_uploads")
      .select("id, filename, content_type, file_size_bytes, status, uploaded_at")
      .eq("survey_id", surveyId)
      .order("created_at", { ascending: true });

    // ── Fetch analysis modules ────────────────────────────────────────────
    const { data: modules } = await supabase
      .from("analysis_results")
      .select("id, module, status, progress, started_at, completed_at, error_message")
      .eq("survey_id", surveyId)
      .order("module", { ascending: true });

    // ── Compute aggregate progress ────────────────────────────────────────
    const moduleList = modules ?? [];
    const totalModules = moduleList.length || 1;
    const completedModules = moduleList.filter(
      (m) => m.status === "completed",
    ).length;
    const failedModules = moduleList.filter(
      (m) => m.status === "failed",
    ).length;

    // Weighted progress: each module contributes its own progress fraction
    const aggregateProgress =
      moduleList.length > 0
        ? Math.round(
            moduleList.reduce(
              (sum, m) => sum + (m.progress ?? (m.status === "completed" ? 100 : 0)),
              0,
            ) / totalModules,
          )
        : 0;

    return ok({
      survey: {
        id: survey.id,
        name: survey.name,
        status: survey.status,
        created_at: survey.created_at,
        started_at: survey.started_at,
        completed_at: survey.completed_at,
        parcel: {
          id: survey.parcel_id,
          // deno-lint-ignore no-explicit-any
          fastighets_id: (survey as any).parcels?.fastighets_id,
          // deno-lint-ignore no-explicit-any
          name: (survey as any).parcels?.name,
        },
      },
      uploads: uploads ?? [],
      modules: moduleList.map((m) => ({
        id: m.id,
        module: m.module,
        status: m.status,
        progress: m.progress ?? 0,
        started_at: m.started_at,
        completed_at: m.completed_at,
        error_message: m.error_message,
      })),
      progress: {
        aggregate_percent: aggregateProgress,
        completed: completedModules,
        failed: failedModules,
        total: moduleList.length,
      },
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("survey-status error:", e);
    return err(message, status);
  }
});
