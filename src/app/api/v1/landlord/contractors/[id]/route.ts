import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { contractorPatchSchema } from "@/lib/validation/quote";
import { archiveContractor, updateContractor } from "@/lib/services/contractor";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = contractorPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await updateContractor(auth.ctx, (await params).id, parsed.data));
  } catch (e) {
    return handleServiceError(e);
  }
}

/** Takes someone off the list. Their past quotes stay on record. */
export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    await archiveContractor(auth.ctx, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleServiceError(e);
  }
}
