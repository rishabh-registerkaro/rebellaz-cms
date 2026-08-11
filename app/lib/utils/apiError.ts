import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

/**
 * Turns a thrown error into a response the UI can actually show the user.
 *
 * Without this, every failure surfaced as a generic 500 "Failed to ..." and the
 * real cause only existed in the server log — including the two that users hit
 * most often: a duplicate slug, and a Prisma client that predates the last
 * `db push` (the dev-server singleton in app/lib/config/db.ts is cached on
 * globalThis to survive hot-reload, so a stale one persists until restart).
 */
export function apiErrorResponse(error: unknown, fallback: string): NextResponse {
  // A missing model delegate means the generated client is older than the
  // schema. Say so, instead of "Cannot read properties of undefined".
  if (
    error instanceof TypeError &&
    /Cannot read properties of undefined \(reading '(\w+)'\)/.test(error.message)
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "The Prisma client is out of date with the database schema. " +
          "Run `npx prisma generate` and restart the dev server.",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint — name the field that actually clashed.
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const field = Array.isArray(target) ? target.join(", ") : String(target ?? "value");
      const label = field.includes("slug") ? "slug" : field;
      return NextResponse.json(
        {
          success: false,
          message: `That ${label} is already in use. Please choose a unique ${label}.`,
        },
        { status: 409 }
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Record not found." },
        { status: 404 }
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json(
        { success: false, message: "Related record missing — check the author still exists." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: `Database error (${error.code}).`, detail: error.message },
      { status: 500 }
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        success: false,
        message: "Could not connect to the database. Check DATABASE_URL and Remote MySQL access.",
      },
      { status: 503 }
    );
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return NextResponse.json(
      { success: false, message: "Invalid data sent to the database.", detail: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      message: fallback,
      detail: error instanceof Error ? error.message : String(error),
    },
    { status: 500 }
  );
}
