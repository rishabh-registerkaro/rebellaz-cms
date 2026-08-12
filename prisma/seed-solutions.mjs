/**
 * Seeds the solution (pillar) pages under /solutions.
 *
 * Copy lives in ./solution-pages.json, lifted verbatim from the site's
 * lib/solutions.ts, so the public page renders identically once it reads from
 * the CMS instead.
 *
 * Idempotent — upserts by slug, so re-running refreshes the seeded copy without
 * creating duplicates.
 *
 * Run: node prisma/seed-solutions.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));
const PAGES = JSON.parse(readFileSync(join(here, "solution-pages.json"), "utf8"));

async function main() {
  const author =
    (await prisma.user.findFirst({ where: { role: { in: ["superadmin", "admin"] } } })) ??
    (await prisma.user.findFirst());
  if (!author) throw new Error("No CMS user exists to own the seeded pages — create one first.");

  for (const page of PAGES) {
    const data = {
      template: page.template,
      metaTitle: page.metaTitle,
      metaDescription: page.metaDescription,
      content: page.content,
      status: "published",
      authorId: author.id,
    };
    await prisma.servicePage.upsert({
      where: { slug: page.slug },
      update: data,
      create: { ...data, slug: page.slug },
    });
    console.log(`  ${page.template.padEnd(10)} /solutions/${page.slug}`);
  }
  console.log(`\nseeded ${PAGES.length} solution page(s), owned by ${author.username ?? author.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
