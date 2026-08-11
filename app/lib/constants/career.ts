/**
 * Career taxonomy.
 *
 * These values are the contract with the frontend: they must stay in sync with
 * `FILTERS` and the `Role` type in Rebellabz/app/careers/roles-data.ts.
 * The listing page filters on an exact string match of `category`, so a typo
 * here silently hides roles from that tab.
 */

/** Discipline tabs on /careers. "All roles" is the UI-only default, not a value. */
export const CAREER_CATEGORIES = [
  "Oil & Gas",
  "Renewables",
  "Marine & Offshore",
  "HSE & Quality",
  "Engineering",
] as const;

/** Engagement types shown in the role's key-details strip. */
export const CAREER_TYPES = ["Rotational", "Contract", "Staff"] as const;

/** Rate period appended to the salary string, e.g. "£700–820" + "/day". */
export const CAREER_UNITS = ["/day", "/yr", "/month", "/hr"] as const;

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
