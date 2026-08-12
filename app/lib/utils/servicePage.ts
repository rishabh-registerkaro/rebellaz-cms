/**
 * Derived fields for a `ServicePage` row.
 *
 * The model deliberately has no `title` or `url` column — a page is one
 * flexible `content` document plus a `template`, so both have to be computed
 * from what is stored. Two consumers need the same answer (the dashboard
 * listing and the menu link picker), and they drifting apart would mean the
 * same page shows one name in the services table and another in the header, so
 * the derivation lives here rather than inline at each call site.
 */

/** The only two templates that render under a public /services or /solutions
 *  route. The model also backs pages that live elsewhere (e.g. the resume
 *  builder), and those must never be offered as a service URL. */
export const SERVICE_TEMPLATES = ["division", "solution"] as const;

export type ServiceTemplate = (typeof SERVICE_TEMPLATES)[number];

export const isServiceTemplate = (template: string | null | undefined): boolean =>
  SERVICE_TEMPLATES.includes((template ?? "") as ServiceTemplate);

/**
 * Display title for a page.
 *
 * "division" pages keep their title in titleLead/titleAccent, "solution" pages
 * in hero.title. Falling through both — then `badge`, then the slug — keeps one
 * list rendering both templates and never yields a blank row.
 */
export function servicePageTitle(content: unknown, slug?: string): string {
  const c = content as
    | {
        titleLead?: string;
        titleAccent?: string;
        badge?: string;
        hero?: { title?: string; pillar?: string };
      }
    | null
    | undefined;

  return (
    [c?.titleLead, c?.titleAccent].filter(Boolean).join(" ") ||
    c?.hero?.title ||
    c?.hero?.pillar ||
    c?.badge ||
    slug ||
    ""
  );
}

/**
 * Public path for a page, or null when its template renders nowhere public.
 *
 * Both templates live under /solutions — the frontend has one route,
 * app/(rebel)/solutions/[slug], which tries the solution loader and falls back
 * to the division one. There is no /services/[slug] route; a link built there
 * is a 404, so the template decides *whether* a page has a URL, never which
 * prefix it gets.
 */
export function servicePageUrl(
  template: string | null | undefined,
  slug: string
): string | null {
  return isServiceTemplate(template) ? `/solutions/${slug}` : null;
}
