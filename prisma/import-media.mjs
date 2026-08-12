/**
 * Uploads local image files into the Hostinger media folder and registers them
 * in the Media Library, so every asset the site renders is CMS-managed rather
 * than a file baked into the frontend's public/ directory.
 *
 * Idempotent: a file whose sanitised name is already registered is skipped, so
 * re-running will not create duplicates on the server or in the database.
 *
 * Usage: node prisma/import-media.mjs <file-or-directory> [...]
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import * as ftp from "basic-ftp";
import { Readable } from "node:stream";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

/** Mirrors sanitizeFilename() in app/api/media/route.ts. */
const sanitize = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

/** basic-ftp wants a bare host — strip any scheme or path that crept in. */
function ftpHost() {
  const raw = (process.env.HOSTINGER_FTP_HOST || "").trim();
  return raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/[/:].*$/, "");
}

/** Expand directories one level into the image files they contain. */
function collect(paths) {
  const files = [];
  for (const p of paths) {
    if (statSync(p).isDirectory()) {
      for (const entry of readdirSync(p)) {
        const full = join(p, entry);
        if (statSync(full).isFile() && MIME[extname(entry).toLowerCase()]) files.push(full);
      }
    } else {
      files.push(p);
    }
  }
  return files;
}

async function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    throw new Error("Usage: node prisma/import-media.mjs <file-or-directory> [...]");
  }

  const baseUrl = (process.env.HOSTINGER_MEDIA_URL || "").replace(/\/$/, "");
  const remoteDir = process.env.HOSTINGER_MEDIA_PATH || "/public_html/media";
  if (!baseUrl) throw new Error("HOSTINGER_MEDIA_URL is not set.");

  const files = collect(inputs);
  console.log(`${files.length} file(s) to import -> ${remoteDir}\n`);

  // Hostinger's FTP is slow to respond under load; the 30s default expires
  // mid-transfer and surfaces as "Timeout (control socket)".
  const client = new ftp.Client(120_000);
  try {
    await client.access({
      host: ftpHost(),
      user: process.env.HOSTINGER_FTP_USER,
      password: process.env.HOSTINGER_FTP_PASS,
      port: Number(process.env.HOSTINGER_FTP_PORT) || 21,
      secure: false,
    });
    await client.ensureDir(remoteDir);

    for (const file of files) {
      const ext = extname(file).toLowerCase();
      const key = sanitize(basename(file));
      const url = `${baseUrl}/${key}`;

      const existing = await prisma.mediaAsset.findFirst({ where: { key } });
      if (existing) {
        console.log(`  skip    ${key} (already in the library)`);
        continue;
      }

      const buffer = readFileSync(file);
      await client.uploadFrom(Readable.from(buffer), key);

      await prisma.mediaAsset.create({
        data: {
          key,
          filename: basename(file),
          format: ext.replace(".", ""),
          resourceType: "image",
          bytes: buffer.length,
          url,
        },
      });
      console.log(`  upload  ${key}  (${(buffer.length / 1024).toFixed(0)} KB)`);
      console.log(`          ${url}`);
    }
  } finally {
    client.close();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
