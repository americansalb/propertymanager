import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { unitInputSchema } from "@/lib/validation/property";
import { createUnit } from "@/lib/services/property";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const parsed = unitInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const unit = await createUnit(auth.ctx, (await params).id, parsed.data);
    return NextResponse.json({ unit }, { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
