import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import { contractorSchema } from "@/lib/validation/quote";
import { createContractor, listContractors } from "@/lib/services/contractor";

export async function GET() {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  return NextResponse.json({ contractors: await listContractors(auth.ctx) });
}

export async function POST(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;
  const parsed = contractorSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await createContractor(auth.ctx, parsed.data), { status: 201 });
  } catch (e) {
    return handleServiceError(e);
  }
}
