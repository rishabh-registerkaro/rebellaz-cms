/**
 * Public CV / resume upload — the one endpoint on this CMS that accepts a file
 * from an unauthenticated visitor.
 *
 * Website forms (careers pipeline, job application, resume builder, talent CTA)
 * upload here first, then POST the returned URL to /api/lead as
 * `attachmentUrl`. Keeping it separate from /api/media means public uploads
 * never land in the editors' media library and never touch MediaAsset.
 *
 * Because it is public it is deliberately narrow:
 *   - PDF / DOC / DOCX only, checked by both MIME type and extension
 *   - 8MB cap
 *   - in-memory per-IP rate limit
 *   - stored filename is timestamp + random, so a visitor cannot choose the
 *     remote path or overwrite an existing file
 *   - written to HOSTINGER_LEAD_PATH, a folder separate from editor media
 */

import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/app/lib/utils/corsHeader";
import { leadPath, leadUrlBase } from "@/app/lib/utils/leadAttachment";
import * as ftp from "basic-ftp";
import { Readable } from "stream";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const MAX_CV_SIZE = 8 * 1024 * 1024; // 8MB

// Browsers are inconsistent about DOC/DOCX MIME types, and some send
// application/octet-stream, so the extension is the authoritative check and
// MIME is treated as a secondary signal.
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
];

/** Magic bytes, so a renamed .exe cannot pass as a .pdf. */
function sniffSignature(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  // PDF -> "%PDF"
  if (ext === "pdf") return buffer.subarray(0, 4).toString("latin1") === "%PDF";
  // DOCX is a zip -> "PK\x03\x04"; legacy DOC is an OLE2 compound file
  if (ext === "docx") return buffer.subarray(0, 4).toString("latin1") === "PK\x03\x04";
  if (ext === "doc") {
    return buffer.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1";
  }
  return false;
}

// ── Rate limiting ─────────────────────────────────────────────────────────
// Per-instance and in-memory: it resets on redeploy and is not shared across
// serverless instances. Enough to stop a casual flood; a determined abuser
// needs a WAF rule at the host.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const uploads = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (uploads.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    uploads.set(ip, recent);
    return true;
  }

  recent.push(now);
  uploads.set(ip, recent);

  // Opportunistic sweep so the map cannot grow without bound.
  if (uploads.size > 5000) {
    for (const [key, times] of uploads) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) uploads.delete(key);
    }
  }
  return false;
}

// ── FTP ───────────────────────────────────────────────────────────────────
// basic-ftp wants a bare host/IP — strip any scheme/path that crept in from a
// copy-pasted connection string, otherwise DNS is asked to resolve the whole
// URL and fails with ENOTFOUND. (Same normalisation as /api/media.)
function ftpHost(): string {
  const raw = (process.env.HOSTINGER_FTP_HOST || "").trim();
  return raw.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").replace(/[/:].*$/, "");
}

async function uploadToHostinger(buffer: Buffer, filename: string): Promise<string> {
  const client = new ftp.Client();
  client.ftp.verbose = false;
  try {
    await client.access({
      host: ftpHost(),
      user: process.env.HOSTINGER_FTP_USER!,
      password: process.env.HOSTINGER_FTP_PASS!,
      port: Number(process.env.HOSTINGER_FTP_PORT) || 21,
      secure: false,
    });
    // ensureDir creates the folder if it is missing and leaves the client
    // inside it, so uploadFrom writes with a bare filename.
    await client.ensureDir(leadPath());
    await client.uploadFrom(Readable.from(buffer), filename);
    return `${leadUrlBase()}/${filename}`;
  } finally {
    client.close();
  }
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  const fail = (message: string, status: number) =>
    NextResponse.json({ success: false, message }, { status, headers: corsHeaders });

  try {
    if (isRateLimited(clientIp(req))) {
      return fail("Too many uploads. Please try again in a few minutes.", 429);
    }

    if (!process.env.HOSTINGER_FTP_HOST || !process.env.HOSTINGER_FTP_USER) {
      console.error("Lead upload attempted but Hostinger FTP env vars are not set");
      return fail("File uploads are not configured. Please submit without a file.", 503);
    }

    // A malformed or absent multipart body makes formData() throw; that is the
    // caller's mistake, so report 400 rather than letting it fall through to
    // the 500 handler below.
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return fail("Expected a multipart form upload with a `file` field.", 400);
    }

    const file = form.get("file");
    if (!file || typeof file === "string") return fail("No file provided.", 400);
    if (file.size === 0) return fail("That file is empty.", 400);
    if (file.size > MAX_CV_SIZE) return fail("File too large (max 8MB).", 400);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return fail("Only PDF, DOC and DOCX files are accepted.", 400);
    }
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return fail("Only PDF, DOC and DOCX files are accepted.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!sniffSignature(buffer, ext)) {
      return fail("That file does not look like a valid PDF or Word document.", 400);
    }

    // The visitor never controls the stored name — no traversal, no overwrite.
    const storedName = `${Date.now()}_${randomBytes(6).toString("hex")}.${ext}`;
    const url = await uploadToHostinger(buffer, storedName);

    return NextResponse.json(
      {
        success: true,
        url,
        // Echoed back so the lead record can show the visitor's original name.
        filename: file.name.slice(0, 200),
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Lead CV upload error:", error);
    return fail("Upload failed. Please try again or submit without a file.", 500);
  }
}
