import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requireRole } from "@/app/lib/utils/authorization";
import { CONTENT_ROLES } from "@/app/lib/constants/role";
import { revalidateFrontendTags } from "@/app/lib/utils/revalidateFrontend";
import { apiErrorResponse } from "@/app/lib/utils/apiError";
import { getCorsHeaders } from "@/app/lib/utils/cors";
import {
  DEFAULT_CAREERS_CONTENT,
  withCareersDefaults,
} from "@/app/lib/content/careers-content";

/**
 * Marketing copy for the public /careers page — a singleton document, same
 * shape of endpoint as /api/about.
 *
 * GET is public (the frontend reads it); PUT requires a content role.
 */

export async function OPTIONS(req: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get("origin")) });
}

export async function GET(req: NextRequest) {
  const headers = getCorsHeaders(req.headers.get("origin"));
  try {
    const row = await prisma.careersPage.findFirst();

    // No row yet just means nobody has opened the editor — serve the shipped
    // copy so the live page renders correctly from day one.
    return NextResponse.json(
      {
        success: true,
        data: {
          _id: row?.id ?? null,
          metaTitle: row?.metaTitle ?? null,
          metaDescription: row?.metaDescription ?? null,
          content: withCareersDefaults(row?.content),
          updatedAt: row?.updatedAt ?? null,
        },
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Failed to fetch careers page content", error);
    const res = apiErrorResponse(error, "Failed to fetch careers page content.");
    Object.entries(headers).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const body = await req.json();
    if (!body?.content || typeof body.content !== "object") {
      return NextResponse.json(
        { success: false, message: "`content` is required and must be an object." },
        { status: 400 }
      );
    }

    // Normalise before storing so a partial payload can't strip a section.
    const content = withCareersDefaults(body.content);

    const existing = await prisma.careersPage.findFirst({ select: { id: true } });

    const row = existing
      ? await prisma.careersPage.update({
          where: { id: existing.id },
          data: {
            metaTitle: body.metaTitle ?? null,
            metaDescription: body.metaDescription ?? null,
            content: content as unknown as Prisma.InputJsonValue,
          },
        })
      : await prisma.careersPage.create({
          data: {
            metaTitle: body.metaTitle ?? null,
            metaDescription: body.metaDescription ?? null,
            content: content as unknown as Prisma.InputJsonValue,
          },
        });

    await revalidateFrontendTags(["careers-page"]);

    return NextResponse.json(
      {
        success: true,
        message: "Careers page content saved",
        data: { _id: row.id, content, updatedAt: row.updatedAt },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to save careers page content", error);
    return apiErrorResponse(error, "Failed to save careers page content.");
  }
}

/** Restore the shipped copy — an escape hatch if an edit goes wrong. */
export async function DELETE(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const existing = await prisma.careersPage.findFirst({ select: { id: true } });
    if (existing) {
      await prisma.careersPage.update({
        where: { id: existing.id },
        data: { content: DEFAULT_CAREERS_CONTENT as unknown as Prisma.InputJsonValue },
      });
    }
    await revalidateFrontendTags(["careers-page"]);

    return NextResponse.json(
      { success: true, message: "Reset to the default copy", data: { content: DEFAULT_CAREERS_CONTENT } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to reset careers page content", error);
    return apiErrorResponse(error, "Failed to reset careers page content.");
  }
}
