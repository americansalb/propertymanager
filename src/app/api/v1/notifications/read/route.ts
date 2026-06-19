import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/authz";
import { markRead } from "@/lib/services/notification";

export const dynamic = "force-dynamic";

const schema = z.object({ ids: z.array(z.string()).optional() });

/** Mark some (ids) or all of the user's notifications read. Scoped to them. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  const ids = parsed.success ? parsed.data.ids : undefined;
  const count = await markRead(session.userId, ids);
  return NextResponse.json({ ok: true, count });
}
