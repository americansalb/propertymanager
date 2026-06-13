import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { revokeInvitation } from "@/lib/services/invite";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    await revokeInvitation(auth.ctx, (await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleServiceError(e);
  }
}
