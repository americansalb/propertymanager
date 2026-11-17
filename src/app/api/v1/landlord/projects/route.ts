import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { newProjectSchema } from "@/lib/validation/project";
import { createProject } from "@/lib/services/project";

/** Post a project, or open a tenant's repair to nearby pros. */
export async function POST(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = newProjectSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check what you entered." }, { status: 400 });
  }
  try {
    return NextResponse.json(await createProject(auth.ctx, parsed.data), { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
