/**
 * Backfill "What we offer" onto roles that have none.
 *
 * The section used to be a hardcoded list on the frontend, shared by every
 * role. It is now per-role CMS content, so without this the section would
 * simply vanish from the eight existing roles the moment the site started
 * reading it from the database.
 *
 * Only fills roles whose `perks` is empty — a role edited in the dashboard is
 * left alone, so this is safe to re-run.
 *
 * Run: node prisma/backfill-perks.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const here = dirname(fileURLToPath(import.meta.url));

const PERKS = JSON.parse(readFileSync(join(here, "rebellabz-perks.json"), "utf8"));

async function main() {
  const careers = await prisma.career.findMany({ select: { id: true, title: true, perks: true } });

  let filled = 0;
  let skipped = 0;

  for (const career of careers) {
    const existing = Array.isArray(career.perks) ? career.perks : [];
    if (existing.length) {
      skipped += 1;
      console.log(`  skip (${existing.length} already set)  ${career.title}`);
      continue;
    }
    await prisma.career.update({ where: { id: career.id }, data: { perks: PERKS } });
    filled += 1;
    console.log(`  filled ${PERKS.length} offers          ${career.title}`);
  }

  console.log(`\nfilled ${filled}, left alone ${skipped}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
