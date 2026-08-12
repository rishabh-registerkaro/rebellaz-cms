// Seeds the footer menu singleton with the Rebel Labz footer:
//
//   SOLUTIONS            RESOURCES        ORGANIZATION
//     Agentic Automation   FAQ              About Us
//     Decision Intelligence                 Careers
//     Applied Research                      Contact Us
//
//   amigo@rebel-labz.com · +91-8828267791 · linkedin.com/in/amigo-sharma
//
//   npx tsx prisma/seed-footer-menu.ts
//
// Companion to seed-header-menu.ts, and deliberately separate from
// prisma/seed-menus.ts — that one carries the forked project's navigation
// (/travel, /marketing, /education) and would overwrite this with routes the
// site does not have.
//
// Safe to re-run: it overwrites the footer singleton with the structure below,
// which is also editable under Dashboard → Footer Menu. Solution links are
// resolved from real page rows, so a slug that has not been created yet is
// reported and skipped rather than published as a 404.

import { PrismaClient, Prisma } from "@prisma/client";
import { servicePageTitle, servicePageUrl } from "../app/lib/utils/servicePage";

const prisma = new PrismaClient();

/** Pages to list under Solutions, in the order they should appear. */
const SOLUTION_SLUGS = ["agentic-automation", "decision-intelligence", "applied-research"];

/**
 * The contact block. A list rather than fixed fields, so a second address or a
 * third social account is a content change: add a row here, or in the
 * dashboard, and the footer renders it.
 *
 * `email` and `phone` need no url — the frontend derives mailto:/tel: from the
 * value. `social` and `link` need one, since a handle is not a URL.
 */
const CONTACT_DETAILS = [
  { title: "Email", type: "email", value: "amigo@rebel-labz.com", sub_child: false, has_sub_child: false },
  { title: "Phone", type: "phone", value: "+91-8828267791", sub_child: false, has_sub_child: false },
  {
    title: "LinkedIn",
    type: "social",
    value: "linkedin.com/in/amigo-sharma",
    url: "https://www.linkedin.com/in/amigo-sharma",
    sub_child: false,
    has_sub_child: false,
  },
];

async function main() {
  const pages = await prisma.servicePage.findMany({
    where: { slug: { in: SOLUTION_SLUGS }, status: "published" },
    select: { id: true, slug: true, template: true, content: true },
  });
  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const pageIds = new Map(pages.map((p) => [p.slug, p.id]));

  const solutionLinks = SOLUTION_SLUGS.flatMap((slug) => {
    const page = bySlug.get(slug);
    if (!page) {
      console.warn(`  skipped "${slug}" — no published page with that slug`);
      return [];
    }
    const url = servicePageUrl(page.template, page.slug);
    if (!url) {
      console.warn(`  skipped "${slug}" — its template renders no public URL`);
      return [];
    }
    // `sub_child_menu: false` is not optional decoration — the dashboard's
    // menu levels are stored as "an array, or false when empty", and a child
    // written without the key crashed the editor on load.
    // page_id + source attach the entry to a real row, so the editor opens it
    // showing the page it points at rather than a bare URL it cannot verify.
    return [
      {
        title: servicePageTitle(page.content, page.slug),
        url,
        page_id: pageIds.get(page.slug) ?? null,
        source: "page",
        sub_child_menu: false,
      },
    ];
  });

  const mainMenu = [
    // Column headings are labels, not links — `source: "label"` is what tells
    // the editor that, rather than it looking like a link someone forgot.
    { title: "Solutions", url: "", source: "label", child_menu: solutionLinks },
    {
      title: "Resources",
      url: "",
      source: "label",
      // Blog and Whitepapers return once /resources/* exists.
      child_menu: [
        // An anchor on a page, not a page — the picker's custom-link escape hatch.
        {
          title: "FAQ",
          url: "/solutions/decision-intelligence#faq",
          source: "custom",
          sub_child_menu: false,
        },
      ],
    },
    {
      title: "Organization",
      url: "",
      source: "label",
      child_menu: [
        { title: "About Us", url: "/about", page_id: "static:about", source: "page", sub_child_menu: false },
        { title: "Careers", url: "/careers", page_id: "static:careers", source: "page", sub_child_menu: false },
        { title: "Contact Us", url: "/contact", page_id: "static:contact", source: "page", sub_child_menu: false },
      ],
    },
  ];

  const existing = await prisma.footerMenu.findFirst();
  const data = {
    mainMenu: mainMenu as unknown as Prisma.InputJsonValue,
    contactDetails: CONTACT_DETAILS as unknown as Prisma.InputJsonValue,
  };

  if (existing) {
    await prisma.footerMenu.update({ where: { id: existing.id }, data });
  } else {
    await prisma.footerMenu.create({ data });
  }

  console.log(`footer menu seeded — ${mainMenu.length} columns:`);
  mainMenu.forEach((c) =>
    console.log(`  ${c.title}: ${c.child_menu.map((l) => l.title).join(", ") || "(empty)"}`)
  );
  console.log(`contact lines: ${CONTACT_DETAILS.map((c) => c.value).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
