import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { maintenanceRespondSchema } from "@/lib/validation/maintenance";
import { respondToMaintenance } from "@/lib/services/maintenance";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const parsed = maintenanceRespondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const result = await respondToMaintenance(auth.ctx, (await params).id, parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    return handleServiceError(e);
  }
}
