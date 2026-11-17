import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { cancelProject } from "@/lib/services/project";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  try {
    return NextResponse.json(await cancelProject(auth.ctx, (await params).id));
  } catch (e) {
    return handleServiceError(e);
  }
}
