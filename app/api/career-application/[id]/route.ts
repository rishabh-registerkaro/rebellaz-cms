/**
 * A single application: read it, move it through the pipeline, or delete it.
 * Admin only — nothing here is public.
 */
import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/utils/authorization";
import { ADMIN_ROLES } from "@/app/lib/constants/role";
import { withMongoId } from "@/app/lib/utils/serialize";
import {
  APPLICATION_STATUSES,
  type ApplicationStatusValue,
} from "@/app/lib/constants/application";
import { deleteFromHostinger, resumeTarget } from "@/app/lib/utils/hostingerFtp";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userResult = await requireRole(req, ADMIN_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await params;
    const application = await prisma.careerApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json(
        { success: false, message: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, application: withMongoId(application) });
  } catch (error) {
    console.error("Error fetching application", error);
    return NextResponse.json(
      { success: false, message: "Failed to load application" },
      { status: 500 }
    );
  }
}

/** Status is the only editable field — the candidate's own answers are theirs. */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userResult = await requireRole(req, ADMIN_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await params;
    const body = await req.json().catch(() => null);
    const status = typeof body?.status === "string" ? body.status.trim() : "";

    if (!APPLICATION_STATUSES.includes(status as ApplicationStatusValue)) {
      return NextResponse.json(
        {
          success: false,
          message: `status must be one of: ${APPLICATION_STATUSES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.careerApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Application not found" },
        { status: 404 }
      );
    }

    const application = await prisma.careerApplication.update({
      where: { id },
      data: { status: status as ApplicationStatusValue },
    });

    return NextResponse.json({
      success: true,
      message: "Application updated",
      application: withMongoId(application),
    });
  } catch (error) {
    console.error("Error updating application", error);
    return NextResponse.json(
      { success: false, message: "Failed to update application" },
      { status: 500 }
    );
  }
}

/**
 * Delete an application, and its CV with it.
 *
 * The stored file goes too: keeping a candidate's personal document after the
 * record referencing it is gone leaves an orphan nobody can find or clean up.
 * A missing file is not an error — the row still goes.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const userResult = await requireRole(req, ADMIN_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    const { id } = await params;
    const application = await prisma.careerApplication.findUnique({
      where: { id },
      select: { id: true, resumeKey: true },
    });
    if (!application) {
      return NextResponse.json(
        { success: false, message: "Application not found" },
        { status: 404 }
      );
    }

    if (application.resumeKey) {
      try {
        await deleteFromHostinger(application.resumeKey, resumeTarget());
      } catch {
        // Already gone from the host — continue.
      }
      await prisma.resumeAsset.deleteMany({ where: { key: application.resumeKey } });
    }

    await prisma.careerApplication.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Application deleted" });
  } catch (error) {
    console.error("Error deleting application", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete application" },
      { status: 500 }
    );
  }
}
