import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { createLeaseFromUnit } from "@/lib/services/lease";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    const lease = await createLeaseFromUnit(auth.ctx, (await params).id);
    return NextResponse.json({ lease }, { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
