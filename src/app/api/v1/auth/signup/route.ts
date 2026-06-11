import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation/auth";
import { AuthError, signup } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`signup:${ip}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const { token, expiresAt, redirect } = await signup(parsed.data, {
      ip,
      userAgent: req.headers.get("user-agent"),
    });
    await setSessionCookie(token, expiresAt);
    return NextResponse.json({ redirect });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("signup failed", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
