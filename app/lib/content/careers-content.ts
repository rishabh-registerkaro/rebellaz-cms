/**
 * Shared content model for the marketing copy on the public /careers page.
 *
 * Mirrors the frontend section-for-section. Only the copy is modelled — the
 * roles listing itself is driven by the Career table, the hero search is a
 * component, and the pipeline form stays in code.
 *
 * Multi-line headings are stored with real newlines and rendered with
 * `whitespace-pre-line`, so an editor controls where a title wraps without
 * needing to type HTML.
 *
 * The whole page lives in one JSON column, so adding a benefit card or
 * renaming a section never requires a schema migration.
 */

/** A figure in the hero strip, e.g. "0" + "fees" over "CONTRACTORS NEVER PAY". */
export type CareersStat = {
  value: string;
  /** Highlighted in orange, immediately after `value`. Optional. */
  accent: string;
  label: string;
};

export type CareersCard = {
  title: string;
  body: string;
};

export type CareersStep = {
  /** Small orange label above the title, e.g. "Screen & verify". */
  kicker: string;
  title: string;
  body: string;
};

/** Kicker + heading + supporting paragraph, repeated across every section. */
export type CareersSectionHeader = {
  kicker: string;
  title: string;
  intro: string;
};

export type CareersPageContent = {
  hero: {
    kicker: string;
    titleLead: string;
    /** Rendered in orange after `titleLead`. */
    titleAccent: string;
    subtitle: string;
    /** Exactly four — the hero strip is a fixed four-column layout. */
    stats: CareersStat[];
  };
  benefits: CareersSectionHeader & {
    /** Any number of cards; the grid reflows. */
    cards: CareersCard[];
  };
  hiring: CareersSectionHeader & {
    /** Any number. The "01/02/03" badge is derived from position, not stored. */
    steps: CareersStep[];
  };
  /** Only the header is editable — the quote cards stay in code for now. */
  testimonials: CareersSectionHeader;
  pipeline: {
    kicker: string;
    title: string;
    body: string;
    points: string[];
  };
};

/**
 * The copy the page shipped with. Used to seed the first row, and as the
 * fallback the frontend renders if the CMS is unreachable — so the page can
 * never come up blank.
 */
export const DEFAULT_CAREERS_CONTENT: CareersPageContent = {
  hero: {
    kicker: "BUILD WITH REBELLABZ",
    titleLead: "The career behind the world's",
    titleAccent: "energy",
    subtitle:
      "Rotational, contract and staff roles across oil & gas, renewables, marine and infrastructure — with visas, payroll, compliance and travel handled for you, anywhere on earth.",
    stats: [
      { value: "Global", accent: "", label: "Deployment reach" },
      { value: "24/7", accent: "", label: "Rotation support" },
      { value: "0", accent: "fees", label: "Contractors never pay" },
      { value: "End-to-end", accent: "", label: "Visas · Travel · Payroll" },
    ],
  },

  benefits: {
    kicker: "Why build here",
    title: "More than a placement.\nA managed career.",
    intro:
      "We remove the friction that comes with international energy work so you can focus on the job.",
    cards: [
      {
        title: "Compliant global payroll",
        body: "Paid correctly, on time, in your currency — through owned legal entities in 80+ regions.",
      },
      {
        title: "Visas & mobility handled",
        body: "Work permits, medicals, travel and accommodation organised end to end before you fly.",
      },
      {
        title: "Competitive day rates",
        body: "Transparent, benchmarked rates with no hidden agency margins eating your earnings.",
      },
      {
        title: "Tickets & certifications",
        body: "Support keeping OPITO, GWO, BOSIET and discipline tickets current and funded.",
      },
      {
        title: "One dedicated desk",
        body: "A single named account manager who knows your file across every rotation and region.",
      },
      {
        title: "Long-term continuity",
        body: "Back-to-back rotations and a pipeline of projects — not one job, then silence.",
      },
    ],
  },

  hiring: {
    kicker: "How hiring works",
    title: "From apply to rig\nin four steps",
    intro:
      "A clear, fast process — most candidates go from application to an offer within days, not weeks.",
    steps: [
      {
        kicker: "Apply",
        title: "Apply once",
        body: "Submit your CV and tickets a single time. We match you to every relevant live rotation.",
      },
      {
        kicker: "Screen & verify",
        title: "Vetting & checks",
        body: "Technical screening, ticket validation and background checks against discipline standards.",
      },
      {
        kicker: "Mobilize",
        title: "Mobilization",
        body: "Offer, contract, visa, medical and travel — all arranged by your dedicated desk.",
      },
      {
        kicker: "Deploy",
        title: "On-site & paid",
        body: "Onboarding, HSE briefing and compliant local payroll from your very first shift.",
      },
    ],
  },

  testimonials: {
    kicker: "From the crew",
    title: "What it's like to\nwork with us",
    intro: "Contractors who've run multiple rotations through our desk, in their own words.",
  },

  pipeline: {
    kicker: "Join the pipeline",
    title: "Not seeing the right\nrole yet?",
    body: "Register your trade and tickets once. We'll match you to live rotations across every energy region as they open.",
    points: [
      "One profile, matched to every relevant rotation",
      "First-access alerts before roles go public",
      "A dedicated desk that keeps your tickets current",
    ],
  },
};

/** Number of stat figures the hero layout renders. */
export const HERO_STAT_COUNT = 4;

/**
 * Fill in anything missing from a stored document.
 *
 * Content saved before a field existed would otherwise render as `undefined`
 * on the live site. Merges section by section rather than deeply, because the
 * arrays are meant to be replaced wholesale, not merged element-wise.
 */
export function withCareersDefaults(
  value: unknown
): CareersPageContent {
  const c = (value ?? {}) as Partial<CareersPageContent>;
  const d = DEFAULT_CAREERS_CONTENT;

  const stats =
    Array.isArray(c.hero?.stats) && c.hero.stats.length
      ? c.hero.stats.slice(0, HERO_STAT_COUNT)
      : d.hero.stats;

  return {
    hero: { ...d.hero, ...c.hero, stats },
    benefits: {
      ...d.benefits,
      ...c.benefits,
      cards: Array.isArray(c.benefits?.cards) ? c.benefits.cards : d.benefits.cards,
    },
    hiring: {
      ...d.hiring,
      ...c.hiring,
      steps: Array.isArray(c.hiring?.steps) ? c.hiring.steps : d.hiring.steps,
    },
    testimonials: { ...d.testimonials, ...c.testimonials },
    pipeline: {
      ...d.pipeline,
      ...c.pipeline,
      points: Array.isArray(c.pipeline?.points) ? c.pipeline.points : d.pipeline.points,
    },
  };
}
