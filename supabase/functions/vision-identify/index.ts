/**
 * vision-identify  —  Identify species and diseases from a camera photo.
 *
 * POST  /vision-identify
 * Body: {
 *   image: string       — base64 data URL or presigned URL
 *   gps?: { latitude: number; longitude: number }
 *   task?: "species" | "animal" | "disease" | "multi"  (default: "multi")
 * }
 *
 * Returns structured identification result with species candidates
 * and disease detections.
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { ok, err } from "../_shared/response.ts";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const VALID_TASKS = ["species", "animal", "disease", "multi"];

interface VisionIdentifyBody {
  image?: string;
  gps?: { latitude: number; longitude: number };
  task?: string;
}

interface IdentificationCandidate {
  rank: number;
  species_id: string;
  common_name_en: string;
  common_name_sv: string;
  scientific_name: string;
  confidence: number;
  type: string;
  description: string;
  habitat: string;
  season: string;
  conservation_status: string;
  is_pest: boolean;
  is_regulated: boolean;
}

interface DiseaseDetection {
  disease_id: string;
  name_en: string;
  name_sv: string;
  scientific_name: string;
  confidence: number;
  severity: string;
  symptoms_detected: string[];
  treatment: string[];
  is_reportable: boolean;
  report_authority: string;
}

interface InferenceResult {
  identification_id: string;
  task: string;
  top_candidates: IdentificationCandidate[];
  disease_detections: DiseaseDetection[];
  has_pest_warning: boolean;
  has_disease: boolean;
  processing_time_ms: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();
  if (req.method !== "POST") return err("Method not allowed", 405);

  try {
    // ── Auth ──────────────────────────────────────────────────────────────
    const user = await getUser(req);

    // ── Input validation ─────────────────────────────────────────────────
    const body: VisionIdentifyBody = await req.json().catch(() => null) as VisionIdentifyBody;
    if (!body) return err("Invalid JSON body");

    const { image, gps, task = "multi" } = body;

    if (!image || typeof image !== "string") {
      return err("image is required (base64 data URL or presigned URL)");
    }

    // Validate task
    if (!VALID_TASKS.includes(task)) {
      return err(`Invalid task. Must be one of: ${VALID_TASKS.join(", ")}`);
    }

    // Validate image size (approximate for base64)
    if (image.startsWith("data:")) {
      const base64Part = image.split(",")[1] ?? "";
      const sizeBytes = Math.ceil(base64Part.length * 0.75);
      if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
        return err(`Image exceeds maximum size of ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB`);
      }
    }

    // Validate GPS if provided
    if (gps) {
      if (
        typeof gps.latitude !== "number" ||
        typeof gps.longitude !== "number" ||
        gps.latitude < -90 || gps.latitude > 90 ||
        gps.longitude < -180 || gps.longitude > 180
      ) {
        return err("Invalid GPS coordinates");
      }
    }

    // ── Forward to inference service ──────────────────────────────────────
    const inferenceUrl = Deno.env.get("INFERENCE_URL") ?? "http://localhost:8000";
    const startTime = Date.now();

    let result: InferenceResult;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout

      const inferenceResponse = await fetch(
        `${inferenceUrl}/api/v1/vision/identify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image,
            task,
            metadata: { gps },
          }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeout);

      if (!inferenceResponse.ok) {
        const errorText = await inferenceResponse.text().catch(() => "Unknown error");
        console.error("Inference service error:", inferenceResponse.status, errorText);
        return err("Identification service temporarily unavailable", 502);
      }

      result = await inferenceResponse.json();
    } catch (inferErr) {
      // If inference service is unreachable, return a helpful error
      console.error("Inference service unreachable:", inferErr);
      return err(
        "Identification service is currently unavailable. Please try again later.",
        503,
      );
    }

    const processingTimeMs = Date.now() - startTime;
    result.processing_time_ms = processingTimeMs;

    // ── Store identification in database ─────────────────────────────────
    const supabase = createServiceClient();

    const topCandidate = result.top_candidates?.[0];
    const topDisease = result.disease_detections?.[0];

    const { error: insertErr } = await supabase
      .from("identifications")
      .insert({
        id: result.identification_id,
        user_id: user.id,
        task,
        top_species_id: topCandidate?.species_id ?? null,
        top_species_name: topCandidate?.scientific_name ?? null,
        top_species_common_sv: topCandidate?.common_name_sv ?? null,
        top_confidence: topCandidate?.confidence ?? 0,
        species_type: topCandidate?.type ?? null,
        has_disease: result.has_disease,
        has_pest_warning: result.has_pest_warning,
        top_disease_id: topDisease?.disease_id ?? null,
        top_disease_name: topDisease?.name_en ?? null,
        disease_severity: topDisease?.severity ?? null,
        gps_lat: gps?.latitude ?? null,
        gps_lng: gps?.longitude ?? null,
        processing_time_ms: processingTimeMs,
        result_json: result,
      });

    if (insertErr) {
      // Log but don't fail the request — the user still gets their result
      console.error("Failed to store identification:", insertErr.message);
    }

    return ok(result);
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 500;
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("vision-identify error:", e);
    return err(message, status);
  }
});
