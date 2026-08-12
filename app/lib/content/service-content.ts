// Shared content model for service/division pages.
//
// This mirrors the frontend's `ServiceConfig` type
// (Rebellabz/app/components/divisions/servicelayout/types.ts) with one
// difference: icons are stored as string names (e.g. "Plane") instead of React
// components, so the whole page can live in a single JSON column. The frontend
// resolves names back to components via its divisions/icons exports.
//
// Adding a new field or a new section kind here requires NO database
// migration — the page is stored as one `content` Json document.

// Icon names exported by Rebellabz/app/components/divisions/icons.tsx



export type Breadcrumb = { label: string; href?: string };

type SectionBase = {
  /** Anchor id used for in-page links / table of contents */
  id: string;
  /** Label shown in the sticky table of contents */
  label: string;
  /** Heading rendered at the top of the section */
  heading: string;
  /**
   * Optional supporting image, uploaded to the Media Library.
   *
   * Rendered beside the section's copy on desktop and stacked above it on
   * mobile. Omitted entirely when blank, so a text-only section keeps the full
   * measure rather than leaving a gap.
   */
  image?: string;
  /** Alt text. Empty means decorative, which is the right default for a photo
   * that only repeats what the heading already says. */
  alt?: string;
};

export type IntroSection = SectionBase & {
  kind: "intro";
  paragraphs: string[];
  stats?: { value: string; label: string }[];
};

export type CardsSection = SectionBase & {
  kind: "cards";
  intro?: string;
  cards: { title: string; points: string[]; image?: string; alt?: string }[];
};

export type ChipsSection = SectionBase & {
  kind: "chips";
  intro?: string;
  chips: string[];
  note?: string;
};

export type StepsSection = SectionBase & {
  kind: "steps";
  intro?: string;
  // day/details/note are optional extras used by detail-style pages
  // (e.g. the apostille service) — division pages use only title + text.
  steps: {
    title: string;
    text: string;
    day?: string;
    details?: string[];
    note?: string;
  }[];
};

export type ChecklistSection = SectionBase & {
  kind: "checklist";
  intro?: string;
  items: string[];
};

export type FaqSection = SectionBase & {
  kind: "faq";
  intro?: string;
  faqs: { q: string; a: string }[];
};

export type TableSection = SectionBase & {
  kind: "table";
  intro?: string;
  columns: string[];
  rows: string[][];
};

export type NotesSection = SectionBase & {
  kind: "notes";
  intro?: string;
  notes: { title: string; body: string }[];
};

export type Section =
  | IntroSection
  | CardsSection
  | ChipsSection
  | StepsSection
  | ChecklistSection
  | FaqSection
  | TableSection
  | NotesSection;

export type SectionKind = Section["kind"];

/**
 * The full page document stored in `service_pages.content`.
 * Field-for-field compatible with the frontend `ServiceConfig` (icons as
 * strings). `sections` is an ordered list — add / remove / reorder freely.
 */
/**
 * A service page.
 *
 * Trimmed to what the site actually renders. The forked project's service
 * pages carried an enquiry form in the hero (formTitle, formSubtitle,
 * formCountries, formCountryLabel, helpPhone), a row of icon chips, and an
 * icon on the badge, every card, every chip group and every stat. This site's
 * service page has two buttons in the hero and renders no icons at all, so
 * those fields only gave editors things to fill in that changed nothing.
 */
export type ServicePageContent = {
  breadcrumb: Breadcrumb[];
  badge: string;
  titleLead: string;
  titleAccent: string;
  subtitle: string;
  /**
   * Optional hero image. With one, the hero becomes a two-column layout on
   * desktop and stacks on mobile; without one it stays full-width text, which
   * is why it is optional rather than a required field with a placeholder.
   */
  heroImage?: string;
  heroAlt?: string;
  /** Mono caption across the top of the hero visual. */
  heroCaption?: string;
  sections: Section[];
};

export const SECTION_KIND_LABELS: Record<SectionKind, string> = {
  intro: "Intro (paragraphs + stats)",
  cards: "Cards (icon + title + points)",
  chips: "Chips (tag list)",
  steps: "Steps (how it works)",
  checklist: "Checklist (why choose us)",
  faq: "FAQs",
  table: "Table (columns + rows)",
  notes: "Notes (title + body blocks)",
};

/** Blank section of the given kind, used by the admin "Add section" button. */
export function createSection(kind: SectionKind): Section {
  const base = { id: "", label: "", heading: "" };
  switch (kind) {
    case "intro":
      return { ...base, kind, paragraphs: [""], stats: [] };
    case "cards":
      return { ...base, kind, intro: "", cards: [] };
    case "chips":
      return { ...base, kind, intro: "", chips: [], note: "" };
    case "steps":
      return { ...base, kind, intro: "", steps: [] };
    case "checklist":
      return { ...base, kind, intro: "", items: [] };
    case "faq":
      return { ...base, kind, intro: "", faqs: [] };
    case "table":
      return { ...base, kind, intro: "", columns: [""], rows: [] };
    case "notes":
      return { ...base, kind, intro: "", notes: [] };
  }
}

export function emptyServicePageContent(): ServicePageContent {
  return {
    breadcrumb: [{ label: "Home", href: "/" }, { label: "" }],
    badge: "",
    titleLead: "",
    titleAccent: "",
    subtitle: "",
    sections: [],
  };
}
