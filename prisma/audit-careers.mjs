/**
 * Read-only audit of the careers table: what each role actually stores versus
 * what the CMS form can show and what the public page renders.
 *
 * Run: node prisma/audit-careers.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const len = (v) => (Array.isArray(v) ? v.length : 0);

async function main() {
  const careers = await prisma.career.findMany({
    orderBy: { publishedAt: "desc" },
  });

  console.log(`careers: ${careers.length}\n`);
  console.log(
    "status".padEnd(10) +
      "type".padEnd(12) +
      "duration".padEnd(11) +
      "unit".padEnd(8) +
      "desc".padEnd(7) +
      "resp".padEnd(6) +
      "req".padEnd(6) +
      "title"
  );
  console.log("-".repeat(110));

  for (const c of careers) {
    const desc = (c.description ?? "").trim();
    console.log(
      c.status.padEnd(10) +
        String(c.type).padEnd(12) +
        JSON.stringify(c.duration ?? "").padEnd(11) +
        String(c.unit).padEnd(8) +
        (desc ? `${desc.length}b` : "EMPTY").padEnd(7) +
        String(len(c.responsibilities)).padEnd(6) +
        String(len(c.requirements)).padEnd(6) +
        c.title
    );
  }

  // The specific mismatch: content the site renders that the CMS form cannot.
  const orphaned = careers.filter(
    (c) => !(c.description ?? "").trim() && (len(c.responsibilities) || len(c.requirements))
  );
  // Durations left on types that no longer collect one.
  const staleDuration = careers.filter(
    (c) => !["Contract", "Residency"].includes(c.type) && (c.duration ?? "").trim()
  );

  console.log("\n── findings ──");
  console.log(
    `roles whose body lives ONLY in resp/req columns (invisible + uneditable in the CMS form): ${orphaned.length}`
  );
  orphaned.forEach((c) => console.log(`   - ${c.title}`));
  console.log(`roles carrying a duration their type does not use: ${staleDuration.length}`);
  staleDuration.forEach((c) => console.log(`   - ${c.title} → duration ${JSON.stringify(c.duration)}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
