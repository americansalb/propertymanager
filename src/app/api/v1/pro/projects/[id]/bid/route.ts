import { NextResponse } from "next/server";
import { handleServiceError, requireProApi } from "@/lib/authz/api";
import { bidSchema } from "@/lib/validation/project";
import { placeBid, withdrawBid } from "@/lib/services/project";

type Params = { params: Promise<{ id: string }> };

/** Bid, or change a bid, on a project near the pro. */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireProApi();
  if (!auth.ok) return auth.res;
  const parsed = bidSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your bid." }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await placeBid(auth.ctx, (await params).id, {
        amountCents: parsed.data.priceDollars,
        amountHighCents: parsed.data.priceHighDollars ?? null,
        availability: parsed.data.availability,
        message: parsed.data.note ?? null,
      }),
      { status: 201 },
    );
  } catch (e) {
    return handleServiceError(e);
  }
}

/** Take a bid back while the owner has not chosen yet. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireProApi();
  if (!auth.ok) return auth.res;
  try {
    return NextResponse.json(await withdrawBid(auth.ctx, (await params).id));
  } catch (e) {
    return handleServiceError(e);
  }
}
