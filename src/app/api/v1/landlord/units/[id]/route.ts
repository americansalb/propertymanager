import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { unitInputSchema } from "@/lib/validation/property";
import { deleteUnit, updateUnit } from "@/lib/services/property";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const parsed = unitInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const unit = await updateUnit(auth.ctx, (await params).id, parsed.data);
    return NextResponse.json({ unit });
  } catch (e) {
    return handleServiceError(e);
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    await deleteUnit(auth.ctx, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleServiceError(e);
  }
}
