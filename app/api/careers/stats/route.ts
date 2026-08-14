/**
 * The careers overview: every role with how many applications it has drawn and
 * whether it is currently collecting more.
 *
 * One endpoint rather than a count per role — a page that fires N+1 requests
 * against a remote shared MySQL is the thing that made the rest of this CMS
 * slow. `groupBy` gets every count in a single round trip.
 */
import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/utils/authorization";
import { ADMIN_ROLES } from "@/app/lib/constants/role";
import { APPLICATION_STATUSES } from "@/app/lib/constants/application";

export async function GET(req: NextRequest) {
  try {
    const userResult = await requireRole(req, ADMIN_ROLES);
    if (userResult instanceof NextResponse) return userResult;

    // Independent queries, run together: each round trip to the remote DB
    // costs 200ms–2s, so awaiting them in sequence would be the whole latency.
    const [roles, byRole, byStatus, totalApplications, unassigned] = await Promise.all([
      prisma.career.findMany({
        select: {
          id: true,
          title: true,
          slug: true,
          category: true,
          type: true,
          location: true,
          status: true,
          hidden: true,
          featured: true,
          publishedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.careerApplication.groupBy({
        by: ["careerId"],
        _count: { _all: true },
        _max: { createdAt: true },
      }),

      prisma.careerApplication.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      prisma.careerApplication.count(),

      // Talent-pipeline signups and applications whose role was deleted. They
      // belong to no role, so they would vanish from a per-role view.
      prisma.careerApplication.count({ where: { careerId: null } }),
    ]);

    const counts = new Map(
      byRole.map((entry) => [
        entry.careerId,
        { total: entry._count._all, lastAt: entry._max.createdAt },
      ])
    );

    const statusCounts = Object.fromEntries(
      APPLICATION_STATUSES.map((status) => [
        status,
        byStatus.find((entry) => entry.status === status)?._count._all ?? 0,
      ])
    );

    const items = roles.map((role) => {
      const entry = counts.get(role.id);
      return {
        ...role,
        _id: role.id,
        applications: entry?.total ?? 0,
        lastApplicationAt: entry?.lastAt ?? null,
        // "Live" is the question the overview answers: published AND not
        // hidden. A hidden role keeps its applications but collects no more.
        live: role.status === "published" && !role.hidden,
      };
    });

    return NextResponse.json({
      success: true,
      roles: items,
      totals: {
        roles: roles.length,
        live: items.filter((role) => role.live).length,
        hidden: roles.filter((role) => role.hidden).length,
        draft: roles.filter((role) => role.status === "draft").length,
        applications: totalApplications,
        unassignedApplications: unassigned,
        byStatus: statusCounts,
      },
    });
  } catch (error) {
    console.error("Error building careers stats", error);
    return NextResponse.json(
      { success: false, message: "Failed to load careers overview" },
      { status: 500 }
    );
  }
}
