import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { inviteCreateSchema } from "@/lib/validation/invite";
import { createTenantInvitation } from "@/lib/services/invite";
import { rateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  if (!rateLimit(`invite-create:${auth.ctx.orgId}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many invites at once. Give it a minute." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const parsed = inviteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const result = await createTenantInvitation(auth.ctx, (await params).id, parsed.data.email);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
