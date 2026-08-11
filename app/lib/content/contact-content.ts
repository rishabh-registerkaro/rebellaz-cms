/**
 * Contact page copy — the hero, the right-hand rail, the four-step strip and
 * the FAQ.
 *
 * The enquiry form itself is NOT here: its topics, timelines, fields and
 * validation are part of the site, and an editor changing a field label in the
 * CMS would silently break what the lead API expects to receive.
 *
 * Section names mirror the frontend components (hero → <ContactHero>, rail →
 * <ContactRail>, steps → <WhatHappensNext>, faq → <ContactFaq>).
 */

/** A number + caption pair, used in the hero strip and the rail. */
export type ContactStat = { value: string; label: string };

/** A label + value line under the location card. */
export type ContactRow = { label: string; value: string };

/** One card in the "what happens next" strip. */
export type ContactStep = {
  /** Small mono label above the title, e.g. "Step 01 · <48h". */
  ident: string;
  title: string;
  body: string;
};

export type ContactFaq = { question: string; answer: string };

export type ContactPageContent = {
  hero: {
    badge: string;
    title: string;
    /** Rendered in brand red immediately after the title. */
    titleAccent: string;
    lede: string;
    stats: ContactStat[];
  };
  rail: {
    /** "Reach the lab" card. Also the details used elsewhere on the site. */
    reach: {
      heading: string;
      email: string;
      phone: string;
      /** tel: link for the phone number above. */
      phoneHref: string;
      linkedin: string;
      linkedinHref: string;
    };
    /** "Join the lab" card. The role count is read from published roles. */
    join: { heading: string; href: string };
    eyebrow: string;
    stats: ContactStat[];
    location: {
      caption: string;
      title: string;
      body: string;
      rows: ContactRow[];
    };
  };
  steps: {
    eyebrow: string;
    heading: string;
    aside: string;
    items: ContactStep[];
  };
  faq: {
    eyebrow: string;
    heading: string;
    aside: string;
    items: ContactFaq[];
  };
};

/** The hero strip and the rail are fixed three-column layouts. */
export const HERO_STAT_COUNT = 3;
export const RAIL_STAT_COUNT = 3;
/** The step strip is a fixed four-column layout — more would not fit. */
export const STEP_COUNT = 4;
/** The location card shows exactly two rows. */
export const LOCATION_ROW_COUNT = 2;

export const DEFAULT_CONTACT_CONTENT: ContactPageContent = {
  hero: {
    badge: "Lab open · taking new problems",
    title: "Bring us a problem worth",
    titleAccent: "working on",
    lede: "The most important conversations shouldn't require a login. Tell us what you're trying to decide, build, or fix — a human replies within 48 hours.",
    stats: [
      { value: "< 48h", label: "First reply" },
      { value: "No", label: "Login required" },
      { value: "Human", label: "Reads every note" },
    ],
  },
  rail: {
    reach: {
      heading: "Reach the lab",
      email: "amigo@rebel-labz.com",
      phone: "+91-8828267791",
      phoneHref: "tel:+918828267791",
      linkedin: "linkedin.com/in/amigo-sharma",
      linkedinHref: "https://www.linkedin.com/in/amigo-sharma",
    },
    join: { heading: "Join the lab", href: "/careers" },
    eyebrow: "What you get from us",
    stats: [
      { value: "6", label: "Design partners" },
      { value: "4–6 wks", label: "To a working pilot" },
      { value: "100%", label: "Decisions auditable" },
    ],
    location: {
      caption: "Remote-first · No head office",
      title: "Where the lab works",
      body: "Remote-first out of India, working across timezones — we meet where your problem is.",
      rows: [
        { label: "Desk hours", value: "Mon–Fri · 09:00–18:00 IST" },
        { label: "First reply", value: "Within 48 hours" },
      ],
    },
  },
  steps: {
    eyebrow: "What happens next",
    heading: "From note to pilot in four steps",
    aside: "No procurement theater. Most collaborations reach a working pilot inside six weeks.",
    items: [
      { ident: "Step 01 · <48h", title: "We read and reply", body: "A researcher — not a rep — reads your note and answers with a real opinion." },
      { ident: "Step 02 · Week 1", title: "One working call", body: "Sixty minutes on the actual problem, with the people who'd build it." },
      { ident: "Step 03 · Week 2", title: "Scoped proposal", body: "Outcome, timeline, and price on one page — measured against your metric." },
      { ident: "Step 04 · Week 4–6", title: "Working pilot", body: "A real system in your environment, not a slide deck about one." },
    ],
  },
  faq: {
    eyebrow: "Before you reach out",
    heading: "Quick answers",
    aside: "Something not covered? Put it in the form — odd questions are our favourite kind.",
    items: [
      { question: "Do we need an AI strategy before contacting you?", answer: "No. Most partners come with a business problem, not a technology plan — the strategy work is part of what we do together in the first two weeks." },
      { question: "How small can a first engagement be?", answer: "One decision, one workflow. We deliberately keep first pilots small and frugal so the value is visible before anyone commits to scale." },
      { question: "Will our data leave our environment?", answer: "No. Memory cores deploy inside your perimeter, and every agent action is scoped, logged, and replayable by your own team." },
      { question: "Do you work with universities and non-profits?", answer: "Yes — open research, citizen science, and public-interest work is part of the constitution. Rates and structure differ from commercial engagements." },
      { question: "What if you are not the right lab for it?", answer: "We'll say so in the first reply and, where we can, point you to a team that fits better. A fast no is more useful than a slow maybe." },
    ],
  },
};

const str = (v: unknown, fallback: string) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s || fallback;
};

/**
 * Take a fixed-length list up to `count`, topping up from the defaults.
 *
 * These strips are fixed-column layouts, so a short list would leave a visible
 * hole and a long one would overflow the row.
 */
function fixedList<T>(value: unknown, count: number, defaults: T[]): T[] {
  const supplied = Array.isArray(value) ? (value as T[]) : [];
  return Array.from({ length: count }, (_, i) => supplied[i] ?? defaults[i]);
}

const cleanFaqs = (v: unknown, d: ContactFaq[]): ContactFaq[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is ContactFaq => !!x && typeof x === "object")
        .map((x) => ({
          question: String(x.question ?? "").trim(),
          answer: String(x.answer ?? "").trim(),
        }))
        .filter((x) => x.question)
    : d;

/**
 * Fill in anything missing from a stored document, so copy saved before a
 * field existed cannot render as `undefined` on the live site.
 */
export function withContactDefaults(value: unknown): ContactPageContent {
  const c = (value ?? {}) as Partial<ContactPageContent>;
  const d = DEFAULT_CONTACT_CONTENT;

  return {
    hero: {
      ...d.hero,
      ...c.hero,
      stats: fixedList(c.hero?.stats, HERO_STAT_COUNT, d.hero.stats),
    },
    rail: {
      ...d.rail,
      ...c.rail,
      reach: { ...d.rail.reach, ...c.rail?.reach },
      join: { ...d.rail.join, ...c.rail?.join },
      stats: fixedList(c.rail?.stats, RAIL_STAT_COUNT, d.rail.stats),
      location: {
        ...d.rail.location,
        ...c.rail?.location,
        rows: fixedList(c.rail?.location?.rows, LOCATION_ROW_COUNT, d.rail.location.rows),
      },
    },
    steps: {
      ...d.steps,
      ...c.steps,
      // Capped at four: the strip is a four-column grid.
      items: fixedList(c.steps?.items, STEP_COUNT, d.steps.items),
    },
    faq: {
      ...d.faq,
      ...c.faq,
      items: Array.isArray(c.faq?.items) ? cleanFaqs(c.faq.items, d.faq.items) : d.faq.items,
    },
  };
}

export const CONTACT_META_DEFAULTS = {
  metaTitle: str(undefined, "Contact · Rebellabz"),
  metaDescription: str(undefined, "The most important conversations shouldn't require a login. Tell us what you're trying to decide, build, or fix — a human replies within 48 hours."),
};
