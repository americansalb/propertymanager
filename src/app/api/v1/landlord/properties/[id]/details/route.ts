import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { propertyDetailsSchema } from "@/lib/validation/property";
import { updatePropertyDetails } from "@/lib/services/property";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const parsed = propertyDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    await updatePropertyDetails(auth.ctx, (await params).id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.includes("SESSION_SECRET")) {
      return NextResponse.json({ error: e.message }, { status: 503 });
    }
    return handleServiceError(e);
  }
}
