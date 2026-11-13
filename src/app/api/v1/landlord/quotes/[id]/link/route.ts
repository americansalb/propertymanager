import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { reissueQuoteLink } from "@/lib/services/quote";

type Params = { params: Promise<{ id: string }> };

/** A fresh private link for one repair person, so the owner can text it. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    return NextResponse.json(await reissueQuoteLink(auth.ctx, (await params).id));
  } catch (e) {
    return handleServiceError(e);
  }
}
