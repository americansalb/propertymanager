import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { approveQuote } from "@/lib/services/quote";

type Params = { params: Promise<{ id: string }> };

/** The owner says yes to one price. No money moves. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    return NextResponse.json(await approveQuote(auth.ctx, (await params).id));
  } catch (e) {
    return handleServiceError(e);
  }
}
