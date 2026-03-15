/**
 * JWT verification & user extraction for BeetleSense Edge Functions.
 *
 * Usage:
 *   import { getUser } from "../_shared/auth.ts";
 *   const user = await getUser(req);
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface AuthUser {
  id: string;
  email: string;
  organization_id: string | null;
  role: string | null;
}

/**
 * Verifies the JWT from the Authorization header and returns the
 * authenticated user together with their organisation membership.
 *
 * Throws a structured error (with `status`) when auth fails.
 */
export async function getUser(req: Request): Promise<AuthUser> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw createAuthError(401, "Missing or malformed Authorization header");
  }

  const token = authHeader.replace("Bearer ", "");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createAuthError(500, "Server misconfiguration: missing Supabase env vars");
  }

  // Use the service-role client to validate the user's JWT
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw createAuthError(401, "Invalid or expired token");
  }

  // Look up organisation membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    organization_id: membership?.organization_id ?? null,
    role: membership?.role ?? null,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface AuthError extends Error {
  status: number;
}

function createAuthError(status: number, message: string): AuthError {
  const err = new Error(message) as AuthError;
  err.status = status;
  return err;
}
