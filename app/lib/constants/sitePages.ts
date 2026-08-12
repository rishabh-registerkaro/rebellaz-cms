/**
 * Frontend routes that are not CMS documents.
 *
 * Service and solution pages come out of the database, but the header also has
 * to reach About, Careers and Contact — those are hand-built routes on the
 * site, so there is no row to look them up from. Listing them here lets the
 * menu editors offer the *whole* navigation as a search-and-pick, instead of
 * making an editor pick some entries and hand-type the rest.
 *
 * These must stay in step with the page.tsx routes under app/(rebel) on the
 * frontend — a route deleted there and left here points visitors at a 404.
 */
/**
 * One link target offered by the menu editors' page picker — a CMS service or
 * solution page, or one of the hand-built routes below.
 */
export type PickablePage = {
  /** Row id for CMS pages, `static:*` for hand-built routes. */
  id: string;
  title: string;
  url: string;
  /** Heading the picker groups this page under. */
  group: PickableGroup;
  /** Absent for static routes — they are always live. */
  status?: "draft" | "published";
};

/**
 * Two groups, not three: every CMS page — pillar or section-built — is served
 * by the one /solutions/[slug] route, so splitting them into "Solutions" and
 * "Services" would advertise a URL space the frontend does not have.
 */
export type PickableGroup = "Solutions" | "Site pages";

/** Group order in the picker, most-linked first. */
export const PICKABLE_GROUPS: PickableGroup[] = ["Solutions", "Site pages"];

export type StaticSitePage = {
  /** Stable identifier for the menu JSON, so a relabelled entry is still
   *  recognisable as this page. Namespaced to avoid colliding with a cuid. */
  id: string;
  title: string;
  url: string;
};

export const STATIC_SITE_PAGES: StaticSitePage[] = [
  { id: "static:home", title: "Home", url: "/" },
  { id: "static:about", title: "About Us", url: "/about" },
  { id: "static:careers", title: "Careers", url: "/careers" },
  { id: "static:contact", title: "Contact", url: "/contact" },
  { id: "static:privacy", title: "Privacy Policy", url: "/privacy" },
  { id: "static:terms", title: "Terms & Conditions", url: "/terms" },
];
