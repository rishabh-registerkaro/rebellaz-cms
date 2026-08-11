import prisma from "@/app/lib/config/db";
import { withMongoId } from "@/app/lib/utils/serialize";
import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/app/lib/utils/authorization";
import { EDITOR_ROLES, ADMIN_ROLES } from "@/app/lib/constants/role";
import { revalidateFrontendTags } from "@/app/lib/utils/revalidateFrontend";
import { apiErrorResponse } from "@/app/lib/utils/apiError";
import { slugifyCareer } from "@/app/lib/constants/career";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Update a discipline.
 *
 * Renaming cascades: `Career.category` stores the discipline name, so every
 * role carrying the old name is rewritten in the SAME transaction. Without
 * that, a rename would orphan those roles from every discipline tab on the
 * public site.
 */
export async function PUT(req: NextRequest, context: Ctx) {
  try {
    const userResult = await requireRole(req, EDITOR_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.discipline.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Discipline not found." },
        { status: 404 }
      );
    }

    const name = body?.name === undefined ? existing.name : String(body.name).trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name cannot be empty." },
        { status: 400 }
      );
    }

    const slug =
      body?.slug === undefined ? existing.slug : slugifyCareer(String(body.slug).trim() || name);

    const clash = await prisma.discipline.findFirst({
      where: { OR: [{ name }, { slug }], NOT: { id } },
      select: { name: true },
    });
    if (clash) {
      return NextResponse.json(
        { success: false, message: `"${clash.name}" already uses that name or slug.` },
        { status: 409 }
      );
    }

    const renamed = name !== existing.name;

    const [discipline, cascade] = await prisma.$transaction([
      prisma.discipline.update({
        where: { id },
        data: {
          name,
          slug,
          description:
            body?.description === undefined
              ? existing.description
              : String(body.description).trim() || null,
          position: typeof body?.position === "number" ? body.position : existing.position,
          active: body?.active === undefined ? existing.active : Boolean(body.active),
        },
      }),
      prisma.career.updateMany({
        where: { category: existing.name },
        data: { category: name },
      }),
    ]);

    await revalidateFrontendTags(["career-list"]);

    return NextResponse.json(
      {
        success: true,
        message: renamed
          ? `Discipline renamed. ${cascade.count} role${cascade.count === 1 ? "" : "s"} updated.`
          : "Discipline updated successfully",
        data: withMongoId(discipline),
        rolesUpdated: renamed ? cascade.count : 0,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update discipline", error);
    return apiErrorResponse(error, "Failed to update discipline.");
  }
}

/**
 * Delete a discipline.
 *
 * Refused while roles still use it — deleting would leave those roles with a
 * category matching no tab, so they'd vanish from the public filters while
 * still being live. The message names the count so the admin can reassign or
 * deactivate instead.
 */
export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const userResult = await requireRole(req, ADMIN_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await context.params;
    const existing = await prisma.discipline.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Discipline not found." },
        { status: 404 }
      );
    }

    const inUse = await prisma.career.count({ where: { category: existing.name } });
    if (inUse > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `"${existing.name}" is used by ${inUse} role${inUse === 1 ? "" : "s"}. Reassign ${inUse === 1 ? "it" : "them"} to another discipline first, or set this one to inactive to hide it from new roles.`,
        },
        { status: 409 }
      );
    }

    await prisma.discipline.delete({ where: { id } });
    await revalidateFrontendTags(["career-list"]);

    return NextResponse.json(
      { success: true, message: "Discipline deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete discipline", error);
    return apiErrorResponse(error, "Failed to delete discipline.");
  }
}
