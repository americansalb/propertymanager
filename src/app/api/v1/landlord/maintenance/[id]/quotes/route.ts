import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { askQuotesSchema } from "@/lib/validation/quote";
import { askForQuotes } from "@/lib/services/quote";

type Params = { params: Promise<{ id: string }> };

/** Ask the owner's repair people for a price on this repair. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = askQuotesSchema.safeParse((await req.json().catch(() => null)) ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  try {
    const result = await askForQuotes({
      orgId: auth.ctx.orgId,
      actorUserId: auth.ctx.userId,
      requestId: (await params).id,
      contractorIds: parsed.data.contractorIds,
    });
    return NextResponse.json(result);
  } catch (e) {
    return handleServiceError(e);
  }
}
