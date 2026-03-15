/**
 * CORS headers helper for BeetleSense Edge Functions.
 *
 * Usage:
 *   import { corsHeaders, handleCors } from "../_shared/cors.ts";
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

/**
 * Returns a 204 response for preflight OPTIONS requests.
 * Call at the top of every handler:
 *
 *   if (req.method === "OPTIONS") return handleCors();
 */
export function handleCors(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
