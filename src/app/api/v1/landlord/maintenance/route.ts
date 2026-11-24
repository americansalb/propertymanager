import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { landlordRepairSchema } from "@/lib/validation/maintenance";
import { createLandlordMaintenanceRequest } from "@/lib/services/maintenance";

/** The owner writes a repair down themselves. */
export async function POST(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = landlordRepairSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createLandlordMaintenanceRequest(auth.ctx, parsed.data), {
      status: 201,
    });
  } catch (e) {
    return handleServiceError(e);
  }
}
