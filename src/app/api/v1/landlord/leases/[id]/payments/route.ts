import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { recordPaymentSchema } from "@/lib/validation/payment";
import { recordOfflinePayment } from "@/lib/services/rent";

type Params = { params: Promise<{ id: string }> };

/** The owner writes down rent they received outside the app. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = recordPaymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check what you entered." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await recordOfflinePayment(auth.ctx, (await params).id, parsed.data), {
      status: 201,
    });
  } catch (e) {
    return handleServiceError(e);
  }
}
