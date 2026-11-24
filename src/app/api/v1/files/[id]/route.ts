import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { getPhotoForOrg, getSpotPhotoForTenant } from "@/lib/services/photos";

type Params = { params: Promise<{ id: string }> };

/**
 * Photo bytes for the people allowed to see them: members of the owning
 * org, and a tenant for the spots (water shutoff, breaker panel) of the
 * building they live in. Private cache: URLs are stable per blob.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;
  let blob = session.activeOrgId ? await getPhotoForOrg(session.activeOrgId, id) : null;
  if (!blob && session.roles.includes("TENANT")) {
    blob = await getSpotPhotoForTenant(session.userId, id);
  }
  if (!blob) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Copy into a plain ArrayBuffer-backed view; Buffer's typing is wider.
  return new NextResponse(Uint8Array.from(blob.bytes), {
    headers: {
      "Content-Type": blob.mimeType,
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
