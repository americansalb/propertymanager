import { NextResponse } from "next/server";
import { handleServiceError } from "@/lib/authz/api";
import { quoteRespondSchema } from "@/lib/validation/quote";
import { respondToQuote } from "@/lib/services/quote";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

/** Public: a repair person answers through their private link. */
export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!rateLimit(`quote-respond:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many tries. Wait a minute." }, { status: 429 });
  }
  const parsed = quoteRespondSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check what you entered." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await respondToQuote(parsed.data));
  } catch (e) {
    return handleServiceError(e);
  }
}
