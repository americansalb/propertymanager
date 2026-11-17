import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { voidOfflinePayment } from "@/lib/services/rent";

type Params = { params: Promise<{ id: string }> };

/** Undo a payment the owner recorded by mistake. Nothing is deleted. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    return NextResponse.json(await voidOfflinePayment(auth.ctx, (await params).id));
  } catch (e) {
    return handleServiceError(e);
  }
}
