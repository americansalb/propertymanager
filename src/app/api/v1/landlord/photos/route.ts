import { NextResponse } from "next/server";
import { handleServiceError, requireOrgApi } from "@/lib/authz/api";
import {
  addPhoto,
  isAllowedImageType,
  MAX_UPLOAD_BYTES,
  type PhotoEntityType,
} from "@/lib/services/photos";

export async function POST(req: Request) {
  const auth = await requireOrgApi();
  if (!auth.ok) return auth.res;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Send a multipart form." }, { status: 400 });

  const entityType = form.get("entityType");
  const entityId = form.get("entityId");
  const file = form.get("file");
  if (
    (entityType !== "Property" && entityType !== "Unit") ||
    typeof entityId !== "string" ||
    !(file instanceof File)
  ) {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!isAllowedImageType(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, WebP, HEIC, or AVIF image." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Photos up to 8MB, please." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const attachment = await addPhoto(auth.ctx, entityType as PhotoEntityType, entityId, {
      bytes,
      mimeType: file.type,
    });
    return NextResponse.json({ photo: attachment }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && /Input buffer|unsupported image/i.test(e.message)) {
      return NextResponse.json({ error: "That file doesn't look like an image." }, { status: 400 });
    }
    return handleServiceError(e);
  }
}
