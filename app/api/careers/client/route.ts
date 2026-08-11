import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCorsHeaders } from "@/app/lib/utils/cors";
import { apiErrorResponse } from "@/app/lib/utils/apiError";
import { daysSince, postedLabel } from "@/app/lib/constants/career";

/** Matches the frontend listing's page size. */
const DEFAULT_PAGE_SIZE = 6;

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get("origin")) });
}

/**
 * Public roles listing for the frontend /careers page.
 *
 * Returns the exact shape of the `Role` type the frontend already uses
 * (Rebellabz/app/careers/roles-data.ts), so this endpoint is a drop-in
 * replacement for that static array — including the derived `posted` label and
 * `days` sort key.
 *
 * Query params mirror the on-page controls: ?category= &type= &q= &featured=
 * &sort=newest|oldest &limit=
 */
export async function GET(req: NextRequest) {
  const headers = getCorsHeaders(req.headers.get("origin"));
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const q = searchParams.get("q")?.trim() || "";
    const featured = searchParams.get("featured")?.trim() || "";
    const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";

    // Pagination is OPT-IN: only applied when `page` or `limit` is supplied.
    // Without that, `generateStaticParams()` on the frontend — which calls this
    // endpoint with no params and needs every slug — would silently receive
    // only the first page and pre-render a fraction of the detail pages.
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const paginated = pageParam !== null || limitParam !== null;

    const limit = limitParam
      ? Math.min(200, Math.max(1, parseInt(limitParam, 10) || DEFAULT_PAGE_SIZE))
      : DEFAULT_PAGE_SIZE;
    const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

    const where: Prisma.CareerWhereInput = { status: "published" };

    // "All roles" is the frontend's default tab and is not a stored value.
    if (category && category !== "All roles") where.category = category;
    if (type) where.type = type;
    if (featured === "true") where.featured = true;

    // Match the frontend's behaviour: every whitespace-separated term must
    // appear somewhere in the role's searchable fields.
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      where.AND = terms.map((t) => ({
        OR: [
          { title: { contains: t } },
          { location: { contains: t } },
          { category: { contains: t } },
          { type: { contains: t } },
          { duration: { contains: t } },
        ],
      }));
    }

    // Total matching rows, independent of the page window — the frontend needs
    // it to render "showing X of Y" and the page count.
    const totalCount = await prisma.career.count({ where });

    const careers = await prisma.career.findMany({
      where,
      orderBy: [{ publishedAt: sort }, { createdAt: sort }],
      ...(paginated ? { skip: (page - 1) * limit, take: limit } : {}),
      select: {
        slug: true,
        title: true,
        category: true,
        location: true,
        type: true,
        duration: true,
        salary: true,
        unit: true,
        featured: true,
        summary: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    // Tabs come from the editor-managed Discipline table, in its configured
    // order — not from whatever happens to be in the result set, which would
    // reorder itself as roles are published.
    const disciplines = await prisma.discipline.findMany({
      where: { active: true },
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { name: true, slug: true },
    });

    const roles = careers.map((c) => {
      const posted = c.publishedAt ?? c.createdAt;
      return {
        slug: c.slug,
        title: c.title,
        category: c.category,
        location: c.location,
        type: c.type,
        duration: c.duration,
        salary: c.salary,
        unit: c.unit,
        featured: c.featured,
        summary: c.summary,
        posted: postedLabel(posted),
        days: daysSince(posted),
      };
    });

    return NextResponse.json(
      {
        success: true,
        roles,
        filters: {
          // Every active discipline, in configured order — the frontend renders
          // these as its tabs. Sent whole rather than filtered to the current
          // result set, otherwise choosing a tab would remove the others.
          disciplines,
          categories: disciplines.map((d) => d.name),
          types: [...new Set(careers.map((c) => c.type))],
          locations: [...new Set(careers.map((c) => c.location))].sort(),
        },
        // `total` is every role matching the filters, NOT the length of this
        // page — the listing shows "showing 6 of 27".
        total: totalCount,
        pagination: {
          currentPage: paginated ? page : 1,
          totalPages: paginated ? Math.max(1, Math.ceil(totalCount / limit)) : 1,
          totalCount,
          limit: paginated ? limit : totalCount,
          hasNextPage: paginated ? page * limit < totalCount : false,
          hasPrevPage: paginated ? page > 1 : false,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Failed to fetch public careers", error);
    const res = apiErrorResponse(error, "Failed to fetch careers.");
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
