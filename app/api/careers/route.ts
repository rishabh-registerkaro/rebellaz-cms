import prisma from "@/app/lib/config/db";
import { withMongoId, withMongoIds } from "@/app/lib/utils/serialize";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, PublishStatus } from "@prisma/client";

import { requireRole } from "@/app/lib/utils/authorization";
import { EDITOR_ROLES, CONTENT_ROLES } from "@/app/lib/constants/role";
import { revalidateFrontendTags, careerTags } from "@/app/lib/utils/revalidateFrontend";
import { apiErrorResponse } from "@/app/lib/utils/apiError";
import { slugifyCareer, CAREER_TYPES } from "@/app/lib/constants/career";

/** [payload key, label shown to the author] */
const REQUIRED: Array<[string, string]> = [
  ["title", "Title"],
  ["category", "Category"],
  ["location", "Location"],
  ["type", "Type"],
  ["duration", "Duration"],
  ["salary", "Salary"],
];

/** Create a new open role. */
export async function POST(req: NextRequest) {
  try {
    const authorResult = await requireRole(req, EDITOR_ROLES);
    if (authorResult instanceof NextResponse) return authorResult;

    const authorId = authorResult.id;
    if (!authorId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please login to add a career." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const missing = REQUIRED.filter(([f]) => !String(body?.[f] ?? "").trim()).map(([, l]) => l);
    if (missing.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            missing.length === 1
              ? `${missing[0]} is required.`
              : `These fields are required: ${missing.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // Reject unknown taxonomy values outright — a typo here would silently hide
    // the role from its discipline tab on the frontend. Disciplines are now
    // editor-managed, so this validates against the table, not a constant.
    const discipline = await prisma.discipline.findUnique({
      where: { name: body.category },
      select: { active: true },
    });
    if (!discipline) {
      const available = await prisma.discipline.findMany({
        where: { active: true },
        orderBy: { position: "asc" },
        select: { name: true },
      });
      return NextResponse.json(
        {
          success: false,
          message: `"${body.category}" is not a valid discipline. Choose one of: ${available.map((d) => d.name).join(", ")} — or add it under Careers → Disciplines.`,
        },
        { status: 400 }
      );
    }
    if (!discipline.active) {
      return NextResponse.json(
        {
          success: false,
          message: `The discipline "${body.category}" is inactive and can't be assigned to new roles. Reactivate it under Careers → Disciplines.`,
        },
        { status: 400 }
      );
    }
    if (!CAREER_TYPES.includes(body.type)) {
      return NextResponse.json(
        {
          success: false,
          message: `"${body.type}" is not a valid type. Choose one of: ${CAREER_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    // Fall back to a slug derived from the title so the author never has to
    // hand-write one, but respect an explicit slug when given.
    const slug = slugifyCareer(body.slug?.trim() || body.title);
    if (!slug) {
      return NextResponse.json(
        { success: false, message: "Could not derive a slug from the title. Please set one manually." },
        { status: 400 }
      );
    }

    const slugExists = await prisma.career.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });
    if (slugExists) {
      return NextResponse.json(
        {
          success: false,
          message: `The slug "${slug}" is already used by "${slugExists.title}". Edit the Slug field to something unique.`,
        },
        { status: 409 }
      );
    }

    const status = (body.status ?? "draft") as PublishStatus;

    const career = await prisma.career.create({
      data: {
        title: body.title,
        slug,
        category: body.category,
        location: body.location,
        type: body.type,
        duration: body.duration,
        salary: body.salary,
        unit: body.unit || "/day",
        featured: Boolean(body.featured),
        description: body.description ?? null,
        summary: body.summary ?? null,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        status,
        // Stamp on first publish; the listing sorts and dates off this.
        publishedAt: status === "published" ? new Date() : null,
        authorId,
      },
      include: { author: { select: { id: true, username: true } } },
    });

    await revalidateFrontendTags(careerTags(career.slug));

    return NextResponse.json(
      { success: true, message: "Career added successfully", data: withMongoId(career) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add career", error);
    return apiErrorResponse(error, "Failed to add career.");
  }
}

/**
 * Paginated dashboard listing.
 * Supports every filter the frontend exposes (search, category, type, status,
 * featured) plus newest/oldest sorting, so the CMS list can mirror the site.
 */
export async function GET(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const featured = searchParams.get("featured")?.trim() || "";
    const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";

    const where: Prisma.CareerWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { location: { contains: search } },
        { category: { contains: search } },
        { duration: { contains: search } },
      ];
    }
    if (category) where.category = category;
    if (type) where.type = type;
    if (status === "draft" || status === "published") where.status = status as PublishStatus;
    if (featured === "true") where.featured = true;
    if (featured === "false") where.featured = false;

    const [careers, total] = await Promise.all([
      prisma.career.findMany({
        where,
        include: { author: { select: { id: true, username: true } } },
        orderBy: { createdAt: sort },
        skip,
        take: limit,
      }),
      prisma.career.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        message: "Fetched careers",
        careers: withMongoIds(careers),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount: total,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch careers", error);
    return apiErrorResponse(error, "Failed to fetch careers.");
  }
}
