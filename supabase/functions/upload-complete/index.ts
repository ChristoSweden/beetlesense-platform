/**
 * upload-complete  —  Mark an upload as complete & trigger validation.
 *
 * POST  /upload-complete
 * Body: { upload_id: string }
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "POST") return err("Method not allowed", 405);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getUser(req);

    if (!user.organization_id) {
      return err("User is not a member of any organisation", 403);
    }

    // ── Input validation ─────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body) return err("Invalid JSON body");

    const { upload_id } = body as { upload_id?: string };

    if (!upload_id || typeof upload_id !== "string") {
      return err("upload_id is required");
    }

    // ── Verify ownership ─────────────────────────────────────────────────
    const supabase = createServiceClient();

    const { data: upload, error: fetchErr } = await supabase
      .from("survey_uploads")
      .select(`
        id,
        status,
        survey_id,
        storage_path,
        surveys!inner(
          parcel_id,
          parcels!inner(organization_id)
        )
      `)
      .eq("id", upload_id)
      .maybeSingle();

    if (fetchErr || !upload) {
      return err("Upload not found", 404);
    }

    // deno-lint-ignore no-explicit-any
    const uploadOrgId = (upload as any).surveys?.parcels?.organization_id;
    if (uploadOrgId !== user.organization_id) {
      return err("You do not have access to this upload", 403);
    }

    if (upload.status !== "pending") {
      return err(
        `Upload is in '${upload.status}' state — only 'pending' uploads can be completed`,
        409,
      );
    }

    // ── Atomic transition to "validating" (prevents race conditions) ────
    // Only update if status is still "pending" — two concurrent requests
    // cannot both transition the same upload.
    const { error: updateErr, count: updateCount } = await supabase
      .from("survey_uploads")
      .update({
        status: "validating",
        uploaded_at: new Date().toISOString(),
      })
      .eq("id", upload_id)
      .eq("status", "pending");

    if (updateErr) {
      console.error("upload update error:", updateErr);
      return err("Failed to update upload status", 500);
    }

    if (!updateCount) {
      return err("Upload already being processed or was cancelled", 409);
    }

    // ── Trigger validation job ───────────────────────────────────────────
    // In production this enqueues a BullMQ job via the worker API.
    // We attempt the call but do not fail the request if the worker is
    // unreachable (the worker can also poll for 'validating' uploads).
    const workerUrl = Deno.env.get("WORKER_API_URL");
    if (workerUrl) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        await fetch(`${workerUrl}/jobs/upload-validation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("WORKER_API_SECRET") ?? ""}`,
          },
          body: JSON.stringify({
            upload_id,
            survey_id: upload.survey_id,
            storage_path: upload.storage_path,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);
      } catch (workerErr) {
        // Non-fatal — log and continue
        console.warn(
          "Could not reach worker API for validation job:",
          workerErr,
        );
      }
    } else {
      console.info(
        "WORKER_API_URL not set — skipping async validation trigger. " +
          "Worker should poll for 'validating' uploads.",
      );
    }

    return ok({
      upload_id,
      status: "validating",
      message: "Upload marked as complete. Validation has been triggered.",
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("upload-complete error:", e);
    return err(message, status);
  }
});
