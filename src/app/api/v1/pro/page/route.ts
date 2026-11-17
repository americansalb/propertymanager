import { NextResponse } from "next/server";
import { handleServiceError, requireProApi } from "@/lib/authz/api";
import { proBasicsSchema } from "@/lib/validation/pro";
import { updateProBasics } from "@/lib/services/pro";

export async function PATCH(req: Request) {
  const auth = await requireProApi();
  if (!auth.ok) return auth.res;
  const parsed = proBasicsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check what you entered." },
      { status: 400 },
    );
  }
  const { hourlyRateDollars, tripChargeDollars, ...rest } = parsed.data;
  try {
    return NextResponse.json(
      await updateProBasics(auth.ctx, {
        ...rest,
        ...(hourlyRateDollars !== undefined ? { hourlyRateCents: hourlyRateDollars } : {}),
        ...(tripChargeDollars !== undefined ? { tripChargeCents: tripChargeDollars } : {}),
      }),
    );
  } catch (e) {
    return handleServiceError(e);
  }
}
