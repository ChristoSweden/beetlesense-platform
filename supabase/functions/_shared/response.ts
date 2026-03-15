/**
 * Typed JSON response helpers for BeetleSense Edge Functions.
 *
 * Usage:
 *   import { ok, err, stream } from "../_shared/response.ts";
 */

import { corsHeaders } from "./cors.ts";

// ---------------------------------------------------------------------------
// Success
// ---------------------------------------------------------------------------

/**
 * Return a 200 JSON response.
 */
export function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Return a 201 Created JSON response.
 */
export function created<T>(data: T): Response {
  return ok(data, 201);
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export interface ErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Return a JSON error response.
 */
export function err(
  message: string,
  status = 400,
  extra?: { code?: string; details?: unknown },
): Response {
  const body: ErrorBody = { error: message, ...extra };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// ---------------------------------------------------------------------------
// Streaming (SSE)
// ---------------------------------------------------------------------------

/**
 * Return a streaming SSE response.  Pass a ReadableStream that yields
 * Uint8Array chunks (use the `sseEncode` helper for formatting).
 */
export function stream(body: ReadableStream<Uint8Array>): Response {
  return new Response(body, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Encode an SSE event.
 */
export function sseEncode(
  data: string,
  event?: string,
): Uint8Array {
  const encoder = new TextEncoder();
  let frame = "";
  if (event) frame += `event: ${event}\n`;
  frame += `data: ${data}\n\n`;
  return encoder.encode(frame);
}
