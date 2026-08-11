/**
 * Careers page copy — everything on /careers that is NOT a role.
 *
 * The roles listing, its discipline tabs and pagination come from the Career
 * and Discipline tables and are deliberately not represented here; this file
 * only describes the surrounding sections.
 *
 * Section names mirror the frontend components one-for-one (hero →
 * <CareersHero>, perks → <WhyBuildHere>, faq → <CandidateFaq>, pipeline →
 * <PipelineSection>) so a field is easy to trace from the page to this form.
 */

/** A "What we offer" card in the Why-build-here grid. */
export type CareersPerk = { title: string; desc: string };

/** One entry in the candidate FAQ accordion. */
export type CareersFaq = { question: string; answer: string };

/** The eyebrow / heading / aside trio every section shares. */
export type CareersSectionHeader = {
  eyebrow: string;
  heading: string;
  aside: string;
};

export type CareersPageContent = {
  hero: {
    title: string;
    /** Rendered in brand red immediately after the title. */
    titleAccent: string;
    lede: string;
    cta: { label: string; href: string };
  };
  /** Header above the roles board. The roles themselves are not editable here. */
  roles: CareersSectionHeader;
  perks: CareersSectionHeader & { items: CareersPerk[] };
  faq: CareersSectionHeader & { items: CareersFaq[] };
  pipeline: {
    eyebrow: string;
    heading: string;
    bullets: string[];
  };
};

export const DEFAULT_CAREERS_CONTENT: CareersPageContent = {
  hero: {
    title: "The work behind adaptive",
    titleAccent: "intelligence",
    lede: "Research, engineering, and applied roles building systems that adapt — remote-first, open by design, measured on outcomes, never on hours logged.",
    cta: { label: "Browse open roles", href: "#roles" },
  },
  roles: {
    eyebrow: "Open Roles",
    heading: "Find your next problem to work on",
    aside: "Live openings across every discipline. Apply once and the desk matches you to what fits.",
  },
  perks: {
    eyebrow: "Why Build Here",
    heading: "More than a job. A lab you help write",
    aside: "The friction most labs tolerate, we removed on purpose — so the work is what's left.",
    items: [
    { title: "Fair, transparent equity", desc: "Every hire gets equity banded by level and published internally — no negotiation games." },
    { title: "Remote-first, always", desc: "Work from anywhere; we hire the person, not the timezone." },
    { title: "Direct access to research", desc: "No layers between you and the problem — talk to the founders, week one." },
    { title: "A real learning budget", desc: "Conference, course, or compute — your call, funded every quarter." },
    { title: "Measured on outcomes", desc: "No hours logged, no busywork theater — just what shipped." },
    { title: "Long-term, not headcount", desc: "We hire for years, not sprints — pipeline and continuity, not churn." },
    ],
  },
  faq: {
    eyebrow: "Before You Apply",
    heading: "Questions candidates actually ask",
    aside: "Anything else? The candidate desk replies within one business day.",
    items: [
    { question: "Do I need to apply for every role separately?", answer: "No — register once with your background and we'll match you to every relevant role as it opens, across every discipline." },
    { question: "Is this fully remote?", answer: "Most roles are remote-first; a few hybrid or on-site roles are marked directly in the listing." },
    { question: "How is equity decided?", answer: "Banded by level and published internally — the same offer for everyone at that level, no back-room negotiating." },
    { question: "What does the trial project look like?", answer: "A short, paid, real problem from our actual backlog — typically one to two weeks, on your own schedule." },
    { question: "How quickly will I hear back?", answer: "Our candidate desk replies within one business day, at every stage of the process." },
    ],
  },
  pipeline: {
    eyebrow: "Join The Pipeline",
    heading: "Not seeing the right problem yet",
    bullets: [
    "One profile, matched to every relevant opening as it posts.",
    "First-access alerts before roles go public.",
    "A dedicated contact who already knows your background.",
    ],
  },
};

/** Drop entries an author left blank rather than rendering an empty card. */
const cleanPerks = (v: unknown): CareersPerk[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is CareersPerk => !!x && typeof x === "object")
        .map((x) => ({ title: String(x.title ?? "").trim(), desc: String(x.desc ?? "").trim() }))
        .filter((x) => x.title)
    : [];

const cleanFaqs = (v: unknown): CareersFaq[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is CareersFaq => !!x && typeof x === "object")
        .map((x) => ({
          question: String(x.question ?? "").trim(),
          answer: String(x.answer ?? "").trim(),
        }))
        .filter((x) => x.question)
    : [];

const cleanBullets = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean) : [];

/**
 * Fill in anything missing from a stored document.
 *
 * Content saved before a field existed would otherwise render as `undefined`
 * on the live site. Merged section by section rather than deeply: the arrays
 * are replaced wholesale, since element-wise merging would resurrect cards an
 * author had deliberately deleted.
 *
 * An emptied array is respected — only a MISSING one falls back to the
 * defaults, which is what lets an editor legitimately clear a section.
 */
export function withCareersDefaults(value: unknown): CareersPageContent {
  const c = (value ?? {}) as Partial<CareersPageContent>;
  const d = DEFAULT_CAREERS_CONTENT;

  return {
    hero: { ...d.hero, ...c.hero, cta: { ...d.hero.cta, ...c.hero?.cta } },
    roles: { ...d.roles, ...c.roles },
    perks: {
      ...d.perks,
      ...c.perks,
      items: Array.isArray(c.perks?.items) ? cleanPerks(c.perks.items) : d.perks.items,
    },
    faq: {
      ...d.faq,
      ...c.faq,
      items: Array.isArray(c.faq?.items) ? cleanFaqs(c.faq.items) : d.faq.items,
    },
    pipeline: {
      ...d.pipeline,
      ...c.pipeline,
      bullets: Array.isArray(c.pipeline?.bullets)
        ? cleanBullets(c.pipeline.bullets)
        : d.pipeline.bullets,
    },
  };
}
