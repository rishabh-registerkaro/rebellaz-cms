import prisma from "@/app/lib/config/db";
import { withMongoId } from "@/app/lib/utils/serialize";
import { NextRequest, NextResponse } from "next/server";
// bug fix

// CORS headers helper
const getCorsHeaders = (origin: string | null) => {
    const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://rebel-tau.vercel.app';
    if (origin === PRODUCTION_URL) {
        return {
            'Access-Control-Allow-Origin': PRODUCTION_URL,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
    }
    // Check if origin is localhost with any port
    if (origin && origin.startsWith('http://localhost:')) {
        return {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
    }
    // Default: allow production URL
    return {
        'Access-Control-Allow-Origin': PRODUCTION_URL,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get('origin');
    return NextResponse.json({}, { headers: getCorsHeaders(origin) });
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await context.params;
        // Public endpoint: drafts must not be readable. findUnique on the slug
        // alone returned unpublished pages to anyone who guessed the URL, while
        // the sibling sitemap route already filtered on status — this brings the
        // two in line.
        const servicePage = await prisma.servicePage.findFirst({
            where: { slug, status: "published" },
            include: { author: { select: { id: true, username: true } } },
        });

        const serialized = servicePage
            ? (() => {
                const { authorId, ...rest } = servicePage;
                return withMongoId(rest);
              })()
            : null;

        const origin = req.headers.get('origin');
        return NextResponse.json(
            { message: " Service Pages Fetched Successfully", servicePages: serialized },
            {
                status: 200,
                headers: getCorsHeaders(origin)
            }
        );
    } catch (error) {
        console.log("Error in fetching all service pages", error);
        const origin = req.headers.get('origin');
        return NextResponse.json(
            { message: "Internal Server Error-Error fetching service pages" },
            {
                status: 500,
                headers: getCorsHeaders(origin)
            }
        );
    }
}
