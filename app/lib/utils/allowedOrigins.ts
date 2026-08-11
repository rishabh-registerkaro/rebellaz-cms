/**
 * Single source of truth for which browser origins may call the public APIs.
 *
 * `PRODUCTION_URL` accepts a comma-separated list, because a site is usually
 * reachable on more than one origin — typically the apex and the www form:
 *
 *   PRODUCTION_URL=https://rebel-labz.com,https://www.rebel-labz.com
 *
 * It previously held a single value, so whichever origin was not configured
 * had every browser fetch blocked: the response came back with a
 * non-matching Access-Control-Allow-Origin and the browser discarded it,
 * surfacing on the site as "couldn't reach the server".
 *
 * A single value still works unchanged, so existing deployments need no edit.
 */

/** Origins are compared without a trailing slash — an Origin header never has one. */
const normalize = (value: string) => value.trim().replace(/\/$/, "");

/** Parsed once at module load; PRODUCTION_URL cannot change at runtime. */
const configuredOrigins = (process.env.PRODUCTION_URL ?? "")
  .split(",")
  .map(normalize)
  .filter(Boolean);

/** Any localhost port is allowed so local development needs no configuration. */
function isLocalhost(origin: string): boolean {
  return (
    /^http:\/\/localhost(:\d+)?$/.test(origin) ||
    /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)
  );
}

/**
 * The value to echo back in Access-Control-Allow-Origin, or "" when the
 * caller's origin is not allowed.
 *
 * Returns the *request's* origin rather than the configured string so that,
 * with several origins configured, each caller is told its own origin — which
 * is what the browser requires for the response to be accepted.
 */
export function resolveAllowedOrigin(origin: string | null | undefined): string {
  const candidate = normalize(origin ?? "");
  if (!candidate) return "";
  if (isLocalhost(candidate)) return candidate;
  return configuredOrigins.includes(candidate) ? candidate : "";
}

/**
 * The canonical site origin — the first entry in PRODUCTION_URL.
 *
 * Anywhere that needs to *build* a URL rather than match one (cache
 * revalidation) must use this: interpolating a comma-separated PRODUCTION_URL
 * straight into a template would produce
 * "https://a.com,https://b.com/api/revalidate".
 *
 * Returns "" when unset, so callers apply their own dev fallback.
 */
export function primaryOrigin(): string {
  return configuredOrigins[0] ?? "";
}
