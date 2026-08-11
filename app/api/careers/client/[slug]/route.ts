import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/app/lib/utils/cors";
import { cacheGet, cacheSet } from "@/app/lib/utils/responseCache";
import { apiErrorResponse } from "@/app/lib/utils/apiError";
import { daysSince, postedLabel, roleMeta, roleComp, toBullets, toPerks } from "@/app/lib/constants/career";

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get("origin")) });
}

/**
 * Public detail payload for /careers/[slug].
 *
 * `description` is the TipTap HTML authored in the CMS and replaces the four
 * template-generated blocks (overview / responsibilities / requirements /
 * offer) the frontend currently builds from roles-data.ts. Render it with
 * dangerouslySetInnerHTML inside a `.prose` container, the same way the blog
 * detail page renders post content.
 */
export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const headers = getCorsHeaders(req.headers.get("origin"));
  try {
    const { slug } = await context.params;

    const cached = cacheGet("career-detail", slug);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { ...headers, "x-cache": "HIT" },
      });
    }

    // Filter on status in the query rather than fetching then checking: a draft
    // must 404 publicly, and this way `status` never enters the response shape.
    const career = await prisma.career.findFirst({
      where: { slug, status: "published" },
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
        description: true,
        responsibilities: true,
        requirements: true,
        perks: true,
        metaTitle: true,
        metaDescription: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!career) {
      return NextResponse.json(
        { success: false, message: "Career not found" },
        { status: 404, headers }
      );
    }

    const posted = career.publishedAt ?? career.createdAt;

    const payload = {
        success: true,
        role: {
          ...career,
          // Mirrors the listing endpoint: the site's `Role` field names, built
          // here so its detail page keeps rendering exactly what it renders now.
          discipline: career.category,
          meta: roleMeta(career.location, career.duration, career.type),
          comp: roleComp(career.salary, career.unit),
          responsibilities: toBullets(career.responsibilities),
          requirements: toBullets(career.requirements),
          perks: toPerks(career.perks),
          posted: postedLabel(posted),
          days: daysSince(posted),
        },
      };

    cacheSet("career-detail", slug, payload);

    return NextResponse.json(payload, {
      status: 200,
      headers: { ...headers, "x-cache": "MISS" },
    });
  } catch (error) {
    console.error("Failed to fetch public career", error);
    const res = apiErrorResponse(error, "Failed to fetch career.");
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}
