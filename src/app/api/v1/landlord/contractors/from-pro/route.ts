import { NextResponse } from "next/server";
import { z } from "zod";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { addPublicProToList } from "@/lib/services/pro";

/** An owner adds a pro from their public page to their own repair people. */
export async function POST(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = z.object({ slug: z.string().min(1).max(80) }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  try {
    return NextResponse.json(await addPublicProToList(auth.ctx, parsed.data.slug));
  } catch (e) {
    return handleServiceError(e);
  }
}
