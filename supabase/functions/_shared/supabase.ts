/**
 * Supabase client helpers for BeetleSense Edge Functions.
 *
 * Two flavours:
 *   - createServiceClient()    — full admin access (service-role key)
 *   - createUserClient(req)    — scoped to the calling user's JWT / RLS
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Returns an admin Supabase client (service-role).
 * Use for operations that must bypass RLS.
 */
export function createServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * Returns a Supabase client that carries the user's JWT so that
 * Row-Level Security policies are enforced.
 */
export function createUserClient(req: Request): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";

  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: { persistSession: false },
  });
}
