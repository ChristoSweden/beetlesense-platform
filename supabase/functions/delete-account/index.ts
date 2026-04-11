/**
 * delete-account — GDPR "right to erasure" endpoint for BeetleSense.
 *
 * POST /delete-account
 * Headers: Authorization: Bearer <user-jwt>
 *
 * 1. Authenticates the caller via their JWT.
 * 2. Calls the `delete_user_data` DB function to purge all owned rows.
 * 3. Deletes the auth.users record via the admin client (cascades remaining FKs).
 */

import { handleCors } from "../_shared/cors.ts";
import { getUser } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { err } from "../_shared/response.ts";

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  if (req.method === "OPTIONS") {
    return handleCors(req);
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Authenticate
  let user: { id: string; email: string };
  try {
    user = await getUser(req);
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 401;
    const message = e instanceof Error ? e.message : "Unauthorized";
    return err(message, status);
  }

  const admin = createServiceClient();

  // 1. Delete all user-owned data via DB function
  const { error: dataError } = await admin.rpc("delete_user_data", {
    p_user_id: user.id,
  });

  if (dataError) {
    console.error("delete_user_data failed:", dataError);
    return err(`Failed to delete user data: ${dataError.message}`, 500);
  }

  // 2. Delete the auth record (cascades any remaining FK references)
  const { error: authError } = await admin.auth.admin.deleteUser(user.id);

  if (authError) {
    console.error("deleteUser failed:", authError);
    return err(`Failed to delete auth record: ${authError.message}`, 500);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
