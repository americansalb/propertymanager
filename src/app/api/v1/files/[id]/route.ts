import { NextResponse } from "next/server";
import { getSession } from "@/lib/authz";
import { getPhotoForOrg } from "@/lib/services/photos";

type Params = { params: Promise<{ id: string }> };

/** Org-scoped photo bytes. Private cache: URLs are stable per blob. */
export async function GET(_req: Request, { params }: Params) {
  const session = await getSession();
  if (!session?.activeOrgId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const blob = await getPhotoForOrg(session.activeOrgId, (await params).id);
  if (!blob) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Copy into a plain ArrayBuffer-backed view; Buffer's typing is wider.
  return new NextResponse(Uint8Array.from(blob.bytes), {
    headers: {
      "Content-Type": blob.mimeType,
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
