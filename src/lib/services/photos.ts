import sharp from "sharp";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { SPOTS, spotKind, type Spot } from "@/lib/urgent";

/**
 * Photos for properties and units. Inputs are resized to <=1600px webp so
 * the shared Postgres stays light (typical stored size 100-350KB), counts
 * are capped per entity, and every byte lives in the app's own schema.
 */

export const PHOTO_LIMITS = {
  Property: 12,
  Unit: 8,
} as const;

export type PhotoEntityType = keyof typeof PHOTO_LIMITS;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_INPUT = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/avif"]);

export function isAllowedImageType(mime: string): boolean {
  return ALLOWED_INPUT.has(mime);
}

/** Org-scoped existence check for the photo's parent entity. */
async function assertEntityInOrg(ctx: OrgCtx, entityType: PhotoEntityType, entityId: string) {
  const found =
    entityType === "Property"
      ? await prisma.property.findFirst({ where: { id: entityId, orgId: ctx.orgId }, select: { id: true } })
      : await prisma.unit.findFirst({ where: { id: entityId, orgId: ctx.orgId }, select: { id: true } });
  if (!found) throw new NotFoundError(`${entityType} not found.`);
}

export function listPhotos(ctx: OrgCtx, entityType: PhotoEntityType, entityId: string) {
  return prisma.attachment.findMany({
    where: { orgId: ctx.orgId, entityType, entityId, kind: "PHOTO" },
    orderBy: { createdAt: "asc" },
    select: { id: true, url: true, createdAt: true },
  });
}

/** Resize, store the bytes, and record the attachment. */
async function storeImage(
  ctx: OrgCtx,
  entityType: PhotoEntityType,
  entityId: string,
  kind: string,
  bytes: Buffer,
) {
  const processed = await sharp(bytes, { failOn: "error" })
    .rotate() // honor EXIF orientation
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const blob = await prisma.fileBlob.create({
    // Copy into a plain ArrayBuffer-backed view; Buffer's typing is wider
    // than Prisma's Bytes input expects.
    data: {
      bytes: Uint8Array.from(processed),
      mimeType: "image/webp",
      sizeBytes: processed.length,
    },
    select: { id: true },
  });
  const attachment = await prisma.attachment.create({
    data: {
      entityType,
      entityId,
      kind,
      storageKey: blob.id,
      url: `/api/v1/files/${blob.id}`,
      mimeType: "image/webp",
      sizeBytes: processed.length,
      uploadedByUserId: ctx.userId,
      orgId: ctx.orgId,
    },
    select: { id: true, url: true },
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "photo.add",
    entityType,
    entityId,
    meta: { attachmentId: attachment.id, kind, sizeBytes: processed.length },
  });
  return attachment;
}

export async function addPhoto(
  ctx: OrgCtx,
  entityType: PhotoEntityType,
  entityId: string,
  input: { bytes: Buffer; mimeType: string },
) {
  await assertEntityInOrg(ctx, entityType, entityId);

  const count = await prisma.attachment.count({
    where: { orgId: ctx.orgId, entityType, entityId, kind: "PHOTO" },
  });
  if (count >= PHOTO_LIMITS[entityType]) {
    throw new ConflictError(
      `${entityType === "Unit" ? "Units" : "Properties"} hold up to ${PHOTO_LIMITS[entityType]} photos. Remove one first.`,
    );
  }
  return storeImage(ctx, entityType, entityId, "PHOTO", input.bytes);
}

/**
 * The photo of one spot in a building: the water shutoff, the breaker
 * panel. There is one per spot, so a new photo takes the old one's place.
 */
export async function setSpotPhoto(
  ctx: OrgCtx,
  propertyId: string,
  spot: Spot,
  input: { bytes: Buffer; mimeType: string },
) {
  await assertEntityInOrg(ctx, "Property", propertyId);
  const kind = spotKind(spot);
  const old = await prisma.attachment.findMany({
    where: { orgId: ctx.orgId, entityType: "Property", entityId: propertyId, kind },
    select: { id: true, storageKey: true },
  });
  // Store the new one first: a bad file must not cost them the old photo.
  const attachment = await storeImage(ctx, "Property", propertyId, kind, input.bytes);
  if (old.length > 0) {
    await prisma.attachment.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
    await prisma.fileBlob.deleteMany({ where: { id: { in: old.map((o) => o.storageKey) } } });
  }
  return attachment;
}

export async function deletePhoto(ctx: OrgCtx, attachmentId: string) {
  const attachment = await prisma.attachment.findFirst({
    where: {
      id: attachmentId,
      orgId: ctx.orgId,
      kind: { in: ["PHOTO", ...SPOTS.map(spotKind)] },
    },
    select: { id: true, storageKey: true, entityType: true, entityId: true },
  });
  if (!attachment) throw new NotFoundError("Photo not found.");
  await prisma.attachment.delete({ where: { id: attachment.id } });
  await prisma.fileBlob.deleteMany({ where: { id: attachment.storageKey } });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "photo.delete",
    entityType: attachment.entityType,
    entityId: attachment.entityId,
  });
}

/** Serve bytes only to members of the owning org. */
export async function getPhotoForOrg(orgId: string, blobId: string) {
  const attachment = await prisma.attachment.findFirst({
    where: { storageKey: blobId, orgId },
    select: { id: true },
  });
  if (!attachment) return null;
  return prisma.fileBlob.findUnique({
    where: { id: blobId },
    select: { bytes: true, mimeType: true },
  });
}

/**
 * A tenant may see the photos of the spots in the building they live in,
 * and nothing else: not the gallery, not another building.
 */
export async function getSpotPhotoForTenant(userId: string, blobId: string) {
  const attachment = await prisma.attachment.findFirst({
    where: {
      storageKey: blobId,
      entityType: "Property",
      kind: { in: SPOTS.map(spotKind) },
    },
    select: { entityId: true },
  });
  if (!attachment) return null;
  const lives = await prisma.leaseTenant.count({
    where: {
      tenantProfile: { userId },
      lease: {
        status: { in: ["DRAFT", "ACTIVE"] },
        unit: { propertyId: attachment.entityId },
      },
    },
  });
  if (lives === 0) return null;
  return prisma.fileBlob.findUnique({
    where: { id: blobId },
    select: { bytes: true, mimeType: true },
  });
}
