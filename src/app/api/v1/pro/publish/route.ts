import { NextResponse } from "next/server";
import { handleServiceError, requireProApi } from "@/lib/authz/api";
import { publishSchema } from "@/lib/validation/pro";
import { setPublished } from "@/lib/services/pro";

/** Make the pro's page public, or take it down. */
export async function POST(req: Request) {
  const auth = await requireProApi();
  if (!auth.ok) return auth.res;
  const parsed = publishSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  try {
    return NextResponse.json(await setPublished(auth.ctx, parsed.data.publish));
  } catch (e) {
    return handleServiceError(e);
  }
}
