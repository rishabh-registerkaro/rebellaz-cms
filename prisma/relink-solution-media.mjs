/**
 * Repoints solution page images at the Media Library.
 *
 * Seeded pages carry frontend paths like "/solutions/di-strategy.jpg", which
 * only resolve because that file happens to sit in the site's public/ folder.
 * Every asset should be CMS-hosted instead, so this rewrites each image to the
 * matching Media Library URL.
 *
 * Matching is by the library entry's ORIGINAL filename, not its stored key —
 * uploads are prefixed with a timestamp, so "di-strategy.jpg" is stored as
 * "1786511461462_di-strategy.jpg".
 *
 * An image with no match in the library is left untouched and reported, rather
 * than blanked.
 *
 * Run: node prisma/relink-solution-media.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Frontend filename -> Media Library filename.
 *
 * Mostly identity; the platforms card is mapped explicitly because the image
 * uploaded for it carries a different name.
 */
const ALIASES = {
  "di-platforms.jpg": "memory-intelligence.jpg",
};

const basename = (p) => String(p ?? "").split("/").pop() ?? "";

async function main() {
  const assets = await prisma.mediaAsset.findMany({ select: { filename: true, url: true } });
  const byName = new Map(assets.map((a) => [a.filename, a.url]));

  const resolve = (current) => {
    if (/^https?:\/\//i.test(current)) return null; // already a CMS URL
    const name = basename(current);
    const target = ALIASES[name] ?? name;
    return byName.get(target) ?? null;
  };

  const pages = await prisma.servicePage.findMany({ where: { template: "solution" } });
  const missing = [];

  for (const page of pages) {
    const content = page.content;
    let changed = 0;

    const heroUrl = resolve(content.hero?.image);
    if (heroUrl) {
      content.hero.image = heroUrl;
      changed += 1;
    } else if (content.hero?.image && !/^https?:/i.test(content.hero.image)) {
      missing.push(`${page.slug} hero -> ${basename(content.hero.image)}`);
    }

    for (const item of content.offerings?.items ?? []) {
      const url = resolve(item.image);
      if (url) {
        item.image = url;
        changed += 1;
      } else if (item.image && !/^https?:/i.test(item.image)) {
        missing.push(`${page.slug} "${item.title}" -> ${basename(item.image)}`);
      }
    }

    if (changed) {
      await prisma.servicePage.update({ where: { id: page.id }, data: { content } });
    }
    console.log(`  ${page.slug}: ${changed} image(s) repointed at the Media Library`);
  }

  if (missing.length) {
    console.log(`\nnot found in the Media Library (left as-is):`);
    missing.forEach((m) => console.log(`  - ${m}`));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
