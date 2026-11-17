import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { acceptBidSchema } from "@/lib/validation/project";
import { acceptBid } from "@/lib/services/project";

type Params = { params: Promise<{ id: string }> };

/** The owner says yes to one bid. No money moves. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = acceptBidSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  try {
    return NextResponse.json(await acceptBid(auth.ctx, (await params).id, parsed.data.bidId));
  } catch (e) {
    return handleServiceError(e);
  }
}
