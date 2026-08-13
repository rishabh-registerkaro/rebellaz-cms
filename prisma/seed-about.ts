// Seeds the About page singleton with the copy the site ships with.
//
//   npx tsx prisma/seed-about.ts
//
// Idempotent: overwrites the singleton with DEFAULT_ABOUT_CONTENT, which is
// also editable section-by-section under Dashboard → About Us. Safe to re-run,
// but it DOES discard dashboard edits — it is a setup aid, not a scheduled job.

import { PrismaClient, Prisma } from "@prisma/client";
import {
  DEFAULT_ABOUT_CONTENT,
  ABOUT_META_DEFAULTS,
} from "../app/lib/content/about-content";

const prisma = new PrismaClient();

async function main() {
  const data = {
    metaTitle: ABOUT_META_DEFAULTS.metaTitle,
    metaDescription: ABOUT_META_DEFAULTS.metaDescription,
    content: DEFAULT_ABOUT_CONTENT as unknown as Prisma.InputJsonValue,
  };

  const existing = await prisma.aboutPage.findFirst();
  if (existing) {
    await prisma.aboutPage.update({ where: { id: existing.id }, data });
  } else {
    await prisma.aboutPage.create({ data });
  }

  const c = DEFAULT_ABOUT_CONTENT;
  console.log("About page seeded:");
  console.log(`  hero       ${c.hero.title}`);
  console.log(`  story      ${c.story.cards.length} cards`);
  console.log(`  values     ${c.values.items.length} commitments`);
  console.log(`  stats      ${c.stats.length}`);
  console.log(`  team       ${c.team.members.length} members`);
  console.log(`  standards  ${c.standards.items.length}`);
  console.log(`  partners   ${c.partners.offers.length} offers`);
  console.log(`  faq        ${c.faq.items.length} questions`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
