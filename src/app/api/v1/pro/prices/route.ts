import { NextResponse } from "next/server";
import { handleServiceError, requireProApi } from "@/lib/authz/api";
import { proPriceSchema } from "@/lib/validation/pro";
import { setProPrice } from "@/lib/services/pro";

/** Set, change or clear one starting price. */
export async function POST(req: Request) {
  const auth = await requireProApi();
  if (!auth.ok) return auth.res;
  const parsed = proPriceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the price." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await setProPrice(auth.ctx, parsed.data.taskKey, parsed.data.fromDollars));
  } catch (e) {
    return handleServiceError(e);
  }
}
