import prisma from "@/app/lib/config/db";
import { withMongoId } from "@/app/lib/utils/serialize";
import { requireRole } from "@/app/lib/utils/authorization";
import { ADMIN_ROLES } from "@/app/lib/constants/role";
import { NextResponse, NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidateFrontendTags } from "@/app/lib/utils/revalidateFrontend";
import { legalRevisionDates } from "@/app/lib/utils/legalRevision";

const getCorsHeaders = (origin: string | null) => {
    const PRODUCTION_URL = process.env.PRODUCTION_URL || "https://rebel-tau.vercel.app";
    const normalize = (u: string) => u.replace(/\/$/, "");

    if (origin && normalize(origin) === normalize(PRODUCTION_URL)) {
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };
    }
    if (origin && origin.startsWith("http://localhost:")) {
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };
    }
    return {
        "Access-Control-Allow-Origin": PRODUCTION_URL,
        "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    };
};

// Nullable Json columns need Prisma.JsonNull instead of plain null
const jsonValue = (v: unknown) =>
    v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue);

export async function OPTIONS(req: NextRequest) {
    return NextResponse.json({}, { headers: getCorsHeaders(req.headers.get("origin")) });
}

export async function GET(req: NextRequest) {
    try {
        const doc = await prisma.termsPolicy.findFirst();
        const corsHeaders = getCorsHeaders(req.headers.get("origin"));

        if (!doc) {
            return NextResponse.json({ success: true, data: null }, { headers: corsHeaders });
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    metaTitle: doc.metaTitle,
                    metaDescription: doc.metaDescription,
                    title: doc.title,
                    subTitle: doc.subTitle,
                    privacyMetaTitle: doc.privacyMetaTitle,
                    privacyMetaDescription: doc.privacyMetaDescription,
                    privacyTitle: doc.privacyTitle,
                    privacySubTitle: doc.privacySubTitle,
                    content: doc.content,
                    privacyPolicyContent: doc.privacyPolicyContent,
                    // Per-policy revision dates, falling back to the row's own
                    // timestamp for a document saved before they existed.
                    termsUpdatedAt: doc.termsUpdatedAt ?? doc.updatedAt,
                    privacyUpdatedAt: doc.privacyUpdatedAt ?? doc.updatedAt,
                    updatedAt: doc.updatedAt,
                },
            },
            { headers: corsHeaders }
        );
    } catch (error) {
        console.error("GET /api/terms-policy error:", error);
        return NextResponse.json({ success: false, message: "Failed to fetch terms & policy." }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ADMIN_ROLES);
        if (authResult instanceof NextResponse) return authResult;

        const existing = await prisma.termsPolicy.findFirst();
        if (existing) {
            return NextResponse.json(
                { success: false, message: "Terms & Policy already exists. Use PATCH to update." },
                { status: 409 }
            );
        }

        const body = await req.json();
        const now = new Date();
        const doc = await prisma.termsPolicy.create({
            data: {
                metaTitle: body.metaTitle,
                metaDescription: body.metaDescription,
                title: body.title,
                subTitle: body.subTitle,
                privacyMetaTitle: body.privacyMetaTitle,
                privacyMetaDescription: body.privacyMetaDescription,
                privacyTitle: body.privacyTitle,
                privacySubTitle: body.privacySubTitle,
                content: (body.content ?? {}) as Prisma.InputJsonValue,
                privacyPolicyContent: (body.privacyPolicyContent ?? {}) as Prisma.InputJsonValue,
                // First publication dates both policies; after this each is
                // stamped only when its own wording changes.
                termsUpdatedAt: now,
                privacyUpdatedAt: now,
            },
        });

        await revalidateFrontendTags(["legal-page"]);

        return NextResponse.json({ success: true, data: withMongoId(doc) }, { status: 201 });
    } catch (error) {
        console.error("POST /api/terms-policy error:", error);
        return NextResponse.json({ success: false, message: "Failed to create terms & policy." }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const authResult = await requireRole(req, ADMIN_ROLES);
        if (authResult instanceof NextResponse) return authResult;

        const body = await req.json();

        const doc = await prisma.termsPolicy.findFirst();
        if (!doc) {
            return NextResponse.json(
                { success: false, message: "Terms & Policy not found. Use POST to create it first." },
                { status: 404 }
            );
        }

        const data: Prisma.TermsPolicyUpdateInput = {};
        if (body.metaTitle !== undefined) data.metaTitle = body.metaTitle;
        if (body.metaDescription !== undefined) data.metaDescription = body.metaDescription;
        if (body.title !== undefined) data.title = body.title;
        if (body.subTitle !== undefined) data.subTitle = body.subTitle;

        if (body.privacyMetaTitle !== undefined) data.privacyMetaTitle = body.privacyMetaTitle;
        if (body.privacyMetaDescription !== undefined) {
            data.privacyMetaDescription = body.privacyMetaDescription;
        }
        if (body.privacyTitle !== undefined) data.privacyTitle = body.privacyTitle;
        if (body.privacySubTitle !== undefined) data.privacySubTitle = body.privacySubTitle;

        if (body.content !== undefined) data.content = jsonValue(body.content);
        if (body.privacyPolicyContent !== undefined) {
            data.privacyPolicyContent = jsonValue(body.privacyPolicyContent);
        }

        // Only the policy whose wording actually changed gets redated — see
        // legalRevision.ts for the two rules and their tests.
        Object.assign(data, legalRevisionDates(body, doc));

        const updated = await prisma.termsPolicy.update({
            where: { id: doc.id },
            data,
        });

        // Both public pages are served from this one row, so a save clears both.
        await revalidateFrontendTags(["legal-page"]);

        return NextResponse.json({
            success: true,
            data: {
                metaTitle: updated.metaTitle,
                metaDescription: updated.metaDescription,
                title: updated.title,
                subTitle: updated.subTitle,
                privacyMetaTitle: updated.privacyMetaTitle,
                privacyMetaDescription: updated.privacyMetaDescription,
                privacyTitle: updated.privacyTitle,
                privacySubTitle: updated.privacySubTitle,
                content: updated.content,
                privacyPolicyContent: updated.privacyPolicyContent,
                termsUpdatedAt: updated.termsUpdatedAt,
                privacyUpdatedAt: updated.privacyUpdatedAt,
            },
        });
    } catch (error) {
        console.error("PATCH /api/terms-policy error:", error);
        return NextResponse.json({ success: false, message: "Failed to update terms & policy." }, { status: 500 });
    }
}
