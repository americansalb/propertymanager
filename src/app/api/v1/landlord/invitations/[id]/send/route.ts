import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { reissueInvitation } from "@/lib/services/invite";
import { rateLimit } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

/** Re-issue: rotates the token (fresh link + clock) and re-sends the email. */
export async function POST(_req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const id = (await params).id;
  if (!rateLimit(`invite-reissue:${id}`, 3, 5 * 60_000)) {
    return NextResponse.json(
      { error: "That invite was just re-sent. Give it a few minutes." },
      { status: 429 },
    );
  }
  try {
    const result = await reissueInvitation(auth.ctx, id);
    return NextResponse.json(result);
  } catch (e) {
    return handleServiceError(e);
  }
}
