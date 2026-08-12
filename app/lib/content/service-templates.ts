// Ready-made page templates offered when creating a service page.
//
// This file previously carried four templates — Travel & Tourism, AI &
// Technology, Education & Career, Marketing & AI — inherited from the project
// this CMS was forked from. They described /travel, /technology, /education
// and /marketing pages that do not exist on the Rebellabz site, so
// picking one produced a page the frontend could not render. The old brand
// name had been find-replaced throughout, which made them look legitimate.
//
// Rebellabz has one service layout ("division"), rendered by the
// frontend's app/(rebel)/solutions/[slug]/page.tsx — one route serves both
// templates, and there is no /services/[slug]. That page finds each block by the
// section's `id`, so the template below scaffolds exactly the ids it expects.
// Starting from it is the reliable way to add a service page: the structure is
// already correct and only the copy needs changing.

import {
  emptyServicePageContent,
  type ServicePageContent,
} from "./service-content";

export type ServiceTemplateDef = {
  key: string;
  name: string;
  description: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  content: ServicePageContent;
};

/**
 * The live Contract Manpower Supply page.
 *
 * Section ids are a contract with the frontend — renaming one, or changing a
 * section's kind, makes that block disappear from the site. The ids are listed
 * in rebellabz/app/services/service-api.ts (SECTION_IDS).
 */
const contractManpowerSupply: ServicePageContent = {
  breadcrumb: [
    { label: "Managed Solutions" },
    { label: "Contract Manpower Supply" },
  ],
  badge: "Contract Manpower Supply",
  titleLead: "Engineered workforce solutions for the",
  titleAccent: "energy sector",
  subtitle:
    "We deploy highly technical, compliant and vetted engineering talent across upstream, downstream and renewable projects — with rotation, payroll and mobilization handled end to end.",
  sections: [
    {
      kind: "chips",
      id: "hero-badges",
      label: "Hero trust badges",
      heading: "Trust badges",
      chips: [
        "Vetted technical crews",
        "Compliance-first",
        "Single global contract",
      ],
    },
    {
      kind: "cards",
      id: "disciplines",
      label: "At a glance",
      heading: "Disciplines & workforce types we supply",
      intro:
        "Pre-vetted talent pools across every technical niche the energy sector demands — ready to mobilize on your timeline.",
      cards: [
        {
          title: "Contract Staffing",
          points: [
            "EPC managers, discipline engineers and commissioning leads for megaprojects.",
          ],
        },
        {
          title: "Employer of Record (EOR)",
          points: [
            "DP operators, ROV pilots, toolpushers and subsea engineering crews.",
          ],
        },
        {
          title: "Global Mobility & Logistics",
          points: [
            "Safety officers, QA/QC inspectors and incident-free site governance.",
          ],
        },
        {
          title: "Permanent Direct Hire",
          points: [
            "GWO-certified wind techs, solar EPC crews and grid integration teams.",
          ],
        },
        {
          title: "Executive Search",
          points: [
            "Country managers, asset directors and scarce senior technical leadership.",
          ],
        },
        {
          title: "Managed Service Provision (MSP)",
          points: [
            "Compliant local-entity payroll, visas and end-to-end travel logistics.",
          ],
        },
      ],
    },
    {
      // Renders as the four figures in the band under the disciplines grid.
      kind: "intro",
      id: "disciplines-stats",
      label: "Disciplines stat band",
      heading: "At a glance",
      paragraphs: [],
      stats: [
        { value: "Fast", label: "Vetted shortlist" },
        { value: "Global", label: "Deployment reach" },
        { value: "24/7", label: "Rotation support" },
        { value: "0 fees", label: "Contractors never pay" },
      ],
    },
    {
      // The FIRST note is the card's own heading; the rest are its rows.
      kind: "notes",
      id: "value-old-way",
      label: "The Value Switch",
      heading: "Why operators choose us over the old way",
      intro:
        "Traditional agencies run on manual processes and hidden risk. We run the same workflow on a tech-driven, single-contract model.",
      notes: [
        { title: "Traditional Agencies", body: "The old way" },
        {
          title: "3-week screening times",
          body: "Manual CV trawling and slow reference loops.",
        },
        {
          title: "Hidden compliance risk",
          body: "Co-employment exposure and unclear liability.",
        },
        {
          title: "Slow visa & mobility",
          body: "Fragmented third-party mobilization handoffs.",
        },
        {
          title: "Zero real-time visibility",
          body: "Email threads instead of a live status desk.",
        },
      ],
    },
    {
      kind: "notes",
      id: "value-our-way",
      label: "The Value Switch",
      heading: "Our way",
      notes: [
        { title: "Rebellabz", body: "Our way" },
        {
          title: "72-hour vetted shortlist",
          body: "Pre-screened talent pools, ready to deploy.",
        },
        {
          title: "100% compliant local payroll",
          body: "Owned legal entities in 80+ regions.",
        },
        {
          title: "End-to-end mobilization tracking",
          body: "One desk owns visas, medicals and travel.",
        },
        {
          title: "Live status desk",
          body: "Real-time visibility from requisition to rig.",
        },
      ],
    },
    {
      // `day` carries the small orange caption above each step title.
      kind: "steps",
      id: "lifecycle",
      label: "Mobilization Lifecycle",
      heading: "From requisition to rig, managed end to end",
      intro:
        "Supplying manpower isn't just the résumé — it's getting the right person to an offshore rig or remote solar farm, safely and legally.",
      steps: [
        {
          day: "Source & Vet",
          title: "Talent Pooling",
          text: "Rigorous technical testing, ticket validation and background checks against discipline standards.",
        },
        {
          day: "Comply & Mobilize",
          title: "Mobilisation",
          text: "Visas, local tax compliance, medical clearances and right-to-work confirmation.",
        },
        {
          day: "Deploy & Manage",
          title: "Compliant Payroll",
          text: "On-site onboarding, HSE briefings and fully compliant local-entity payroll management.",
        },
        {
          day: "Rotate & Retain",
          title: "Consolidation",
          text: "Smooth rotation logistics, continuity planning and long-term workforce retention.",
        },
      ],
    },
    {
      kind: "chips",
      id: "risk-badges",
      label: "Accreditations",
      heading: "Accreditations",
      chips: ["ISO 9001", "OPITO", "GWO", "MLC 2006"],
    },
    {
      kind: "notes",
      id: "risk-guarantees",
      label: "Risk Mitigation",
      heading: "Compliance is the dealbreaker. We own it.",
      intro:
        "Tax exposure, missing insurance and visa violations end projects. Every contractor we place is covered, compliant and accounted for — under one global contract.",
      notes: [
        {
          title: "Local Content Compliance",
          body: "Full adherence to domestic employment, tax and social security law in 80+ regions.",
        },
        {
          title: "Global Insurance Cover",
          body: "Every contractor fully insured — Professional Indemnity & Public Liability.",
        },
        {
          title: "Tax & Payroll Security",
          body: "Guaranteed compliant payroll that eliminates co-employment risk for your business.",
        },
        {
          title: "HSE Governance",
          body: "Mandatory alignment with international HSSE standards and continuous incident reporting.",
        },
      ],
    },
    {
      kind: "faq",
      id: "faq",
      label: "Common Questions",
      heading: "Answers before you brief us",
      intro:
        "Still need specifics? Our mobilization desk responds with an indicative crew plan within one business day.",
      faqs: [
        {
          q: "How fast can you mobilize a crew?",
          a: "For pre-vetted disciplines we return an indicative, compliance-checked shortlist within 72 hours. Full mobilization — visas, medicals, travel and onboarding — typically completes in 2–4 weeks depending on jurisdiction.",
        },
        {
          q: "Who is the legal employer of the contractors?",
          a: "We are. Through our owned local entities in 80+ regions, Rebellabz acts as the legal employer of record — carrying tax, statutory and co-employment liability so your business never does.",
        },
        {
          q: "What disciplines and certifications do you cover?",
          a: "Every technical niche the energy sector demands — from DP operators, ROV pilots and subsea welders to commissioning leads, HSE managers and wind techs — validated against OPITO, GWO, BOSIET and MLC 2006 standards.",
        },
        {
          q: "How is compliance and insurance handled?",
          a: "Under one global contract. Every contractor is fully insured for Professional Indemnity and Public Liability, payrolled through compliant local entities, and covered by international HSSE governance — all fully auditable.",
        },
        {
          q: "Can you manage rotations and replacements?",
          a: "Yes. We own the full rotation lifecycle — crew-change scheduling, travel and continuity planning — and guarantee vetted replacements from the same pre-screened pool if a rotation slips.",
        },
      ],
    },
  ],
};

export const SERVICE_TEMPLATES: ServiceTemplateDef[] = [
  {
    key: "contract-manpower-supply",
    name: "Service page (standard layout)",
    description:
      "Every section the site renders, pre-filled with the live Contract Manpower Supply copy. Replace the wording, but keep each section's id.",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    content: contractManpowerSupply,
  },
  {
    key: "blank",
    name: "Blank page",
    description:
      "Empty. Only for starting over — sections you add must use the ids the site expects, or they will not render.",
    slug: "",
    metaTitle: "",
    metaDescription: "",
    content: emptyServicePageContent(),
  },
];
