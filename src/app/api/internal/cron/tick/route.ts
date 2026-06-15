/**
 * Background tick trigger. A Render Cron job pokes this every couple of
 * minutes with the shared secret; the work runs in-process (reusing the web
 * Prisma pool) so it adds no connections to the shared database.
 */
import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { runTick } from "@/lib/worker/tick";

export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const expected = env.CRON_SECRET;
  if (!expected) return false; // closed unless a secret is configured
  const provided = req.headers.get("x-cron-secret");
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runTick();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("cron tick failed", e);
    return NextResponse.json({ ok: false, error: "tick_failed" }, { status: 500 });
  }
}
