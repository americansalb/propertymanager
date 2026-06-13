import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { leaseUpdateSchema } from "@/lib/validation/lease";
import { deleteLease, updateLease } from "@/lib/services/lease";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const parsed = leaseUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const lease = await updateLease(auth.ctx, (await params).id, parsed.data);
    return NextResponse.json({ lease });
  } catch (e) {
    return handleServiceError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    await deleteLease(auth.ctx, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleServiceError(e);
  }
}
