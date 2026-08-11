import { primaryOrigin } from "@/app/lib/utils/allowedOrigins";

// Fire-and-forget cache invalidation on the frontend (Rebellabz website).
// Called automatically after service page mutations so creates, edits and
// deletes show on the live site immediately — no manual "revalidate" needed.

// Hosting dashboards often end up with surrounding quotes or stray whitespace
// pasted into env values (dotenv strips quotes, dashboard UIs don't). Normalize
// so both sides compare the same secret regardless.
export const normalizeSecret = (v: string | null | undefined) =>
  (v ?? "").trim().replace(/^['"]|['"]$/g, "");

export async function revalidateFrontendTags(tags: string[]): Promise<void> {
  // primaryOrigin(), not PRODUCTION_URL directly: that value may list several
  // origins, and interpolating the raw list would build a malformed URL.
  const FRONTEND_URL = primaryOrigin() || "http://localhost:3001";
  try {
    await fetch(`${FRONTEND_URL}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": normalizeSecret(process.env.REVALIDATE_SECRET),
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    // Never fail the mutation because the frontend cache couldn't be cleared —
    // the admin can still use the manual revalidate button.
    console.log("Frontend revalidation failed:", error);
  }
}

export const serviceTags = (slug: string) => ["service-list", `service-${slug}`];

/**
 * A role appears both in the /careers listing (and the featured panel on the
 * hero) and on its own detail page, so both have to be cleared on any change.
 */
export const careerTags = (slug: string) => ["career-list", `career-${slug}`];

