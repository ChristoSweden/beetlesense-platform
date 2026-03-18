/**
 * assign-pilot  —  Owner accepts a pilot application.
 *
 * POST /assign-pilot
 * Body: { application_id }
 *
 * Workflow:
 *   1. Validates the application exists and the caller owns the job
 *   2. Updates job status to 'assigned', sets pilot_id
 *   3. Marks the accepted application as 'accepted'
 *   4. Rejects all other pending applications for the same job
 *   5. Notifies the accepted pilot
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

interface AssignPilotBody {
  application_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "POST") return err("Method not allowed", 405);

  try {
    // ── Auth ──
    const user = await getUser(req);

    // ── Parse body ──
    const body: AssignPilotBody = await req.json();

    if (!body.application_id) {
      return err("application_id is required");
    }

    const supabase = createServiceClient();

    // ── Fetch the application with its job ──
    const { data: application, error: appErr } = await supabase
      .from("pilot_applications")
      .select(`
        id,
        job_id,
        pilot_id,
        proposed_fee_sek,
        status,
        pilot_jobs!inner(
          id,
          owner_id,
          title,
          status,
          fee_sek
        )
      `)
      .eq("id", body.application_id)
      .single();

    if (appErr || !application) {
      return err("Application not found", 404);
    }

    // deno-lint-ignore no-explicit-any
    const job = (application as any).pilot_jobs;

    // ── Authorization: only job owner can assign ──
    if (job.owner_id !== user.id) {
      return err("Only the job owner can accept applications", 403);
    }

    // ── Validate states ──
    if (application.status !== "pending") {
      return err(`Application is already ${application.status}`, 409);
    }

    if (job.status !== "open" && job.status !== "applied") {
      return err(
        `Job is already ${job.status} — cannot assign a new pilot`,
        409,
      );
    }

    // ── Determine final fee (use pilot's proposed fee if lower, else job fee) ──
    const finalFee = application.proposed_fee_sek ?? job.fee_sek;

    // ── 1. Accept the chosen application ──
    const { error: acceptErr } = await supabase
      .from("pilot_applications")
      .update({ status: "accepted" })
      .eq("id", application.id);

    if (acceptErr) {
      console.error("Failed to accept application:", acceptErr);
      return err("Failed to accept application", 500);
    }

    // ── 2. Update the job: assign pilot, set status ──
    const { data: updatedJob, error: jobErr } = await supabase
      .from("pilot_jobs")
      .update({
        status: "assigned",
        pilot_id: application.pilot_id,
        fee_sek: finalFee,
        assigned_at: new Date().toISOString(),
      })
      .eq("id", application.job_id)
      .select()
      .single();

    if (jobErr) {
      console.error("Failed to update job:", jobErr);
      // Rollback application status
      await supabase
        .from("pilot_applications")
        .update({ status: "pending" })
        .eq("id", application.id);
      return err("Failed to assign pilot to job", 500);
    }

    // ── 3. Reject all other pending applications for this job ──
    const { error: rejectErr } = await supabase
      .from("pilot_applications")
      .update({ status: "rejected" })
      .eq("job_id", application.job_id)
      .eq("status", "pending")
      .neq("id", application.id);

    if (rejectErr) {
      console.warn("Failed to reject other applications:", rejectErr);
      // Non-critical — continue
    }

    // ── 4. Also update the linked survey if present ──
    if (updatedJob?.survey_id) {
      await supabase
        .from("surveys")
        .update({
          status: "assigned",
          pilot_id: application.pilot_id,
        })
        .eq("id", updatedJob.survey_id);
    }

    // ── 5. Notify the accepted pilot ──
    try {
      await supabase.from("notifications").insert({
        user_id: application.pilot_id,
        type: "job_assigned",
        title: "Uppdrag tilldelat!",
        body: `Du har blivit tilldelad uppdraget "${job.title}". Ersättning: ${finalFee.toLocaleString("sv-SE")} kr.`,
        data: { job_id: application.job_id },
        read: false,
      });
    } catch (notifyErr) {
      console.warn("Failed to notify pilot:", notifyErr);
    }

    // ── 6. Notify rejected pilots ──
    try {
      const { data: rejectedApps } = await supabase
        .from("pilot_applications")
        .select("pilot_id")
        .eq("job_id", application.job_id)
        .eq("status", "rejected");

      if (rejectedApps && rejectedApps.length > 0) {
        const rejectionNotifications = rejectedApps.map((app) => ({
          user_id: app.pilot_id,
          type: "application_rejected",
          title: "Ansökan avvisad",
          body: `En annan pilot har valts för uppdraget "${job.title}".`,
          data: { job_id: application.job_id },
          read: false,
        }));

        await supabase.from("notifications").insert(rejectionNotifications);
      }
    } catch (notifyErr) {
      console.warn("Failed to notify rejected pilots:", notifyErr);
    }

    return ok({
      job: updatedJob,
      accepted_application_id: application.id,
      pilot_id: application.pilot_id,
      final_fee_sek: finalFee,
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("assign-pilot error:", e);
    return err(message, status);
  }
});
