/**
 * dronedeploy-webhook — Handles DroneDeploy webhook events and
 * manual actions (connect, sync, import) from the frontend.
 *
 * Webhook events handled:
 *   - processing_complete — map has finished processing
 *   - export_ready — export file is ready for download
 *
 * Manual actions (via POST body.action):
 *   - connect — initiate OAuth flow
 *   - sync — pull latest maps from DroneDeploy
 *   - import — import a specific map into BeetleSense
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ─── Helpers ───

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// ─── Handler ───

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return handleCors();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const dronedeployApiKey = Deno.env.get("DRONEDEPLOY_API_KEY");

  if (!dronedeployApiKey) {
    return errorResponse("DroneDeploy API key not configured", 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json();

    // ─── Manual actions from the frontend ───
    if (body.action) {
      switch (body.action) {
        case "connect": {
          // Generate OAuth URL for DroneDeploy
          const redirectUri = `${supabaseUrl}/functions/v1/dronedeploy-webhook?type=oauth_callback`;
          const authUrl = `https://www.dronedeploy.com/app2/oauth/authorize?response_type=code&client_id=${dronedeployApiKey}&redirect_uri=${encodeURIComponent(redirectUri)}`;

          return jsonResponse({ auth_url: authUrl });
        }

        case "sync": {
          // Get the user's auth to find their organization
          const authHeader = req.headers.get("Authorization");
          if (!authHeader) return errorResponse("Authorization required", 401);

          const { data: { user } } = await supabase.auth.getUser(
            authHeader.replace("Bearer ", ""),
          );
          if (!user) return errorResponse("Invalid auth token", 401);

          // Find the user's organization
          const { data: profile } = await supabase
            .from("profiles")
            .select("organization_id")
            .eq("user_id", user.id)
            .maybeSingle();

          if (!profile?.organization_id) {
            return errorResponse("No organization found for user");
          }

          // Fetch maps from DroneDeploy API
          const ddResponse = await fetch(
            "https://public-api.dronedeploy.com/v2/maps?limit=200",
            {
              headers: {
                Authorization: `Bearer ${dronedeployApiKey}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (!ddResponse.ok) {
            const errBody = await ddResponse.text();
            console.error("DroneDeploy API error:", ddResponse.status, errBody);
            return errorResponse(`DroneDeploy API error: ${ddResponse.status}`, 502);
          }

          const ddData = await ddResponse.json() as {
            data: Array<{
              id: string;
              plan_id: string;
              name: string;
              status: string;
              location: { lat: number; lng: number };
              date_creation: string;
              area_m2: number;
              resolution_cm: number;
              image_count: number;
              layers: string[];
            }>;
          };

          let newMaps = 0;
          let updatedMaps = 0;

          for (const ddMap of ddData.data) {
            const record = {
              organization_id: profile.organization_id,
              dd_map_id: ddMap.id,
              dd_plan_id: ddMap.plan_id,
              name: ddMap.name,
              status: ddMap.status,
              location: ddMap.location
                ? `SRID=4326;POINT(${ddMap.location.lng} ${ddMap.location.lat})`
                : null,
              date_created: ddMap.date_creation,
              area_m2: ddMap.area_m2,
              resolution_cm: ddMap.resolution_cm,
              image_count: ddMap.image_count,
              available_layers: ddMap.layers,
              synced_at: new Date().toISOString(),
            };

            const { data: existing } = await supabase
              .from("dd_maps")
              .select("id")
              .eq("dd_map_id", ddMap.id)
              .eq("organization_id", profile.organization_id)
              .maybeSingle();

            if (existing) {
              await supabase.from("dd_maps").update(record).eq("id", existing.id);
              updatedMaps++;
            } else {
              await supabase.from("dd_maps").insert(record);
              newMaps++;
            }
          }

          // Update integration metadata
          await supabase
            .from("integrations")
            .update({
              metadata: {
                map_count: ddData.data.length,
                last_sync: new Date().toISOString(),
              },
            })
            .eq("provider", "dronedeploy")
            .eq("organization_id", profile.organization_id);

          console.log(
            `DroneDeploy sync: org=${profile.organization_id} new=${newMaps} updated=${updatedMaps}`,
          );

          return jsonResponse({
            success: true,
            total_maps: ddData.data.length,
            new_maps: newMaps,
            updated_maps: updatedMaps,
          });
        }

        case "import": {
          const { map_id, parcel_id, survey_id } = body;
          if (!map_id || !parcel_id || !survey_id) {
            return errorResponse("map_id, parcel_id, and survey_id are required");
          }

          // Queue the import job for the worker to process
          await supabase.from("job_queue").insert({
            job_type: "dronedeploy_import",
            payload: { map_id, parcel_id, survey_id },
            status: "pending",
            priority: 5,
          });

          console.log(
            `DroneDeploy import queued: map=${map_id} parcel=${parcel_id} survey=${survey_id}`,
          );

          return jsonResponse({ success: true, queued: true });
        }

        default:
          return errorResponse(`Unknown action: ${body.action}`);
      }
    }

    // ─── DroneDeploy webhook events ───
    const eventType = body.event ?? body.type;

    if (!eventType) {
      return errorResponse("Missing event type");
    }

    switch (eventType) {
      case "processing_complete": {
        const mapId = body.data?.map_id ?? body.map_id;
        if (!mapId) {
          console.error("processing_complete: missing map_id");
          return errorResponse("Missing map_id in event data");
        }

        console.log(`DroneDeploy processing_complete: map=${mapId}`);

        // Update the local dd_maps record
        await supabase
          .from("dd_maps")
          .update({
            status: "complete",
            synced_at: new Date().toISOString(),
          })
          .eq("dd_map_id", mapId);

        // Notify via the internal notifications system
        const { data: ddMap } = await supabase
          .from("dd_maps")
          .select("organization_id, name")
          .eq("dd_map_id", mapId)
          .maybeSingle();

        if (ddMap?.organization_id) {
          await supabase.from("notifications").insert({
            organization_id: ddMap.organization_id,
            type: "integration",
            title: "DroneDeploy-karta klar",
            message: `Kartan "${ddMap.name}" har bearbetats klart i DroneDeploy och kan importeras.`,
            metadata: { provider: "dronedeploy", map_id: mapId },
          });
        }

        return jsonResponse({ received: true });
      }

      case "export_ready": {
        const exportId = body.data?.export_id ?? body.export_id;
        const mapId = body.data?.map_id ?? body.map_id;

        if (!exportId) {
          console.error("export_ready: missing export_id");
          return errorResponse("Missing export_id in event data");
        }

        console.log(
          `DroneDeploy export_ready: export=${exportId} map=${mapId}`,
        );

        // Check if this export is tied to an active import job
        const { data: importJob } = await supabase
          .from("job_queue")
          .select("id, payload")
          .eq("job_type", "dronedeploy_import")
          .eq("status", "waiting_export")
          .filter("payload->>map_id", "eq", mapId)
          .maybeSingle();

        if (importJob) {
          // Update the job to proceed with download
          await supabase
            .from("job_queue")
            .update({
              status: "pending",
              payload: {
                ...importJob.payload as Record<string, unknown>,
                export_id: exportId,
                export_ready: true,
              },
            })
            .eq("id", importJob.id);

          console.log(`Import job ${importJob.id} unblocked by export_ready`);
        }

        return jsonResponse({ received: true });
      }

      default:
        console.log(`Unhandled DroneDeploy event: ${eventType}`);
        return jsonResponse({ received: true, unhandled: true });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Webhook handling error";
    console.error("DroneDeploy webhook error:", message);
    return errorResponse(message, 500);
  }
});
