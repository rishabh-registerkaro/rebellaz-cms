/**
 * Career taxonomy.
 *
 * These values are the contract with the frontend: they must stay in sync with
 * `FILTERS` and the `Role` type in Rebellabz/app/careers/roles-data.ts.
 * The listing page filters on an exact string match of `category`, so a typo
 * here silently hides roles from that tab.
 */

/**
 * Seed/fallback discipline names.
 *
 * The `disciplines` table is the authority at runtime — these are what it is
 * seeded with, and what the frontend's DISCIPLINES union expects. Renaming one
 * here does nothing on its own; edit it under Careers → Disciplines.
 */
export const CAREER_CATEGORIES = [
  "Research",
  "Engineering",
  "Applied AI",
  "Ops",
] as const;

/** Engagement types shown in the role's key-details strip. */
export const CAREER_TYPES = ["Full-time", "Contract", "Residency", "Internship"] as const;

/** Rate period appended to the salary string, e.g. "$140–190k" + "/yr". */
export const CAREER_UNITS = ["/yr", "/day", "/month", "/hr"] as const;

/**
 * Types that are bounded in time, and so are the only ones where a Duration
 * and a chosen rate period mean anything.
 *
 * A permanent role is not "a 6-month full-time" — asking an author for its
 * duration invites junk like "." or "N/A", which then leaks into the public
 * key-details line. Everything else pays on a fixed period instead (below).
 */
export const TYPES_WITH_DURATION = ["Contract", "Residency"] as const;

/** Rate period forced for the open-ended types, and the pay label to match. */
export const TYPE_PAY: Record<string, { unit: string; label: string; hint: string }> = {
  "Full-time": {
    unit: "/yr",
    label: "Expected salary",
    hint: "Annual range, e.g. $140–190k. Shown verbatim, so include the currency symbol.",
  },
  Internship: {
    unit: "/month",
    label: "Stipend",
    hint: "Monthly stipend, e.g. $2–3k. Shown verbatim, so include the currency symbol.",
  },
};

/** True when this type should collect a Duration and a rate period. */
export function typeHasDuration(type: string): boolean {
  return TYPES_WITH_DURATION.some((t) => t.toLowerCase() === (type ?? "").trim().toLowerCase());
}

export type CareerCategory = (typeof CAREER_CATEGORIES)[number];
export type CareerType = (typeof CAREER_TYPES)[number];
export type CareerUnit = (typeof CAREER_UNITS)[number];

/**
 * Split a role's pay into amount and period.
 *
 * Authors naturally type the period into the salary box ("£700–820/day") as
 * well as picking it from the dropdown, which renders as "£700–820/day/day".
 * Rather than police the input, strip a trailing unit off the amount. Mirrors
 * splitRate() on the frontend — keep the two in step.
 */
export function splitRate(salary: string, unit: string): { amount: string; period: string } {
  const amount = (salary ?? "").trim();
  const period = (unit ?? "").trim();
  if (period && amount.toLowerCase().endsWith(period.toLowerCase())) {
    return { amount: amount.slice(0, -period.length).trim(), period };
  }
  return { amount, period };
}

/**
 * The site's key-details line, e.g. "Remote · Contract" or
 * "Remote · 6-mo residency".
 *
 * `duration` qualifies the engagement when set, which is how the board reads
 * on the live site; without it the type stands alone. Built here rather than
 * on the frontend so the public API can hand back the `Role` shape the site
 * already renders, leaving its components untouched.
 */
export function roleMeta(location: string, duration: string, type: string): string {
  const cleanType = (type ?? "").trim();
  const cleanDuration = (duration ?? "").trim();

  // Only bounded types qualify their engagement, and only with a duration that
  // actually says something — a legacy "." or "N/A" left on a full-time role
  // must not render as "Remote · . full-time".
  const useDuration = typeHasDuration(cleanType) && /[a-z0-9]/i.test(cleanDuration);
  const engagement = useDuration
    ? `${cleanDuration} ${cleanType.toLowerCase()}`
    : cleanType;

  return [location?.trim(), engagement].filter(Boolean).join(" · ");
}

/** Compensation as one string, e.g. "$140–190k /yr". */
export function roleComp(salary: string, unit: string): string {
  const { amount, period } = splitRate(salary, unit);
  return [amount, period].filter(Boolean).join(" ");
}

/**
 * Coerce a `Json?` bullet column into a clean string array.
 *
 * Prisma types these as `JsonValue`, and a hand-edited row could hold anything,
 * so non-strings and blanks are dropped rather than rendered as "[object
 * Object]" or an empty bullet on the public page.
 */
export function toBullets(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** One "What we offer" entry. */
export type Perk = { title: string; desc: string };

/**
 * Coerce the `perks` Json column into clean {title, desc} pairs.
 *
 * Same defensive reasoning as toBullets(): the column is free-form JSON, and a
 * half-filled row must not render as an empty bullet or "[object Object]".
 * An entry needs a title to be worth showing; the description may be blank.
 */
export function toPerks(value: unknown): Perk[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null)
    .map((v) => ({
      title: typeof v.title === "string" ? v.title.trim() : "",
      desc: typeof v.desc === "string" ? v.desc.trim() : "",
    }))
    .filter((p) => p.title);
}

/** URL-safe slug from a role title — mirrors slugify() on the frontend. */
export function slugifyCareer(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Whole days between `date` and now, floored at 0.
 * The frontend sorts by this ("newest"/"oldest"), so it must be an integer.
 */
export function daysSince(date: Date | null | undefined): number {
  if (!date) return 0;
  const ms = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * Human "posted" label matching the frontend's existing copy
 * ("1 day ago", "2 weeks ago"). Derived rather than stored so it can't go stale.
 */
export function postedLabel(date: Date | null | undefined): string {
  if (!date) return "Just posted";
  const days = daysSince(date);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 60) return "1 month ago";
  return `${Math.floor(days / 30)} months ago`;
}
