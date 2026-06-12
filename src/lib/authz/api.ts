import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";

export type OrgCtx = { userId: string; orgId: string };

/**
 * API-route guard (JSON, no redirects): authenticated landlord with an
 * active org. orgId always comes from the session - never from the client.
 */
export async function requireOrgApi(): Promise<
  { ok: true; ctx: OrgCtx } | { ok: false; res: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { ok: false, res: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  if (!session.roles.includes("LANDLORD") || !session.activeOrgId) {
    return { ok: false, res: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { ok: true, ctx: { userId: session.userId, orgId: session.activeOrgId } };
}

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

export function handleServiceError(e: unknown): NextResponse {
  if (e instanceof NotFoundError) {
    return NextResponse.json({ error: e.message || "Not found." }, { status: 404 });
  }
  if (e instanceof ConflictError) {
    return NextResponse.json({ error: e.message }, { status: 409 });
  }
  console.error("service error", e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}
