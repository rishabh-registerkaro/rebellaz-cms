/**
 * CV upload — the one endpoint on this CMS that accepts a file from an
 * unauthenticated visitor.
 *
 * The career forms upload here first, then POST the returned URL to
 * /api/career-application as `resumeUrl`. Files land in their own Hostinger
 * folder (HOSTINGER_RESUME_PATH) and their own table, so a candidate's CV can
 * never surface in the editors' Media Library.
 *
 * Because it is public it is deliberately narrow:
 *   - PDF only, checked by MIME type AND extension AND the file's own header
 *   - 10MB cap
 *   - in-memory per-IP rate limit
 *   - stored filename is timestamp + random, so a visitor cannot choose the
 *     remote path or overwrite an existing file
 *
 * GET and DELETE are admin-only: the listing is Careers → Resumes.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/config/db";
import { getCorsHeaders } from "@/app/lib/utils/corsHeader";
import { requireRole } from "@/app/lib/utils/authorization";
import { CONTENT_ROLES } from "@/app/lib/constants/role";
import {
  deleteFromHostinger,
  resumeTarget,
  sanitizeFilename,
  uploadToHostinger,
} from "@/app/lib/utils/hostingerFtp";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Rate limit: uploads per IP per window.
 *
 * In-memory, so it resets on redeploy and is per-instance. That is enough for
 * what it defends against — one person hammering the endpoint — and avoids a
 * database round trip on a request that is already slow from the FTP write.
 */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const uploads = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = uploads.get(ip);

  if (!entry || now > entry.resetAt) {
    uploads.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    // Opportunistic cleanup so the map cannot grow without bound on a
    // long-lived instance.
    if (uploads.size > 5000) {
      for (const [key, value] of uploads) if (now > value.resetAt) uploads.delete(key);
    }
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Every PDF starts with "%PDF-". Checked because Content-Type is supplied by
 * the browser and the extension by the filename — neither is evidence about
 * what the bytes actually are.
 */
function looksLikePdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    if (rateLimited(clientIp(req))) {
      return NextResponse.json(
        { success: false, message: "Too many uploads. Please try again later." },
        { status: 429, headers: corsHeaders }
      );
    }

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Please choose a file to upload." },
        { status: 400, headers: corsHeaders }
      );
    }
    if (file.size === 0) {
      return NextResponse.json(
        { success: false, message: "That file is empty." },
        { status: 400, headers: corsHeaders }
      );
    }
    if (file.size > MAX_RESUME_SIZE) {
      return NextResponse.json(
        { success: false, message: "That file is too large (max 10MB)." },
        { status: 400, headers: corsHeaders }
      );
    }

    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (file.type !== "application/pdf" || extension !== "pdf") {
      return NextResponse.json(
        { success: false, message: "Please upload your CV as a PDF." },
        { status: 400, headers: corsHeaders }
      );
    }

    // The public base URL must be absolute, or the stored link would be a
    // relative path that resolves nowhere and gets rejected as "not our file"
    // when the application is submitted — losing the CV silently. Refusing
    // here means a misconfigured deployment fails loudly on the first upload.
    const target = resumeTarget();
    if (!/^https?:\/\//i.test(target.baseUrl)) {
      console.error(
        "Resume storage is misconfigured: set HOSTINGER_RESUME_URL (or HOSTINGER_MEDIA_URL), got:",
        JSON.stringify(target.baseUrl)
      );
      return NextResponse.json(
        { success: false, message: "CV uploads are unavailable right now. Please try again later." },
        { status: 503, headers: corsHeaders }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!looksLikePdf(buffer)) {
      return NextResponse.json(
        { success: false, message: "That file is not a valid PDF." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Timestamp + random prefix: the candidate never controls the remote path,
    // and two people uploading "cv.pdf" cannot overwrite each other.
    const key = `${Date.now()}_${randomBytes(4).toString("hex")}_${sanitizeFilename(file.name)}`;
    const url = await uploadToHostinger(buffer, key, target);

    await prisma.resumeAsset.create({
      data: { key, filename: file.name, format: "pdf", bytes: file.size, url },
    });

    return NextResponse.json(
      { success: true, url, key, filename: file.name, bytes: file.size },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { success: false, message: "Upload failed. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}

/** Admin listing for Careers → Resumes. */
export async function GET(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
    const search = searchParams.get("search")?.trim() ?? "";

    const where = search ? { filename: { contains: search } } : {};

    const [totalCount, assets] = await Promise.all([
      prisma.resumeAsset.count({ where }),
      prisma.resumeAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return NextResponse.json({
      success: true,
      assets: assets.map((asset) => ({ ...asset, _id: asset.id })),
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Resume list error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load resumes" },
      { status: 500 }
    );
  }
}

/**
 * Admin delete.
 *
 * The stored file goes first, then the row. Applications keep their
 * `resumeUrl` — a dead link in an old application is better than silently
 * rewriting hiring history, and the dashboard shows the file is gone when it
 * fails to open.
 */
export async function DELETE(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const body = await req.json().catch(() => null);
    const key = typeof body?.key === "string" ? body.key.trim() : "";
    if (!key) {
      return NextResponse.json({ success: false, message: "key is required" }, { status: 400 });
    }

    try {
      await deleteFromHostinger(key, resumeTarget());
    } catch {
      // Already missing on the host — still clean up the row.
    }
    await prisma.resumeAsset.deleteMany({ where: { key } });

    return NextResponse.json({ success: true, message: "Resume deleted" });
  } catch (error) {
    console.error("Resume delete error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete resume" },
      { status: 500 }
    );
  }
}
