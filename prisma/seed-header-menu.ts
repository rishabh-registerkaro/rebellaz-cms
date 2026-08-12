// Seeds the header menu singleton with the Rebel Labz navigation:
//
//   Solutions ▾            (a heading — opens on hover, not itself a link)
//     ├─ Agentic Automation
//     ├─ Decision Intelligence
//     └─ Applied Research
//   About Us
//   Careers
//   [ Collaborate with us ]
//
//   npx tsx prisma/seed-header-menu.ts
//
// Touches only the header singleton — prisma/seed-menus.ts still carries the
// forked project's navigation (/travel, /marketing, /education) and would
// overwrite the footer with routes this site does not have.
//
// Safe to re-run: it overwrites the header menu with the structure below, which
// is also editable click-by-click under Dashboard → Header Menu. Every child is
// resolved from a real page row, so a slug that has not been created yet is
// reported and skipped rather than published as a 404.

import { PrismaClient, Prisma } from "@prisma/client";
import { servicePageTitle, servicePageUrl } from "../app/lib/utils/servicePage";

const prisma = new PrismaClient();

/** Pages to list under Solutions, in the order they should appear. */
const SOLUTION_SLUGS = ["agentic-automation", "decision-intelligence", "applied-research"];

async function main() {
  const rows = await prisma.servicePage.findMany({
    where: { slug: { in: SOLUTION_SLUGS } },
    select: { id: true, slug: true, template: true, status: true, content: true },
  });

  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  const children = SOLUTION_SLUGS.flatMap((slug) => {
    const row = bySlug.get(slug);
    if (!row) {
      console.log(`  ! no page with slug "${slug}" — skipped`);
      return [];
    }
    const url = servicePageUrl(row.template, row.slug);
    if (!url) {
      console.log(`  ! "${slug}" is on template "${row.template}", which has no public URL — skipped`);
      return [];
    }
    if (row.status !== "published") {
      console.log(`  ! "${slug}" is a draft — linked anyway, but it 404s until published`);
    }
    return [
      {
        title: servicePageTitle(row.content, row.slug),
        url,
        page_id: row.id,
        source: "page",
        sub_child_menu: false,
      },
    ];
  });

  const mainMenu = [
    {
      title: "Solutions",
      // No URL by design: the header shows this label in the bar and opens the
      // children under it on hover. A parent's own href is never followed.
      url: "",
      source: "label",
      child_menu: children,
    },
    {
      title: "About Us",
      url: "/about",
      page_id: "static:about",
      source: "page",
      child_menu: false,
    },
    {
      title: "Careers",
      url: "/careers",
      page_id: "static:careers",
      source: "page",
      child_menu: false,
    },
  ];

  const contactDetails = { ctaText: "Collaborate with us", ctaUrl: "/contact" };

  const data = {
    mainMenu: mainMenu as unknown as Prisma.InputJsonValue,
    contactDetails: contactDetails as unknown as Prisma.InputJsonValue,
  };

  const existing = await prisma.headerMenu.findFirst();
  const header = existing
    ? await prisma.headerMenu.update({ where: { id: existing.id }, data })
    : await prisma.headerMenu.create({ data });

  console.log(
    `✔ header menu seeded — ${(header.mainMenu as unknown[]).length} top-level items, ` +
      `${children.length} under Solutions`
  );
  console.log("  Clear the frontend cache (Dashboard → Header Menu → Revalidate Cache) to see it.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
