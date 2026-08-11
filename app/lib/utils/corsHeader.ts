import { NextRequest } from "next/server";
import { resolveAllowedOrigin } from "@/app/lib/utils/allowedOrigins";

/**
 * CORS headers for the public write endpoints (lead capture and CV upload).
 *
 * Which origins are allowed lives in allowedOrigins.ts, shared with cors.ts so
 * the read and write endpoints cannot drift apart.
 */
export function getCorsHeaders(req: NextRequest) {
  return {
    "Access-Control-Allow-Origin": resolveAllowedOrigin(req.headers.get("origin")),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // The response body is the same for every caller but this header is not,
    // so a shared cache must key on Origin or it will hand one site's
    // Access-Control-Allow-Origin to a visitor on another.
    Vary: "Origin",
  };
}
