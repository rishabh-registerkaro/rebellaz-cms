import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/utils/authorization";
import { CONTENT_ROLES } from "@/app/lib/constants/role";
import prisma from "@/app/lib/config/db";
import {
  deleteFromHostinger,
  mediaTarget,
  sanitizeFilename,
  uploadToHostinger,
} from "@/app/lib/utils/hostingerFtp";

const MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "video/mp4",
  "video/webm",
];

export async function POST(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;
    if (!userResult.id) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_MEDIA_SIZE) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    const safeFilename = `${Date.now()}_${sanitizeFilename(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadToHostinger(buffer, safeFilename, mediaTarget());
    const format = file.name.split(".").pop()?.toLowerCase() || "bin";
    const resourceType = file.type.startsWith("image/") ? "image" : "raw";

    await prisma.mediaAsset.create({
      data: {
        key: safeFilename,
        filename: file.name,
        format,
        resourceType,
        bytes: file.size,
        url,
      },
    });

    return NextResponse.json(
      { url, publicId: safeFilename, resource_type: resourceType },
      { status: 200 }
    );
  } catch (error) {
    console.error("Media upload error:", error);
    return NextResponse.json({ error: "Upload failed", details: String(error) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;
    if (!userResult.id) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    // Paginated chunks — no more hard cap hiding assets beyond the first 200
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "24")));
    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      prisma.mediaAsset.count(),
      prisma.mediaAsset.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const resources = docs.map((doc) => ({
      asset_id: doc.id,
      public_id: doc.key,
      filename: doc.filename,
      format: doc.format,
      secure_url: doc.url,
      bytes: doc.bytes,
      width: 0,
      height: 0,
      created_at: doc.createdAt,
      resource_type: doc.resourceType,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        message: "Fetched media",
        result: {
          resources,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount: total,
            limit,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Media fetch error:", error);
    return NextResponse.json({ message: "Error fetching media", error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const userResult = await requireRole(req, CONTENT_ROLES);
    if (userResult instanceof NextResponse) return userResult;
    if (!userResult.id) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const body = await req.json();
    const public_id = body?.public_id;
    if (!public_id) {
      return NextResponse.json({ error: "public_id is missing" }, { status: 400 });
    }

    try {
      await deleteFromHostinger(public_id, mediaTarget());
    } catch {
      // file may already be missing on Hostinger — still clean up DB record
    }

    await prisma.mediaAsset.deleteMany({ where: { key: public_id } });

    return NextResponse.json({ result: { deleted: true } }, { status: 200 });
  } catch (error: any) {
    console.error("Media delete error:", error);
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
