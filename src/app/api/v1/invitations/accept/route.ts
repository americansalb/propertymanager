import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { handleServiceError } from "@/lib/authz/api";
import { inviteAcceptSchema } from "@/lib/validation/invite";
import { acceptInvitation } from "@/lib/services/invite";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

/** Public: the tenant side of an invite link. */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`invite-accept:${ip}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = inviteAcceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  const session = await getSession();
  try {
    const { token, ...input } = parsed.data;
    const result = await acceptInvitation(
      token,
      input,
      session ? { id: session.userId, email: session.email } : null,
    );
    if (result.session) {
      const fresh = await createSession({
        userId: result.session.userId,
        activeRole: "TENANT",
        ip,
        userAgent: req.headers.get("user-agent"),
      });
      await setSessionCookie(fresh.token, fresh.expiresAt);
    }
    return NextResponse.json({ redirect: result.redirect });
  } catch (e) {
    return handleServiceError(e);
  }
}
