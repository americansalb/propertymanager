import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { quoteSettingsSchema } from "@/lib/validation/quote";
import { setAutoAsk, setEmergencyLimit } from "@/lib/services/contractor";

export async function PATCH(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = quoteSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const { autoAskQuotes, emergencyLimitDollars } = parsed.data;
    if (autoAskQuotes !== undefined) await setAutoAsk(auth.ctx, autoAskQuotes);
    if (emergencyLimitDollars !== undefined) {
      await setEmergencyLimit(auth.ctx, emergencyLimitDollars);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleServiceError(e);
  }
}
