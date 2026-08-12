import prisma from "@/app/lib/config/db";
import { NextRequest, NextResponse } from "next/server";

import { requireRole } from "@/app/lib/utils/authorization";
import { CONTENT_ROLES } from "@/app/lib/constants/role";
import { STATIC_SITE_PAGES, type PickablePage } from "@/app/lib/constants/sitePages";
import {
  isServiceTemplate,
  servicePageTitle,
  servicePageUrl,
} from "@/app/lib/utils/servicePage";

/**
 * Every link target on the site, for the header and footer menu editors.
 *
 * The menus used to be two free-text boxes per entry, which meant an editor
 * had to know and retype a slug — and a typo published a 404 with no warning.
 * This endpoint is what replaces that: the editor searches real pages and
 * attaches one, so a menu entry can only ever point somewhere that exists.
 *
 * Dashboard-only (it lists drafts), so it is behind the same role gate as the
 * menu save. The public site reads the saved menu, never this.
 */

export async function GET(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) {
      return userResult;
    }

    const rows = await prisma.servicePage.findMany({
      select: {
        id: true,
        slug: true,
        template: true,
        status: true,
        content: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const cmsPages = rows.flatMap<PickablePage>((row) => {
      // A page on some other template (the resume builder, say) renders under
      // no public route, so there is nothing to link to.
      if (!isServiceTemplate(row.template)) return [];
      const url = servicePageUrl(row.template, row.slug);
      if (!url) return [];

      return [
        {
          id: row.id,
          title: servicePageTitle(row.content, row.slug),
          url,
          group: "Solutions",
          // Drafts are listed rather than hidden — an editor often builds the
          // menu alongside the page — but the picker flags them, because a
          // draft linked in the header is a 404 until it is published.
          status: row.status === "published" ? "published" : "draft",
        },
      ];
    });

    const staticPages = STATIC_SITE_PAGES.map<PickablePage>((page) => ({
      ...page,
      group: "Site pages",
    }));

    return NextResponse.json(
      { success: true, pages: [...cmsPages, ...staticPages] },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching site pages:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error - Fetching site pages" },
      { status: 500 }
    );
  }
}
