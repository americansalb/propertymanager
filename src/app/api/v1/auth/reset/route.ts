import { NextResponse } from "next/server";
import { resetSchema } from "@/lib/validation/auth";
import { resetPassword } from "@/lib/services/password-reset";
import { AuthError } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

/** Public: sets the new password from a reset link and signs this device in. */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`reset:${ip}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  }
  const parsed = resetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the new password." },
      { status: 400 },
    );
  }
  try {
    const result = await resetPassword(parsed.data.token, parsed.data.password, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    if (result.token && result.expiresAt) await setSessionCookie(result.token, result.expiresAt);
    return NextResponse.json({ redirect: result.redirect });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("password reset failed", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
