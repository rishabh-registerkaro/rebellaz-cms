import prisma from "@/app/lib/config/db";
import { withMongoId } from "@/app/lib/utils/serialize";
import { NextRequest, NextResponse } from "next/server";
import { PublishStatus } from "@prisma/client";

import { requireRole } from "@/app/lib/utils/authorization";
import { EDITOR_ROLES, CONTENT_ROLES, ADMIN_ROLES } from "@/app/lib/constants/role";
import { revalidateFrontendTags, careerTags } from "@/app/lib/utils/revalidateFrontend";
import { cacheClear } from "@/app/lib/utils/responseCache";
import { apiErrorResponse } from "@/app/lib/utils/apiError";
import {
  slugifyCareer,
  toBullets,
  toPerks,
  typeHasDuration,
  TYPE_PAY,
} from "@/app/lib/constants/career";

type Ctx = { params: Promise<{ id: string }> };

/** Fetch one role for the edit form. */
export async function GET(req: NextRequest, context: Ctx) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await context.params;
    const career = await prisma.career.findUnique({
      where: { id },
      include: { author: { select: { id: true, username: true } } },
    });

    if (!career) {
      return NextResponse.json({ success: false, message: "Career not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: "Fetched career", data: withMongoId(career) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to fetch career", error);
    return apiErrorResponse(error, "Failed to fetch career.");
  }
}

/** Update a role. */
export async function PUT(req: NextRequest, context: Ctx) {
  try {
    const userResult = await requireRole(req, EDITOR_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await context.params;
    const body = await req.json();

    const existing = await prisma.career.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Career not found" }, { status: 404 });
    }

    // Only re-slug when the author actually supplied one — retitling a live
    // role must not silently break its public URL and inbound links.
    let slug = existing.slug;
    if (body.slug && slugifyCareer(body.slug) !== existing.slug) {
      slug = slugifyCareer(body.slug);
      const clash = await prisma.career.findFirst({
        where: { slug, NOT: { id } },
        select: { id: true, title: true },
      });
      if (clash) {
        return NextResponse.json(
          {
            success: false,
            message: `The slug "${slug}" is already used by "${clash.title}". Edit the Slug field to something unique.`,
          },
          { status: 409 }
        );
      }
    }

    const nextStatus = (body.status ?? existing.status) as PublishStatus;
    const nextType = body.type ?? existing.type;

    const career = await prisma.career.update({
      where: { id },
      data: {
        title: body.title ?? existing.title,
        slug,
        category: body.category ?? existing.category,
        location: body.location ?? existing.location,
        type: nextType,
        // Switching to an open-ended type clears the fields that type has no
        // concept of. Left alone, a role changed from Contract to Full-time
        // would keep a "6-mo" duration the form no longer shows — and so no
        // longer lets anyone correct — which then renders on the public page.
        duration: typeHasDuration(nextType) ? (body.duration ?? existing.duration) : "",
        salary: body.salary ?? existing.salary,
        unit: TYPE_PAY[nextType]?.unit ?? body.unit ?? existing.unit,
        featured: body.featured === undefined ? existing.featured : Boolean(body.featured),
        hidden: body.hidden === undefined ? existing.hidden : Boolean(body.hidden),
        description: body.description === undefined ? existing.description : body.description,
        summary: body.summary === undefined ? existing.summary : body.summary,
        // Follows the same partial-update rule as the fields above: an absent
        // key leaves the stored bullets alone, so a payload that omits them
        // cannot silently wipe a role's job description.
        responsibilities:
          body.responsibilities === undefined
            ? (existing.responsibilities ?? undefined)
            : toBullets(body.responsibilities),
        requirements:
          body.requirements === undefined
            ? (existing.requirements ?? undefined)
            : toBullets(body.requirements),
        perks: body.perks === undefined ? (existing.perks ?? undefined) : toPerks(body.perks),
        metaTitle: body.metaTitle === undefined ? existing.metaTitle : body.metaTitle,
        metaDescription:
          body.metaDescription === undefined ? existing.metaDescription : body.metaDescription,
        status: nextStatus,
        // Stamp publishedAt the first time it goes live and keep it thereafter,
        // so "posted 3 days ago" reflects the original publish, not every edit.
        publishedAt:
          nextStatus === "published" ? existing.publishedAt ?? new Date() : existing.publishedAt,
      },
      include: { author: { select: { id: true, username: true } } },
    });

    // Clear both the old and new slug when the URL changed.
    const tags = new Set([...careerTags(career.slug), ...careerTags(existing.slug)]);
    // Drop the public response cache too, or the editor keeps seeing the old
    // payload for up to its TTL and assumes the save failed.
    cacheClear("careers-list");
    cacheClear("career-detail");
    await revalidateFrontendTags([...tags]);

    return NextResponse.json(
      { success: true, message: "Career updated successfully", data: withMongoId(career) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to update career", error);
    return apiErrorResponse(error, "Failed to update career.");
  }
}

/** Delete a role. Admins only — the same bar as deleting a service page. */
export async function DELETE(req: NextRequest, context: Ctx) {
  try {
    const userResult = await requireRole(req, ADMIN_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await context.params;
    const existing = await prisma.career.findUnique({ where: { id }, select: { slug: true } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Career not found" }, { status: 404 });
    }

    await prisma.career.delete({ where: { id } });
    // Drop the public response cache too, or the editor keeps seeing the old
    // payload for up to its TTL and assumes the save failed.
    cacheClear("careers-list");
    cacheClear("career-detail");
    await revalidateFrontendTags(careerTags(existing.slug));

    return NextResponse.json(
      { success: true, message: "Career deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to delete career", error);
    return apiErrorResponse(error, "Failed to delete career.");
  }
}
