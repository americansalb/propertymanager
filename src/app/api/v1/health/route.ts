import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Matches the Render service's healthCheckPath (/api/v1/health). */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "up",
      schema: env.APP_DB_SCHEMA,
      brand: env.BRAND_NAME,
      commit: process.env.RENDER_GIT_COMMIT ?? null,
    });
  } catch {
    return NextResponse.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
