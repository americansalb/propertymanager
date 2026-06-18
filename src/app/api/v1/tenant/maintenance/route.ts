import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { handleServiceError } from "@/lib/authz/api";
import { maintenanceRequestSchema } from "@/lib/validation/maintenance";
import { createTenantMaintenanceRequest } from "@/lib/services/maintenance";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!session.roles.includes("TENANT")) {
    return NextResponse.json({ error: "Tenants only." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const parsed = maintenanceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the form and try again." },
      { status: 400 },
    );
  }
  try {
    const result = await createTenantMaintenanceRequest(session.userId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
