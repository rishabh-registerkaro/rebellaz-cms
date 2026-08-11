/**
 * Where public lead CVs are stored, shared by the upload route (which writes
 * them) and the lead route (which validates the URL handed back to it).
 *
 * Both must agree: /api/lead only accepts an attachmentUrl that this module
 * says we produced. Without that check any caller could attach an arbitrary
 * link to a lead, and an admin clicking it in the dashboard or the notification
 * email would be following an attacker-supplied URL.
 */

/** Remote directory for lead CVs. Defaults to a `leads` folder under media. */
export function leadPath(): string {
  const explicit = (process.env.HOSTINGER_LEAD_PATH || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const media = (process.env.HOSTINGER_MEDIA_PATH || "/public_html/media").replace(/\/$/, "");
  return `${media}/leads`;
}

/** Public URL base matching leadPath(). */
export function leadUrlBase(): string {
  const explicit = (process.env.HOSTINGER_LEAD_URL || "").trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const media = (process.env.HOSTINGER_MEDIA_URL || "").replace(/\/$/, "");
  return `${media}/leads`;
}

/**
 * True when `url` is a CV this CMS uploaded.
 *
 * Compared on parsed origin + pathname rather than by string prefix, so
 * "https://evil.com/?x=https://our-host/media/leads/" cannot slip through.
 */
export function isOwnLeadAttachment(url: string): boolean {
  const base = leadUrlBase();
  if (!base) return false;
  try {
    const target = new URL(url);
    const allowed = new URL(base);
    if (target.origin !== allowed.origin) return false;

    const dir = allowed.pathname.replace(/\/$/, "");
    // Must sit directly inside the leads directory — no traversal, no subdirs.
    if (!target.pathname.startsWith(`${dir}/`)) return false;
    const rest = target.pathname.slice(dir.length + 1);
    return rest.length > 0 && !rest.includes("/");
  } catch {
    return false;
  }
}
