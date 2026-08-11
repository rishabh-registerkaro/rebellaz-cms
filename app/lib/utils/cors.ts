import { resolveAllowedOrigin } from "@/app/lib/utils/allowedOrigins";

/**
 * CORS headers for the public read-only `/client` endpoints the frontend uses
 * (careers, services, blog).
 *
 * Which origins are allowed lives in allowedOrigins.ts, shared with
 * corsHeader.ts so the read and write endpoints cannot drift apart.
 *
 * This previously echoed PRODUCTION_URL back for every non-localhost caller.
 * With one origin configured that happened to work, but it meant a visitor on
 * any other allowed origin (e.g. the www form of the site) was told a
 * different origin than their own and the browser rejected the response.
 */
export const getCorsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": resolveAllowedOrigin(origin),
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  // Responses vary by caller origin; a shared cache must not reuse one
  // visitor's Access-Control-Allow-Origin for another.
  Vary: "Origin",
});
