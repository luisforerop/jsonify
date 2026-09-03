/**
 * Permissive CORS headers for the public `/api/v1` routes. The prototype has no
 * auth or credentials, and the data is served by a public API by design, so a
 * wildcard origin is acceptable.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, x-workspace-id, x-schema, x-record-name",
};

/** Answer a CORS preflight `OPTIONS` request. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Build a JSON `Response` that always carries the CORS headers, mirroring
 * `Response.json` for the public API handlers.
 */
export function corsJson(body: unknown, init?: ResponseInit): Response {
  const response = Response.json(body, init);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
