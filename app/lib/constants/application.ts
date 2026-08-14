/**
 * The hiring pipeline, shared by the API and the dashboard so the two cannot
 * drift. Order is the order shown in filters and in the status dropdown, which
 * is also the order a candidate moves through.
 */
export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

/** Where an application came from — used as a filter in the dashboard. */
export const APPLICATION_SOURCES = ["Role page", "Talent pipeline"] as const;

/** Tailwind classes per status, so a row reads at a glance. */
export const APPLICATION_STATUS_COLORS: Record<ApplicationStatusValue, string> = {
  new: "bg-blue-500/15 text-blue-300 border border-blue-500/30",
  reviewing: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  shortlisted: "bg-violet-500/15 text-violet-300 border border-violet-500/30",
  rejected: "bg-slate-500/15 text-slate-300 border border-slate-500/30",
  hired: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
};

/** Human label for a status. */
export function applicationStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
