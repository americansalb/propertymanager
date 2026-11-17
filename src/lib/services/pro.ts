/**
 * A repair pro's public page: what they do, what they charge, where they
 * work, all in the open. The pro writes their own facts; the system adds
 * the ones it can stand behind (email confirmed, how many owners keep them
 * on their list, jobs approved through VillageKeep). Nothing here says
 * "verified": each fact says exactly what was checked.
 */
import type { Trade } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { ConflictError, NotFoundError, type ProCtx } from "@/lib/authz/api";
import {
  CATALOG,
  catalogTask,
  missingForPublish,
  parseZips,
  slugify,
  type PriceUnit,
} from "@/lib/pro-catalog";

export type ProPrices = Array<{ taskKey: string; label: string; unit: PriceUnit; fromCents: number }>;

export type ProPageView = {
  businessName: string;
  firstName: string;
  email: string;
  emailConfirmed: boolean;
  bio: string | null;
  trades: string[];
  hourlyRateCents: number | null;
  tripChargeCents: number | null;
  licenseNumber: string | null;
  licenseState: string | null;
  zips: string[];
  prices: ProPrices;
  published: boolean;
  publicUrl: string | null;
  missing: string[];
  listedBy: number;
  jobsApproved: number;
};

/** How many owners keep this person on their repair list, and how many jobs they got. */
async function trackRecord(email: string): Promise<{ listedBy: number; jobsApproved: number }> {
  const lists = await prisma.contractor.findMany({
    where: { email, archivedAt: null },
    select: { orgId: true },
    distinct: ["orgId"],
  });
  const jobsApproved = await prisma.quoteRequest.count({
    where: { status: "APPROVED", contractor: { email } },
  });
  return { listedBy: lists.length, jobsApproved };
}

function publicUrl(slug: string | null): string | null {
  return slug ? new URL(`/pros/${slug}`, env.APP_URL).toString() : null;
}

async function load(ctx: ProCtx) {
  const p = await prisma.proProfile.findUnique({
    where: { id: ctx.proProfileId },
    include: {
      user: { select: { firstName: true, email: true, emailVerifiedAt: true } },
      prices: true,
      areas: { orderBy: { zipCode: "asc" } },
    },
  });
  if (!p) throw new NotFoundError("Profile not found.");
  return p;
}

function pricesOf(rows: Array<{ taskKey: string; fromCents: number }>): ProPrices {
  // Catalog order, so the page reads the same way every time.
  const byKey = new Map(rows.map((r) => [r.taskKey, r.fromCents]));
  return CATALOG.filter((c) => byKey.has(c.key)).map((c) => ({
    taskKey: c.key,
    label: c.label,
    unit: c.unit,
    fromCents: byKey.get(c.key)!,
  }));
}

export async function getProPage(ctx: ProCtx): Promise<ProPageView> {
  const p = await load(ctx);
  const record = await trackRecord(p.user.email);
  const missing = missingForPublish({
    emailConfirmed: p.user.emailVerifiedAt != null,
    trades: p.trades,
    zipCount: p.areas.length,
    priceCount: p.prices.length,
    hourlyRateCents: p.hourlyRateCents,
  });
  return {
    businessName: p.businessName,
    firstName: p.user.firstName,
    email: p.user.email,
    emailConfirmed: p.user.emailVerifiedAt != null,
    bio: p.bio,
    trades: p.trades,
    hourlyRateCents: p.hourlyRateCents,
    tripChargeCents: p.tripChargeCents,
    licenseNumber: p.licenseNumber,
    licenseState: p.licenseState,
    zips: p.areas.map((a) => a.zipCode),
    prices: pricesOf(p.prices),
    published: p.publishedAt != null,
    publicUrl: p.publishedAt ? publicUrl(p.slug) : null,
    missing,
    ...record,
  };
}

export type ProBasicsPatch = {
  businessName?: string;
  bio?: string | null;
  hourlyRateCents?: number | null;
  tripChargeCents?: number | null;
  licenseNumber?: string | null;
  licenseState?: string | null;
  trades?: Trade[];
  zips?: string;
};

/** If they have nothing left to show, the page comes down by itself. */
async function hideIfEmpty(ctx: ProCtx) {
  const page = await getProPage(ctx);
  if (page.published && page.missing.length > 0) {
    await prisma.proProfile.update({ where: { id: ctx.proProfileId }, data: { publishedAt: null } });
  }
}

export async function updateProBasics(ctx: ProCtx, patch: ProBasicsPatch) {
  await load(ctx);
  await prisma.$transaction(async (tx) => {
    await tx.proProfile.update({
      where: { id: ctx.proProfileId },
      data: {
        ...(patch.businessName !== undefined ? { businessName: patch.businessName } : {}),
        ...(patch.bio !== undefined ? { bio: patch.bio } : {}),
        ...(patch.hourlyRateCents !== undefined ? { hourlyRateCents: patch.hourlyRateCents } : {}),
        ...(patch.tripChargeCents !== undefined ? { tripChargeCents: patch.tripChargeCents } : {}),
        ...(patch.licenseNumber !== undefined ? { licenseNumber: patch.licenseNumber } : {}),
        ...(patch.licenseState !== undefined ? { licenseState: patch.licenseState } : {}),
        ...(patch.trades !== undefined ? { trades: patch.trades } : {}),
      },
    });
    if (patch.trades !== undefined) {
      // Prices for work they no longer do go with it.
      const keep = CATALOG.filter((c) => patch.trades!.includes(c.trade as Trade)).map((c) => c.key);
      await tx.proPrice.deleteMany({
        where: { proProfileId: ctx.proProfileId, taskKey: { notIn: keep } },
      });
    }
    if (patch.zips !== undefined) {
      const zips = parseZips(patch.zips);
      await tx.proServiceArea.deleteMany({ where: { proProfileId: ctx.proProfileId } });
      if (zips.length > 0) {
        await tx.proServiceArea.createMany({
          data: zips.map((zipCode) => ({ proProfileId: ctx.proProfileId, zipCode })),
        });
      }
    }
  });
  await hideIfEmpty(ctx);
  return { ok: true };
}

/** Set, change or (with null) remove a starting price for one job. */
export async function setProPrice(ctx: ProCtx, taskKey: string, fromCents: number | null) {
  const task = catalogTask(taskKey);
  if (!task) throw new NotFoundError("That job is not on the list.");
  const p = await load(ctx);
  if (!p.trades.includes(task.trade as Trade)) {
    throw new ConflictError("Add that trade to what you do first.");
  }
  if (fromCents == null) {
    await prisma.proPrice.deleteMany({ where: { proProfileId: p.id, taskKey } });
    await hideIfEmpty(ctx);
  } else {
    await prisma.proPrice.upsert({
      where: { proProfileId_taskKey: { proProfileId: p.id, taskKey } },
      create: { proProfileId: p.id, taskKey, fromCents },
      update: { fromCents },
    });
  }
  return { ok: true };
}

async function freeSlug(base: string, selfId: string): Promise<string> {
  for (let n = 1; n < 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await prisma.proProfile.findFirst({
      where: { slug: candidate, id: { not: selfId } },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function setPublished(ctx: ProCtx, publish: boolean) {
  const p = await load(ctx);
  if (!publish) {
    await prisma.proProfile.update({ where: { id: p.id }, data: { publishedAt: null } });
    return { published: false, url: null };
  }
  const page = await getProPage(ctx);
  if (page.missing.length > 0) {
    throw new ConflictError(`First: ${page.missing.join(", ").toLowerCase()}.`);
  }
  const slug = p.slug ?? (await freeSlug(slugify(p.businessName), p.id));
  await prisma.proProfile.update({
    where: { id: p.id },
    data: { slug, publishedAt: p.publishedAt ?? new Date(), status: p.status === "DRAFT" ? "ACTIVE" : p.status },
  });
  void audit({
    actorUserId: ctx.userId,
    action: "pro.publish",
    entityType: "ProProfile",
    entityId: p.id,
  });
  return { published: true, url: publicUrl(slug) };
}

// ── The public page ────────────────────────────────────────────────────────

export type PublicPro = {
  id: string;
  slug: string;
  businessName: string;
  bio: string | null;
  trades: string[];
  hourlyRateCents: number | null;
  tripChargeCents: number | null;
  licenseNumber: string | null;
  licenseState: string | null;
  zips: string[];
  prices: ProPrices;
  memberSince: Date;
  listedBy: number;
  jobsApproved: number;
};

export async function getPublicPro(slug: string): Promise<PublicPro | null> {
  const p = await prisma.proProfile.findUnique({
    where: { slug },
    include: {
      user: { select: { email: true, emailVerifiedAt: true, status: true } },
      prices: true,
      areas: { orderBy: { zipCode: "asc" } },
    },
  });
  if (!p || !p.publishedAt || p.user.status !== "ACTIVE" || p.status === "SUSPENDED") return null;
  const record = await trackRecord(p.user.email);
  return {
    id: p.id,
    slug,
    businessName: p.businessName,
    bio: p.bio,
    trades: p.trades,
    hourlyRateCents: p.hourlyRateCents,
    tripChargeCents: p.tripChargeCents,
    licenseNumber: p.licenseNumber,
    licenseState: p.licenseState,
    zips: p.areas.map((a) => a.zipCode),
    prices: pricesOf(p.prices),
    memberSince: p.createdAt,
    ...record,
  };
}

/**
 * An owner adds a published pro to their own repair people. The pro agreed
 * to this when they made their page public: owners who add them see their
 * phone and email.
 */
export async function addPublicProToList(
  ctx: { userId: string; orgId: string },
  slug: string,
): Promise<{ id: string; already: boolean }> {
  const p = await prisma.proProfile.findUnique({
    where: { slug },
    include: { user: { select: { email: true } } },
  });
  if (!p || !p.publishedAt) throw new NotFoundError("That page is not public.");
  const existing = await prisma.contractor.findFirst({
    where: { orgId: ctx.orgId, email: p.user.email, archivedAt: null },
    select: { id: true },
  });
  if (existing) return { id: existing.id, already: true };
  const c = await prisma.contractor.create({
    data: {
      orgId: ctx.orgId,
      createdByUserId: ctx.userId,
      name: p.businessName,
      trades: p.trades,
      phone: p.phone || null,
      email: p.user.email,
      notes: `Added from their ${new URL(env.APP_URL).host} page.`,
    },
  });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "contractor.add_from_pro_page",
    entityType: "Contractor",
    entityId: c.id,
    meta: { proProfileId: p.id },
  });
  return { id: c.id, already: false };
}
