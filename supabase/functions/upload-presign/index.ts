/**
 * upload-presign  —  Generate a presigned URL for survey file upload.
 *
 * POST  /upload-presign
 * Body: {
 *   survey_id: string,
 *   filename: string,
 *   content_type: string,
 *   file_size_bytes: number
 * }
 *
 * Returns: { upload_id, upload_url, expires_at }
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB
const PRESIGN_EXPIRY_SECONDS = 3600; // 1 hour

const ALLOWED_CONTENT_TYPES = new Set([
  // Raster / imagery
  "image/tiff",
  "image/geotiff",
  "application/geo+json",
  "application/geotiff",
  // LiDAR
  "application/vnd.las",
  "application/vnd.laszip",
  "application/octet-stream",
  // Shapefiles / vectors (often zipped)
  "application/zip",
  "application/x-zip-compressed",
  // CSV / tabular
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // PDF reports
  "application/pdf",
  // Common images (drone photos)
  "image/jpeg",
  "image/png",
]);

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

    const { survey_id, filename, content_type, file_size_bytes } = body as {
      survey_id?: string;
      filename?: string;
      content_type?: string;
      file_size_bytes?: number;
    };

    if (!survey_id || typeof survey_id !== "string") {
      return err("survey_id is required");
    }
    if (!filename || typeof filename !== "string") {
      return err("filename is required");
    }
    if (!content_type || typeof content_type !== "string") {
      return err("content_type is required");
    }
    if (typeof file_size_bytes !== "number" || !Number.isFinite(file_size_bytes)) {
      return err("file_size_bytes must be a finite number");
    }

    // Sanitise filename (strip path separators, limit length)
    const sanitised = filename.replace(/[/\\:*?"<>|]/g, "_").slice(0, 255);
    if (sanitised.length === 0) {
      return err("filename is invalid after sanitisation");
    }

    if (!ALLOWED_CONTENT_TYPES.has(content_type)) {
      return err(
        `content_type '${content_type}' is not allowed. Accepted: ${[...ALLOWED_CONTENT_TYPES].join(", ")}`,
      );
    }

    if (file_size_bytes <= 0) {
      return err("file_size_bytes must be positive");
    }
    if (file_size_bytes > MAX_FILE_SIZE) {
      return err(`File exceeds the 500 MB limit (got ${(file_size_bytes / 1024 / 1024).toFixed(1)} MB)`);
    }

    // ── Verify survey ownership ──────────────────────────────────────────
    const supabase = createServiceClient();

    const { data: survey, error: surveyErr } = await supabase
      .from("surveys")
      .select("id, parcel_id, parcels!inner(organization_id)")
      .eq("id", survey_id)
      .maybeSingle();

    if (surveyErr || !survey) {
      return err("Survey not found", 404);
    }

    // deno-lint-ignore no-explicit-any
    const surveyOrgId = (survey as any).parcels?.organization_id;
    if (surveyOrgId !== user.organization_id) {
      return err("You do not have access to this survey", 403);
    }

    // ── Create pending upload record ─────────────────────────────────────
    const storagePath = `surveys/${survey_id}/${crypto.randomUUID()}_${sanitised}`;

    const { data: upload, error: uploadErr } = await supabase
      .from("survey_uploads")
      .insert({
        survey_id,
        uploaded_by: user.id,
        filename: sanitised,
        content_type,
        file_size_bytes,
        storage_path: storagePath,
        status: "pending",
      })
      .select("id")
      .single();

    if (uploadErr) {
      console.error("upload insert error:", uploadErr);
      return err("Failed to create upload record", 500);
    }

    // ── Generate presigned URL ───────────────────────────────────────────
    const { data: signedData, error: signErr } = await supabase.storage
      .from("survey-uploads")
      .createSignedUploadUrl(storagePath);

    if (signErr || !signedData) {
      console.error("presign error:", signErr);
      return err("Failed to generate upload URL", 500);
    }

    const expiresAt = new Date(
      Date.now() + PRESIGN_EXPIRY_SECONDS * 1000,
    ).toISOString();

    return ok({
      upload_id: upload.id,
      upload_url: signedData.signedUrl,
      expires_at: expiresAt,
    });
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("upload-presign error:", e);
    return err(message, status);
  }
});
