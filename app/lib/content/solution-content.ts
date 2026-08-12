/**
 * Solution (pillar) page content — everything on /solutions/[slug].
 *
 * Section names mirror the frontend components one-for-one: hero →
 * <ServiceHero>, offerings → <ServiceOfferings>, comparison →
 * <ComparisonTable>, faq → <FaqSection>, contact → <ServiceContact>.
 *
 * The page's dark/light rhythm is NOT stored here. Each section component owns
 * its own tone (hero dark → offerings light → comparison dark → faq light →
 * contact dark), so every page built from this template alternates correctly
 * without an editor having to think about it — and cannot break the rhythm by
 * reordering or omitting a section.
 *
 * The enquiry form is likewise absent by design: its fields and validation are
 * part of the site, and the "Interested in" options are derived from the
 * offering titles below rather than authored twice.
 */

export type SolutionStat = { value: string; label: string };

/** One capability card in the "what we do" grid. */
export type SolutionOffering = {
  /** Small mono label on the image, e.g. "01 // Strategy". */
  badge: string;
  title: string;
  body: string;
  bullets: string[];
  image: string;
  alt: string;
};

export type SolutionComparisonRow = {
  feature: string;
  traditional: string;
  rebel: string;
};

export type SolutionFaq = { question: string; answer: string };

/** The eyebrow / heading / aside trio each section shares. */
export type SolutionSectionHeader = {
  eyebrow: string;
  heading: string;
  aside: string;
};

/**
 * Layouts an editor can choose from.
 *
 * Each section component is styled for one tone — hero, comparison and contact
 * are dark; offerings and FAQ are light — so a layout cannot order them freely:
 * the page must alternate with no two adjacent sections sharing a tone. These
 * three are the arrangements that satisfy that, and the frontend re-validates
 * them at build time (lib/solution-layouts.ts).
 */
export const SOLUTION_LAYOUTS = [
  {
    id: "standard",
    name: "Standard pillar",
    description: "Hero, what-we-do cards, comparison table, FAQ, closing enquiry panel.",
  },
  {
    id: "essentials",
    name: "Essentials",
    description: "Hero, what-we-do cards, closing enquiry panel. For a newer pillar.",
  },
  {
    id: "reference",
    name: "Reference",
    description: "Hero, cards, comparison, FAQ — ends on the FAQ, no enquiry panel.",
  },
] as const;

export type SolutionLayoutId = (typeof SOLUTION_LAYOUTS)[number]["id"];

export type SolutionPageContent = {
  /** Which layout renders the page. Defaults to the standard pillar. */
  layout: SolutionLayoutId;
  hero: {
    /** Pillar label above the title, e.g. "Pillar 01". */
    pillar: string;
    title: string;
    tagline: string;
    image: string;
    alt: string;
    /** Mono caption across the top of the hero visual. */
    badge: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
    stats: SolutionStat[];
  };
  offerings: SolutionSectionHeader & { items: SolutionOffering[] };
  comparison: SolutionSectionHeader & {
    /** Column headers of the comparison table. */
    columns: { feature: string; traditional: string; rebel: string };
    rows: SolutionComparisonRow[];
  };
  faq: SolutionSectionHeader & {
    cta: { label: string; href: string };
    items: SolutionFaq[];
  };
  /** Left-hand column of the closing section. The form beside it is not authored. */
  contact: {
    badge: string;
    title: string;
    /** Rendered in italic inside the title. */
    titleAccent: string;
    lede: string;
    note: string;
    email: string;
  };
};

/** The hero strip is a fixed three-column layout. */
export const HERO_STAT_COUNT = 3;

export const DEFAULT_SOLUTION_CONTENT: SolutionPageContent = {
  layout: "standard",
  hero: {
    pillar: "Pillar 01",
    title: "Decision Intelligence",
    tagline: "Every dashboard should end in a decision. We build the systems that get there.",
    image: "/solutions/di-decisions.jpg",
    alt: "An analyst turning charts and printed reports into a decision",
    badge: "Signal → Decision",
    primaryCta: { label: "Explore Offerings", href: "#offerings" },
    secondaryCta: { label: "Schedule a Consultation", href: "#openlab" },
    stats: [
      { value: "4", label: "Offerings" },
      { value: "4–6 wks", label: "To Pilot" },
      { value: "100%", label: "Auditable" },
    ],
  },
  offerings: {
    eyebrow: "What we do",
    heading: "We provide solution offerings",
    aside: "Four capabilities that compound — each one usable alone, stronger together.",
    items: [
      {
        badge: "01 // Strategy",
        title: "Enterprise Intelligence Strategy",
        body: "Aligning data, AI, and people into one operating model — not a slide deck.",
        bullets: [
          "Operating-model design across data, AI, and teams",
          "Decision inventory and prioritization",
          "Frugal roadmap with measurable ROI gates",
        ],
        image: "/solutions/di-strategy.jpg",
        alt: "A red dart beside a torn paper label reading Target",
      },
      {
        badge: "02 // Analytics",
        title: "Cognitive Analytics & Decision Systems",
        body: "Analytics that explains *why*, and recommends *what's next*.",
        bullets: [
          "Causal drivers, not correlations",
          "Recommended next actions with confidence",
          "Outcome logging that improves each cycle",
        ],
        image: "/solutions/di-decisions.jpg",
        alt: "An analyst reviewing decision charts across a laptop and printed reports",
      },
      {
        badge: "03 // Foundations",
        title: "AI-Native Data Foundations",
        body: "Memory before models: governed, trusted, ready for scale.",
        bullets: [
          "Governed memory core inside your perimeter",
          "Lineage on every read and write",
          "Stack-agnostic — layers on what you run",
        ],
        image: "/solutions/di-foundations.jpg",
        alt: "Isometric illustration of governed data blocks on a network",
      },
      {
        badge: "04 // Platforms",
        title: "Enterprise AI Platforms & Agents",
        body: "Built once, reused everywhere — not reinvented per project.",
        bullets: [
          "Reusable agent mesh across business units",
          "Scoped permissions with replayable audit trails",
          "Second use case ships in a fraction of the time",
        ],
        image: "/solutions/di-platforms.jpg",
        alt: "A robotic hand cradling a glowing neural lattice",
      },
    ],
  },
  comparison: {
    eyebrow: "The Rebel Labz Advantage",
    heading: "Why choose us",
    aside: "See how Rebel Labz compares to traditional AI implementations.",
    columns: { feature: "Capability", traditional: "Traditional AI", rebel: "Rebel Labz" },
    rows: [
      { feature: "Output", traditional: "Static dashboards that stop at the chart", rebel: "Actionable decision systems that recommend the next move" },
      { feature: "Delivery model", traditional: "Disconnected pilots, one team at a time", rebel: "One integrated operating model across the enterprise" },
      { feature: "Reusability", traditional: "Rebuilt from scratch every project", rebel: "Reusable AI agents, built once and shared" },
      { feature: "Time to value", traditional: "Slow implementation, quarters before impact", rebel: "Working pilot in 4–6 weeks, measured against your outcome" },
      { feature: "Long-term cost", traditional: "High technical debt and rising compute spend", rebel: "Enterprise-ready scale, frugal by design" },
    ],
  },
  faq: {
    eyebrow: "Questions & Answers",
    heading: "Frequently asked questions",
    aside: "Still unclear on something? A human replies within 48 hours.",
    cta: { label: "Ask the lab", href: "/contact" },
    items: [
      { question: "How does Decision Intelligence differ from traditional Business Intelligence?", answer: "BI reports what happened; Decision Intelligence closes the loop. Our systems carry memory of prior decisions, explain why a pattern is occurring, recommend the next action, and record the outcome so the next recommendation is better than the last." },
      { question: "How long does it take to deploy an Enterprise AI Platform with Rebel Labz?", answer: "A working pilot on a real decision runs 4–6 weeks from kickoff. Production hardening typically follows within a quarter — and because the platform is reusable, the second and third use cases deploy in a fraction of the time." },
      { question: "How do you ensure data governance and memory management across models?", answer: "Memory before models. Every system deploys on a governed memory core inside your perimeter, with scoped agent permissions, full lineage on every read and write, and a replayable audit trail your risk team can inspect line by line." },
      { question: "Can Rebel Labz integrate with our existing enterprise data stack?", answer: "Yes — we are deliberately stack-agnostic. We connect to your existing warehouse, lakehouse, and operational systems rather than replacing them, so the memory core layers on top of what you already run." },
    ],
  },
  contact: {
    badge: "Lab Status: Open",
    title: "The most important",
    titleAccent: "conversations",
    lede: "Bring us the decision you're stuck on. We scope fast, ship a working pilot in weeks, and measure success against your outcome — not our hours.",
    note: "[ Lab Node: Online / Open to Collaboration ]",
    email: "amigo@rebel-labz.com",
  },
};

const arr = <T,>(v: unknown, d: T[]): T[] => (Array.isArray(v) ? (v as T[]) : d);

/**
 * The "Interested in" options on the enquiry form.
 *
 * Derived from the offering titles rather than authored separately, so the
 * dropdown can never drift out of step with what the page actually sells.
 */
export function interestsFor(content: SolutionPageContent): string[] {
  return [...content.offerings.items.map((o) => o.title), "Something else"];
}

/**
 * Fill in anything missing from a stored document, so copy saved before a
 * field existed cannot render as `undefined` on the live site.
 */
export function withSolutionDefaults(value: unknown): SolutionPageContent {
  const c = (value ?? {}) as Partial<SolutionPageContent>;
  const d = DEFAULT_SOLUTION_CONTENT;

  const layout = SOLUTION_LAYOUTS.some((l) => l.id === c.layout)
    ? (c.layout as SolutionLayoutId)
    : d.layout;

  return {
    layout,
    hero: {
      ...d.hero,
      ...c.hero,
      primaryCta: { ...d.hero.primaryCta, ...c.hero?.primaryCta },
      secondaryCta: { ...d.hero.secondaryCta, ...c.hero?.secondaryCta },
      // Fixed three-column strip: top up rather than leave a hole.
      stats: Array.from(
        { length: HERO_STAT_COUNT },
        (_, i) => arr(c.hero?.stats, d.hero.stats)[i] ?? d.hero.stats[i]
      ),
    },
    offerings: { ...d.offerings, ...c.offerings, items: arr(c.offerings?.items, d.offerings.items) },
    comparison: {
      ...d.comparison,
      ...c.comparison,
      columns: { ...d.comparison.columns, ...c.comparison?.columns },
      rows: arr(c.comparison?.rows, d.comparison.rows),
    },
    faq: {
      ...d.faq,
      ...c.faq,
      cta: { ...d.faq.cta, ...c.faq?.cta },
      items: arr(c.faq?.items, d.faq.items),
    },
    contact: { ...d.contact, ...c.contact },
  };
}
