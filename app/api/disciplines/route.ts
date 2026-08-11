import prisma from "@/app/lib/config/db";
import { withMongoIds, withMongoId } from "@/app/lib/utils/serialize";
import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/app/lib/utils/authorization";
import { EDITOR_ROLES, CONTENT_ROLES } from "@/app/lib/constants/role";
import { revalidateFrontendTags } from "@/app/lib/utils/revalidateFrontend";
import { apiErrorResponse } from "@/app/lib/utils/apiError";
import { slugifyCareer } from "@/app/lib/constants/career";

/**
 * Disciplines list for the dashboard.
 * Includes a live count of how many roles use each one, so the UI can warn
 * before a delete and show which disciplines are actually in play.
 */
export async function GET(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("active") === "true";

    const disciplines = await prisma.discipline.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });

    // One grouped query rather than a count per discipline.
    const counts = await prisma.career.groupBy({
      by: ["category"],
      _count: { _all: true },
    });
    const countByName = new Map(counts.map((c) => [c.category, c._count._all]));

    return NextResponse.json(
      {
        success: true,
        message: "Fetched disciplines",
        disciplines: withMongoIds(disciplines).map((d) => ({
          ...d,
          careerCount: countByName.get(d?.name as string) ?? 0,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch disciplines", error);
    return apiErrorResponse(error, "Failed to fetch disciplines.");
  }
}

/** Create a discipline. */
export async function POST(req: NextRequest) {
  try {
    const userResult = await requireRole(req, EDITOR_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const body = await req.json();
    const name = String(body?.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required." },
        { status: 400 }
      );
    }

    const slug = slugifyCareer(body?.slug?.trim() || name);
    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not derive a slug from that name. Please set one manually.",
        },
        { status: 400 }
      );
    }

    const clash = await prisma.discipline.findFirst({
      where: { OR: [{ name }, { slug }] },
      select: { name: true, slug: true },
    });
    if (clash) {
      return NextResponse.json(
        {
          success: false,
          message:
            clash.name === name
              ? `The discipline "${name}" already exists.`
              : `The slug "${slug}" is already used by "${clash.name}". Set a different slug.`,
        },
        { status: 409 }
      );
    }

    // Append to the end of the tab order unless a position was given.
    const last = await prisma.discipline.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const discipline = await prisma.discipline.create({
      data: {
        name,
        slug,
        description: body?.description?.trim() || null,
        position:
          typeof body?.position === "number" ? body.position : (last?.position ?? -1) + 1,
        active: body?.active === undefined ? true : Boolean(body.active),
      },
    });

    await revalidateFrontendTags(["career-list"]);

    return NextResponse.json(
      {
        success: true,
        message: "Discipline added successfully",
        data: withMongoId(discipline),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add discipline", error);
    return apiErrorResponse(error, "Failed to add discipline.");
  }
}
