/**
 * Where things are in a building: the water shutoff, the breaker panel,
 * the gas shutoff, the furnace. The owner writes a line and takes a photo
 * once. A tenant sees them when something goes wrong, and so does the
 * repair person who got the job.
 */
import { prisma } from "@/lib/db";
import { NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { SPOTS, SPOT_LABEL, spotFromKind, spotKind, type Spot, type SpotView } from "@/lib/urgent";

type Places = {
  waterShutoffLocation: string | null;
  breakerPanelLocation: string | null;
  gasShutoffLocation: string | null;
  furnaceLocation: string | null;
};

const PLACE_FIELD: Record<Spot, keyof Places> = {
  WATER: "waterShutoffLocation",
  BREAKER: "breakerPanelLocation",
  GAS: "gasShutoffLocation",
  FURNACE: "furnaceLocation",
};

/**
 * Every spot for one building, filled or not. The caller has already made
 * sure the reader may see this building: there is no scoping here.
 */
export async function getPropertySpots(propertyId: string): Promise<SpotView[]> {
  return (await loadSpots(propertyId)).map((s) => ({
    spot: s.spot,
    label: s.label,
    where: s.where,
    photoUrl: s.photoUrl,
  }));
}

/** The owner's view: every spot, with the photo's id so it can be removed. */
export type OwnerSpotView = SpotView & { photoId: string | null };

export async function getOwnerSpots(ctx: OrgCtx, propertyId: string): Promise<OwnerSpotView[]> {
  const owned = await prisma.property.findFirst({
    where: { id: propertyId, orgId: ctx.orgId },
    select: { id: true },
  });
  if (!owned) throw new NotFoundError("Property not found.");
  return loadSpots(propertyId);
}

async function loadSpots(propertyId: string): Promise<OwnerSpotView[]> {
  const [property, photos] = await Promise.all([
    prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        waterShutoffLocation: true,
        breakerPanelLocation: true,
        gasShutoffLocation: true,
        furnaceLocation: true,
      },
    }),
    prisma.attachment.findMany({
      where: { entityType: "Property", entityId: propertyId, kind: { in: SPOTS.map(spotKind) } },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, url: true },
    }),
  ]);
  if (!property) return [];
  return SPOTS.map((spot) => {
    const photo = photos.find((p) => spotFromKind(p.kind) === spot);
    return {
      spot,
      label: SPOT_LABEL[spot],
      where: property[PLACE_FIELD[spot]],
      photoUrl: photo?.url ?? null,
      photoId: photo?.id ?? null,
    };
  });
}
