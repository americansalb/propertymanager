import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { handleServiceError } from "@/lib/authz/api";
import { emergencyReportSchema } from "@/lib/validation/maintenance";
import { createTenantEmergency } from "@/lib/services/maintenance";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!session.roles.includes("TENANT")) {
    return NextResponse.json({ error: "Tenants only." }, { status: 403 });
  }
  const parsed = emergencyReportSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Pick what is happening and try again." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createTenantEmergency(session.userId, parsed.data), {
      status: 201,
    });
  } catch (e) {
    return handleServiceError(e);
  }
}
