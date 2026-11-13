import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { quoteSettingsSchema } from "@/lib/validation/quote";
import { setAutoAsk } from "@/lib/services/contractor";

export async function PATCH(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = quoteSettingsSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  try {
    await setAutoAsk(auth.ctx, parsed.data.autoAskQuotes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleServiceError(e);
  }
}
