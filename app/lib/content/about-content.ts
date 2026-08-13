/**
 * About page content — every section on /about.
 *
 * Section names mirror the frontend components one-for-one: hero →
 * <AboutHero>, story → <WhereWeAre>, values → <CoreValues>, stats →
 * <ImpactStats>, team → <FoundingTeam>, standards → <OperationalStandards>,
 * partners → <DesignPartners>, faq → <AboutFaq>, dualCta → <DualCta>.
 *
 * The page's dark/light rhythm is NOT stored here. Each component owns its own
 * tone — dark, light, dark, the red stats band, light, dark, light, dark,
 * light — so the rhythm holds however much copy a section carries, and an
 * editor cannot break it.
 *
 * The hero's orbit visual is also absent by design: it is an interactive canvas
 * with no authored content, only labels that belong to the animation itself.
 */

/** A card in the "where we are" strip. */
export type AboutStoryCard = {
  /** Small mono label above the title, e.g. "Already running". */
  stage: string;
  title: string;
  body: string;
};

/** A commitment card. `metric` is the mono line under the rule. */
export type AboutValue = {
  /** Short label after the index, e.g. "Transparency". */
  code: string;
  title: string;
  desc: string;
  metric: string;
};

export type AboutStat = { value: string; label: string };

export type AboutTeamMember = {
  name: string;
  role: string;
  bio: string;
  /**
   * Portrait from the Media Library. Optional: without one the card falls back
   * to an initials monogram, which is what the site shows today.
   */
  image?: string;
  alt?: string;
};

/** An operational standard. `code` is the mono label, e.g. "DATA_SOV". */
export type AboutBadge = { code: string; title: string; desc: string };

/** A design-partner offer. `note` is the mono line under the rule. */
export type AboutPartnerOffer = {
  code: string;
  title: string;
  body: string;
  note: string;
};

export type AboutFaqItem = { question: string; answer: string };

export type AboutPageContent = {
  hero: {
    /** Kicker above the title, e.g. "Founded 2025 · Year Two". */
    badge: string;
    title: string;
    lede: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string; href: string };
  };
  story: { eyebrow: string; heading: string; lede: string; cards: AboutStoryCard[] };
  values: { eyebrow: string; heading: string; items: AboutValue[] };
  stats: AboutStat[];
  team: { eyebrow: string; heading: string; members: AboutTeamMember[] };
  standards: { eyebrow: string; heading: string; body: string; items: AboutBadge[] };
  partners: {
    eyebrow: string;
    heading: string;
    aside: string;
    offers: AboutPartnerOffer[];
    cohort: { eyebrow: string; body: string; cta: { label: string; href: string } };
  };
  faq: { eyebrow: string; heading: string; items: AboutFaqItem[] };
  dualCta: {
    partners: { eyebrow: string; heading: string; body: string; cta: { label: string; href: string } };
    careers: { eyebrow: string; heading: string; body: string; cta: { label: string; href: string } };
  };
};

/** The stats band is a fixed four-column layout. */
export const STAT_COUNT = 4;

export const DEFAULT_ABOUT_CONTENT: AboutPageContent = {
  hero: {
    badge: "Founded 2025 · Year Two",
    title: "A new lab, built on an old idea",
    lede: "Rebel Labz is young on purpose. No legacy stack to defend, no decade of consulting habits to unlearn — just a small team building adaptive intelligence the way we believe it should have been built from the start.",
    primaryCta: { label: "See where we are", href: "#story" },
    secondaryCta: { label: "Partner With Us", href: "#cta" },
  },
  story: {
    eyebrow: "Where We Are",
    heading: "An honest map of where we are",
    lede: "Most labs open with a decade of logos. We would rather show you exactly where we are, what is already running, and what we are building next.",
    cards: [
      { stage: "Already Running", title: "The memory core", body: "Live in pilot with design partners across logistics, financial risk, and public research — small enough to run on modest hardware." },
      { stage: "In Build", title: "Adaptive reasoning", body: "Context-aware reasoning that keeps the cost-performance tradeoff honest as the problem shifts underneath it." },
      { stage: "Next", title: "Collective networks", body: "Open frameworks so knowledge compounds across organizations instead of dying inside one of them." },
    ],
  },
  values: {
    eyebrow: "What Drives Us",
    heading: "Four commitments, no exceptions",
    items: [
      { code: "01 // TRANSPARENCY", title: "Radical Transparency", desc: "Every decision path is open, logged, and replayable — no black boxes, ever.", metric: "100% auditable decisions" },
      { code: "02 // VELOCITY", title: "Speed Without Compromise", desc: "Pilots ship in weeks, not quarters — without cutting the constitution short.", metric: "4–6 weeks to pilot" },
      { code: "03 // CRAFT", title: "Engineering Perfection", desc: "Frugal, elegant systems over computational excess — measured, not assumed.", metric: "Runs on modest hardware" },
      { code: "04 // DISRUPTION", title: "Bold Disruption", desc: "We ship the uncomfortable idea if it is the right one — capability follows judgment.", metric: "6 design partners" },
    ],
  },
  stats: [
    { value: "6", label: "Design Partners" },
    { value: "4 wks", label: "Idea To Live Pilot" },
    { value: "9", label: "People In The Lab" },
    { value: "100%", label: "Constitution, Public" },
  ],
  team: {
    eyebrow: "The Founding Team",
    heading: "Small enough that you will know everyone",
    members: [
      { name: "Sana Rahal", role: "Founder / Research", bio: "Sets the research thesis and keeps the constitution honest." },
      { name: "Marcus Idoko", role: "Head of Engineering", bio: "Owns the memory core and reasoning-engine architecture." },
      { name: "Elin Vosskuhler", role: "Head of Deployment", bio: "Runs every pilot from scope to production, hands-on." },
      { name: "Tobias Nkemelu", role: "Head of Trust & Risk", bio: "Builds the audit trails clients bring to their own boards." },
    ],
  },
  standards: {
    eyebrow: "Operational Excellence",
    heading: "The standards we hold from day one",
    body: "We are new, so we wrote these down before our first deployment rather than after our first incident. Every system we ship is measured against them.",
    items: [
      { code: "DATA_SOV", title: "Data Sovereignty", desc: "Memory cores deploy inside your perimeter — your data never leaves." },
      { code: "ZERO_TRUST", title: "Zero-Trust Access", desc: "Every agent action is scoped, logged, and independently auditable." },
      { code: "OPEN_AUDIT", title: "Open Constitution Audit", desc: "Our own nine principles, checked against every shipped system." },
      { code: "FRUGAL_BM", title: "Frugal Compute Benchmark", desc: "Compute overhead measured and published — not just claimed." },
    ],
  },
  partners: {
    eyebrow: "Design Partners",
    heading: "We would rather earn it than claim it",
    aside: "No logo wall yet — we are early and our partners are still under NDA. Here is what we offer instead.",
    offers: [
      { code: "01 // Paid Pilot First", title: "Prove it on your problem", body: "A four-week paid pilot on a real decision in your operation. If it does not hold up, you keep the findings and we part as friends.", note: "No annual contract to start" },
      { code: "02 // Founder Access", title: "The people who build it", body: "There is no account layer between you and the engineers. Being small is the advantage we can offer that a large firm structurally cannot.", note: "Nine people, all reachable" },
      { code: "03 // Nothing Locked In", title: "Your data, your perimeter", body: "Memory cores run inside your infrastructure and the decision logic stays legible. If you ever leave us, the system does not leave with us.", note: "Open constitution, public" },
    ],
    cohort: {
      eyebrow: "Cohort Two · Now Open",
      body: "We take on a handful of design partners at a time, so the lab stays closer to the work than to the pipeline.",
      cta: { label: "Apply as a design partner", href: "" },
    },
  },
  faq: {
    eyebrow: "FAQ",
    heading: "Asked, answered",
    items: [
      { question: "You're a new lab. Why should we trust you with this?", answer: "You shouldn't — not on reputation, anyway. We are early, and we say so. What we offer instead is a published constitution to hold us to, a short paid pilot before any commitment, and systems small enough that you can audit them yourself rather than take our word for it." },
      { question: "Who do you work with?", answer: "Enterprises, financial institutions, health networks, and public research bodies — anyone with a real decision problem and the willingness to open their process to an audit trail. Right now we take on a small number of design partners at a time." },
      { question: "What's your methodology?", answer: "Discover, Architect, Pilot, Deploy, Evolve — five stages, four to six weeks to a working pilot, then a continuous feedback loop in production." },
      { question: "How global is the lab?", answer: "Remote-first by design — nine people working from wherever the problem is, with the core team in India and pilots running across timezones." },
    ],
  },
  dualCta: {
    partners: {
      eyebrow: "For Clients & Partners",
      heading: "Bring us a real problem",
      body: "We scope fast, ship a working pilot in weeks, and measure success against your outcome — not our hours.",
      cta: { label: "Partner With Us", href: "" },
    },
    careers: {
      eyebrow: "For Careers & Talent",
      heading: "Come build the constitution.",
      body: "Remote-first, open by design, measured on outcomes — {roles} open roles across research, engineering, and ops.",
      cta: { label: "Join the Lab", href: "/careers" },
    },
  },
};

const list = <T,>(value: unknown, fallback: T[]): T[] =>
  Array.isArray(value) ? (value as T[]) : fallback;

/**
 * Fill in anything missing from a stored document, so copy saved before a
 * field existed cannot render as `undefined` on the live site.
 *
 * Merged section by section: arrays are replaced wholesale, since merging them
 * element-wise would resurrect cards an editor deliberately deleted.
 */
export function withAboutDefaults(value: unknown): AboutPageContent {
  const c = (value ?? {}) as Partial<AboutPageContent>;
  const d = DEFAULT_ABOUT_CONTENT;

  return {
    hero: {
      ...d.hero,
      ...c.hero,
      primaryCta: { ...d.hero.primaryCta, ...c.hero?.primaryCta },
      secondaryCta: { ...d.hero.secondaryCta, ...c.hero?.secondaryCta },
    },
    story: { ...d.story, ...c.story, cards: list(c.story?.cards, d.story.cards) },
    values: { ...d.values, ...c.values, items: list(c.values?.items, d.values.items) },
    // Fixed four-column band: top up rather than leave a hole.
    stats: Array.from(
      { length: STAT_COUNT },
      (_, i) => list(c.stats, d.stats)[i] ?? d.stats[i]
    ),
    team: { ...d.team, ...c.team, members: list(c.team?.members, d.team.members) },
    standards: {
      ...d.standards,
      ...c.standards,
      items: list(c.standards?.items, d.standards.items),
    },
    partners: {
      ...d.partners,
      ...c.partners,
      offers: list(c.partners?.offers, d.partners.offers),
      cohort: {
        ...d.partners.cohort,
        ...c.partners?.cohort,
        cta: { ...d.partners.cohort.cta, ...c.partners?.cohort?.cta },
      },
    },
    faq: { ...d.faq, ...c.faq, items: list(c.faq?.items, d.faq.items) },
    dualCta: {
      partners: {
        ...d.dualCta.partners,
        ...c.dualCta?.partners,
        cta: { ...d.dualCta.partners.cta, ...c.dualCta?.partners?.cta },
      },
      careers: {
        ...d.dualCta.careers,
        ...c.dualCta?.careers,
        cta: { ...d.dualCta.careers.cta, ...c.dualCta?.careers?.cta },
      },
    },
  };
}

export const ABOUT_META_DEFAULTS = {
  metaTitle: "About Us · Rebellabz",
  metaDescription: "Rebel Labz is young on purpose. No legacy stack to defend, no decade of consulting habits to unlearn — just a small team building adaptive intelligence the way we believe it should have been built from the start.",
};
