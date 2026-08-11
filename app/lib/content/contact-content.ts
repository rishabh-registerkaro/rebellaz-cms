/**
 * Contact page content.
 *
 * This model previously described the contact page of the project this CMS was
 * forked from — a tabbed quote/inquiry card with document types ("Degree
 * Certificate", "PCC"), legalisation destinations, a WhatsApp hotline and an
 * office map embed. None of it existed on the Rebellabz contact page, so
 * an editor was given fields that changed nothing and none for the copy that
 * was actually on screen.
 *
 * The shape below mirrors the live page section by section: hero, the enquiry
 * form's surrounding copy, the 24/7 duty-desk panel, the FAQ and the closing
 * banner.
 */

export type ContactPageContent = {
  hero: {
    /** Green-dot pill, e.g. "Enquiry desk open now" */
    badge: string;
    /** Muted text after the badge, e.g. "· Tirunelveli, Tamil Nadu, India" */
    badgeSuffix: string;
    titleLead: string;
    /** Rendered in the orange gradient */
    titleAccent: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };

  /** Copy around the enquiry form. The fields themselves are fixed. */
  enquiry: {
    kicker: string;
    heading: string;
    intro: string;
    /** Label above the routing card, e.g. "This enquiry routes to" */
    routingLabel: string;
    deskName: string;
    /** Shown until a region is picked. */
    deskLocation: string;
    /** Options in the "Project region" select, in order. */
    regions: string[];
    consentText: string;
    submitLabel: string;
    /** Small print beside the submit button. */
    replyNote: string;
    successHeading: string;
    successText: string;
    successButton: string;
  };

  /** The dark 24/7 duty-desk band. */
  emergency: {
    badge: string;
    heading: string;
    body: string;
    phoneLabel: string;
    phoneNumber: string;
    emailLabel: string;
    emailAddress: string;
  };

  faq: {
    kicker: string;
    heading: string;
    intro: string;
    items: { q: string; a: string }[];
  };

  /** Closing banner above the footer. */
  cta: {
    heading: string;
    body: string;
    primaryLabel: string;
    secondaryLabel: string;
  };
};

/**
 * The live frontend copy — prefills the dashboard editor when the page has not
 * been created yet, so saving without editing changes nothing on the site.
 */
export function defaultContactContent(): ContactPageContent {
  return {
    hero: {
      badge: "Enquiry desk open now",
      badgeSuffix: "· Tirunelveli, Tamil Nadu, India",
      titleLead: "Tell us what the project needs —",
      titleAccent: "we'll crew it",
      subtitle:
        "Every enquiry reaches a named coordinator in the nearest hub, not a shared inbox. Crew requests are answered within four working hours; urgent rotation issues, in fifteen minutes.",
      ctaPrimary: "Request Technical Crew →",
      ctaSecondary: "Find Your Hub",
    },
    enquiry: {
      kicker: "Send an enquiry",
      heading: "One form. Straight to our desk.",
      intro:
        "Tell us the project region and scope, and our mobilization desk takes it from there — sourcing, vetting and travel handled end to end.",
      routingLabel: "This enquiry routes to",
      deskName: "Our mobilization desk",
      deskLocation: "Tirunelveli, Tamil Nadu, India",
      regions: [
        "Middle East & Africa",
        "Europe & North Sea",
        "Asia-Pacific",
        "The Americas",
        "India / domestic",
        "Multiple / global",
      ],
      consentText:
        "I agree that Rebellabz may store and process these details to respond to my enquiry.",
      submitLabel: "Send Enquiry →",
      replyNote: "Typical reply: under 4 working hours",
      successHeading: "Enquiry received",
      successText:
        "Your request is with our mobilization desk. We'll reply within four working hours.",
      successButton: "Send another enquiry",
    },
    emergency: {
      badge: "24/7 Duty Desk",
      heading: "Crew down at 3am? Call, don't email.",
      body: "Flight disruptions, medical evacuations, visa bottlenecks and weather stand-downs go straight to a named duty manager in the nearest hub — acknowledged within fifteen minutes, any hour of any day.",
      phoneLabel: "24/7 emergency line",
      phoneNumber: "+91 91766 74449",
      emailLabel: "Email us",
      emailAddress: "immanuel@rebel-labz.com",
    },
    faq: {
      kicker: "Before you write",
      heading: "Questions we get most often",
      intro:
        "Still unsure which desk you need? Send the enquiry anyway — we'll route it internally.",
      items: [
        {
          q: "How fast can you mobilize a crew?",
          a: "For disciplines where we hold pre-cleared standby pools, under 72 hours from instruction to on-site — medicals, certifications and travel included. Scarce or highly specialised roles typically run two to four weeks. Tell us the window in the form and we'll confirm what's realistic in the first reply.",
        },
        {
          q: "Do contractors pay any fees?",
          a: "Never. Contractors pay nothing for placement, visas or mobilization — our fee is invoiced to the operator. Anyone asking a worker for money is not us.",
        },
        {
          q: "Which regions and contract types do you cover?",
          a: "Rotational, contract, staff and project-hire crews across the Middle East & Africa, Europe & North Sea, Asia-Pacific and the Americas — oil & gas, renewables, marine and heavy infrastructure.",
        },
        {
          q: "What do you need from me to start?",
          a: "A rough scope is enough: role or discipline, headcount, region, rotation and start window. We'll come back with an indicative crew plan and rate band; contracts and compliance follow once you confirm.",
        },
        {
          q: "How are certifications verified?",
          a: "Every ticket — BOSIET, OPITO, GWO, MLC 2006 and discipline-specific credentials — is validated against the issuing body before mobilization, with medicals and right-to-work checks logged on file.",
        },
        {
          q: "Is my project information confidential?",
          a: "Yes. Enquiries are handled by a named coordinator under NDA by default, stored under GDPR-aligned controls, and never shared beyond the desk crewing your project.",
        },
      ],
    },
    cta: {
      heading: "Not sure where to start?",
      body: "Send the enquiry and we'll route it. Or read how we mobilize, vet and pay technical crews for energy projects worldwide.",
      primaryLabel: "Send an Enquiry →",
      secondaryLabel: "About Rebellabz",
    },
  };
}

export const CONTACT_META_DEFAULTS = {
  metaTitle: "Contact Us",
  metaDescription:
    "Tell us what the project needs and we'll crew it. Every enquiry reaches a named coordinator in the nearest hub — crew requests answered within four working hours, urgent rotation issues in fifteen minutes.",
};

/** Fill any missing key from the defaults, so a partial record still renders. */
export function withContactDefaults(raw: unknown): ContactPageContent {
  const d = defaultContactContent();
  if (!raw || typeof raw !== "object") return d;
  const c = raw as Partial<ContactPageContent>;
  return {
    hero: { ...d.hero, ...(c.hero ?? {}) },
    enquiry: {
      ...d.enquiry,
      ...(c.enquiry ?? {}),
      regions: Array.isArray(c.enquiry?.regions) && c.enquiry.regions.length > 0
        ? c.enquiry.regions
        : d.enquiry.regions,
    },
    emergency: { ...d.emergency, ...(c.emergency ?? {}) },
    faq: {
      ...d.faq,
      ...(c.faq ?? {}),
      items: Array.isArray(c.faq?.items) ? c.faq.items : d.faq.items,
    },
    cta: { ...d.cta, ...(c.cta ?? {}) },
  };
}
