/**
 * CORS headers helper for BeetleSense Edge Functions.
 *
 * Usage:
 *   import { corsHeaders, handleCors, getCorsHeaders } from "../_shared/cors.ts";
 */

/** Allowed origins — checked against the request Origin header. */
const ALLOWED_ORIGINS: string[] = (
  Deno.env.get("CORS_ALLOWED_ORIGINS") ??
  "https://beetlesense.ai,https://www.beetlesense.ai,http://localhost:5173"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Returns CORS headers with the correct Access-Control-Allow-Origin
 * for the given request origin. Falls back to the first allowed origin
 * if the request origin is not in the allowlist.
 */
export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin)
      ? requestOrigin
      : ALLOWED_ORIGINS[0] ?? "";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Legacy export — uses wildcard origin for backwards compatibility.
 * Prefer getCorsHeaders(req.headers.get("Origin")) in new code.
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
 *   if (req.method === "OPTIONS") return handleCors(req);
 */
export function handleCors(req?: Request): Response {
  const origin = req?.headers.get("Origin");
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
