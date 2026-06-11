import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { propertyCreateSchema } from "@/lib/validation/property";
import { createProperty, listProperties } from "@/lib/services/property";

export async function GET() {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const properties = await listProperties(auth.ctx);
  return NextResponse.json({ properties });
}

export async function POST(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const body = await req.json().catch(() => null);
  const parsed = propertyCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    const property = await createProperty(auth.ctx, parsed.data);
    return NextResponse.json({ property }, { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
