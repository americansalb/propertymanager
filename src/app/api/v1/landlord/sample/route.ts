import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { createSample } from "@/lib/services/sample";

export async function POST() {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    const property = await createSample(auth.ctx);
    return NextResponse.json({ property }, { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
