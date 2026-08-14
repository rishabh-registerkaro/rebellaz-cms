import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders } from "@/app/lib/utils/cors";

/**
 * Categories for the public blog's filter tabs.
 *
 * Only categories that actually have a published post are returned: a tab that
 * leads to an empty list is worse than no tab, and the editors' full category
 * tree includes drafts and unused entries.
 */
export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get("origin")) });
}

export async function GET(req: NextRequest) {
  const headers = getCorsHeaders(req.headers.get("origin"));
  try {
    const categories = await prisma.category.findMany({
      where: { posts: { some: { status: "published" } } },
      select: {
        id: true,
        name: true,
        slug: true,
        color: true,
        _count: { select: { posts: { where: { status: "published" } } } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(
      {
        success: true,
        categories: categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          color: category.color || "",
          count: category._count.posts,
        })),
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Error fetching blog categories:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch categories" },
      { status: 500, headers }
    );
  }
}
