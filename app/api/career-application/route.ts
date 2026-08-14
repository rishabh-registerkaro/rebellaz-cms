/**
 * Career applications — candidates, not leads.
 *
 * POST is public: the role page's apply form and the talent-pipeline form both
 * submit here, after uploading their CV to /api/career-resume. Kept separate
 * from /api/lead on purpose — an application carries a CV, belongs to a role,
 * and moves through a hiring pipeline rather than a sales one.
 *
 * GET is admin: the Careers → Applications listing.
 */
import prisma from "@/app/lib/config/db";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/app/lib/utils/corsHeader";
import { requireRole } from "@/app/lib/utils/authorization";
import { ADMIN_ROLES } from "@/app/lib/constants/role";
import { withMongoId } from "@/app/lib/utils/serialize";
import { isOwnResumeUrl } from "@/app/lib/utils/resumeUrl";
import { sendApplicationNotification } from "@/app/lib/config/email";
import { APPLICATION_STATUSES } from "@/app/lib/constants/application";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Returns an error message written for the candidate, or null when valid. */
function validateApplication(body: {
  name?: unknown;
  email?: unknown;
  phoneNo?: unknown;
}): string | null {
  const { name, email, phoneNo } = body;

  if (typeof name !== "string" || name.trim().length < 2) {
    return "Please enter your full name (at least 2 characters).";
  }
  if (name.trim().length > 100) return "Name is too long (max 100 characters).";

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.trim().length > 254) {
    return "Please enter a valid email address.";
  }

  if (typeof phoneNo !== "string" || phoneNo.trim() === "") {
    return "Please enter your phone number.";
  }
  const digits = phoneNo.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d{7,15}$/.test(digits)) {
    return "Please enter a valid phone number (7–15 digits).";
  }

  return null;
}

/** Same-site paths only — see the identical rule on leads. */
function sanitizePagePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const path = raw.trim().slice(0, 300);
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
}

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req) });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getCorsHeaders(req);
  try {
    const body = await req.json();

    const validationError = validateApplication(body);
    if (validationError) {
      return NextResponse.json(
        { success: false, message: validationError },
        { status: 400, headers: corsHeaders }
      );
    }

    // The role is looked up by slug rather than trusted from the body: it
    // fixes the title and discipline to what the CMS actually holds, and it
    // means a closed or deleted role cannot collect new applications.
    const slug = typeof body.roleSlug === "string" ? body.roleSlug.trim() : "";
    const role = slug
      ? await prisma.career.findUnique({
          where: { slug },
          select: { id: true, title: true, slug: true, category: true, status: true, hidden: true },
        })
      : null;

    if (slug && (!role || role.status !== "published" || role.hidden)) {
      return NextResponse.json(
        {
          success: false,
          message: "That role is no longer accepting applications.",
        },
        { status: 410, headers: corsHeaders }
      );
    }

    // A CV is optional — the pipeline form can be submitted without one — but
    // when present it must be a URL we produced in /api/career-resume.
    // Anything else is dropped: a stored foreign URL would be opened later by
    // an admin from the dashboard or the notification email.
    let resumeUrl: string | null = null;
    let resumeKey: string | null = null;
    let resumeName: string | null = null;
    let resumeBytes: number | null = null;

    if (typeof body.resumeUrl === "string" && body.resumeUrl.trim()) {
      const candidate = body.resumeUrl.trim();
      if (isOwnResumeUrl(candidate)) {
        resumeUrl = candidate;
        resumeKey = typeof body.resumeKey === "string" ? body.resumeKey.trim().slice(0, 300) : null;
        resumeName =
          typeof body.resumeName === "string" && body.resumeName.trim()
            ? body.resumeName.trim().slice(0, 200)
            : null;
        resumeBytes = Number.isFinite(body.resumeBytes) ? Number(body.resumeBytes) : null;
      } else {
        console.warn("Rejected foreign resume URL:", candidate.slice(0, 200));
      }
    }

    const discipline =
      role?.category ??
      (typeof body.discipline === "string" && body.discipline.trim()
        ? body.discipline.trim().slice(0, 200)
        : null);

    const application = await prisma.careerApplication.create({
      data: {
        careerId: role?.id ?? null,
        roleTitle: role?.title ?? null,
        roleSlug: role?.slug ?? null,
        discipline,
        name: String(body.name).trim(),
        email: String(body.email).trim().toLowerCase(),
        phoneNo: String(body.phoneNo).trim(),
        note:
          typeof body.note === "string" && body.note.trim()
            ? body.note.trim().slice(0, 5000)
            : null,
        resumeUrl,
        resumeKey,
        resumeName,
        resumeBytes,
        source: role ? "Role page" : "Talent pipeline",
        pagePath: sanitizePagePath(body.pagePath),
        status: "new",
      },
    });

    // Awaited with a cap so a serverless host doesn't cut the send off, but a
    // slow or failed email never delays or fails the candidate.
    await Promise.race([
      sendApplicationNotification({
        name: application.name,
        email: application.email,
        phoneNo: application.phoneNo,
        roleTitle: application.roleTitle,
        discipline: application.discipline,
        note: application.note,
        resumeUrl: application.resumeUrl,
        resumeName: application.resumeName,
        source: application.source,
        pagePath: application.pagePath,
        createdAt: application.createdAt,
      }),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Application received",
        applicationId: application.id,
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error while storing application", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}

/** Admin listing: filter by role, status or free text; newest first. */
export async function GET(req: NextRequest) {
  try {
    const userResult = await requireRole(req, ADMIN_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10));
    const status = searchParams.get("status")?.trim() ?? "";
    const careerId = searchParams.get("careerId")?.trim() ?? "";
    const source = searchParams.get("source")?.trim() ?? "";
    const search = searchParams.get("search")?.trim() ?? "";

    const where: Prisma.CareerApplicationWhereInput = {};

    // An unknown status would make Prisma throw on the enum, so treat it as
    // matching nothing rather than 500ing on a hand-typed URL.
    if (status) {
      if (!APPLICATION_STATUSES.includes(status as (typeof APPLICATION_STATUSES)[number])) {
        return NextResponse.json({
          success: true,
          applications: [],
          pagination: {
            currentPage: page,
            totalPages: 1,
            totalCount: 0,
            limit,
            hasNextPage: false,
            hasPrevPage: false,
          },
        });
      }
      where.status = status as Prisma.EnumApplicationStatusFilter["equals"];
    }

    if (careerId) where.careerId = careerId;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phoneNo: { contains: search } },
        { roleTitle: { contains: search } },
        { discipline: { contains: search } },
      ];
    }

    const [totalCount, applications] = await Promise.all([
      prisma.careerApplication.count({ where }),
      prisma.careerApplication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    return NextResponse.json({
      success: true,
      applications: applications.map((application) => withMongoId(application)),
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
    console.error("Error fetching applications", error);
    return NextResponse.json(
      { success: false, message: "Failed to load applications" },
      { status: 500 }
    );
  }
}
