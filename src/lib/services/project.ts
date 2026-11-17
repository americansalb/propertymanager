/**
 * Projects open to nearby pros. An owner posts a job, or opens a tenant's
 * repair to bids; pros with a public page, in that trade and ZIP code, bid
 * with a price and a time; the owner says yes to one. The winner goes onto
 * the owner's own repair people, so the next repair asks them first.
 *
 * Nothing here moves money. The street address, entry notes and the
 * owner's email go only to the pro who got the job.
 */
import type { MaintStatus, Trade } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { brand } from "@/lib/brand";
import { ConflictError, NotFoundError, type OrgCtx, type ProCtx } from "@/lib/authz/api";
import { notify } from "@/lib/services/notification";
import { sendEmail } from "@/lib/email/send";
import {
  projectNearYouEmail,
  quoteApprovedEmail,
  quoteNotChosenEmail,
} from "@/lib/email/templates/quote";
import { formatQuotePrice } from "@/lib/quotes";
import type { RepairCategory } from "@/lib/quotes";
import {
  bidBlocker,
  bidsCloseAt,
  closesLabel,
  isOpenTrade,
  openTradeForCategory,
} from "@/lib/projects";
import { unitTitle } from "@/lib/units";

const MAX_PROS_EMAILED = 25;
const OPEN_REPAIR: MaintStatus[] = ["SUBMITTED", "ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS"];

function fullWhere(unitNumber: string | null | undefined, address1: string | null, city: string | null): string {
  const unit = unitNumber && unitNumber.toLowerCase() !== "main" ? `${unitTitle(unitNumber)}, ` : "";
  return `${unit}${address1 ?? ""}${city ? `, ${city}` : ""}`;
}

function area(city: string | null, state: string | null, zip: string): string {
  return [city, state].filter(Boolean).join(", ") + (city || state ? ` ${zip}` : zip);
}

async function ownerFace(orgId: string, preferUserId?: string | null) {
  const members = await prisma.membership.findMany({
    where: { orgId, role: { in: ["OWNER", "MANAGER"] } },
    select: { userId: true, role: true, user: { select: { firstName: true, lastName: true, email: true } } },
  });
  const m = members.find((x) => x.userId === preferUserId) ?? members.find((x) => x.role === "OWNER") ?? members[0];
  return m
    ? { name: `${m.user.firstName} ${m.user.lastName}`.trim(), email: m.user.email, userIds: members.map((x) => x.userId) }
    : null;
}

// ── Owner side ──────────────────────────────────────────────────────────────

export type NewProjectInput = {
  repairId?: string;
  propertyId?: string;
  unitId?: string | null;
  trade?: string;
  title?: string;
  description?: string;
  bidDays?: number;
};

export async function createProject(ctx: OrgCtx, input: NewProjectInput): Promise<{ id: string; emailed: number; existing: boolean }> {
  let base: {
    propertyId: string;
    unitId: string | null;
    trade: Trade;
    title: string;
    description: string;
    urgency: "EMERGENCY" | "URGENT" | "NORMAL" | "LOW";
    permissionToEnter: boolean;
    accessNotes: string | null;
    repairId: string | null;
  };

  if (input.repairId) {
    const req = await prisma.maintenanceRequest.findFirst({
      where: { id: input.repairId, orgId: ctx.orgId },
      include: { quotes: { select: { status: true } } },
    });
    if (!req) throw new NotFoundError("Repair not found.");
    if (!OPEN_REPAIR.includes(req.status)) throw new ConflictError("This repair is already finished.");
    if (req.quotes.some((q) => q.status === "APPROVED")) throw new ConflictError("Someone already has this job.");
    const already = await prisma.job.findUnique({ where: { sourceMaintenanceRequestId: req.id }, select: { id: true } });
    if (already) return { id: already.id, emailed: 0, existing: true };
    const trade = (input.trade && isOpenTrade(input.trade) ? input.trade : openTradeForCategory(req.category as RepairCategory)) as Trade | null;
    if (!trade) throw new ConflictError("This kind of repair needs a licensed pro. Ask your own people for it.");
    base = {
      propertyId: req.propertyId,
      unitId: req.unitId,
      trade,
      title: input.title?.trim() || req.title,
      description: input.description?.trim() || req.description,
      urgency: req.urgency,
      permissionToEnter: req.permissionToEnter,
      accessNotes: req.accessNotes,
      repairId: req.id,
    };
  } else {
    if (!input.propertyId) throw new ConflictError("Pick the property.");
    if (!input.trade || !isOpenTrade(input.trade)) throw new ConflictError("Pick the kind of work.");
    if (!input.title?.trim() || !input.description?.trim()) throw new ConflictError("Say what needs doing.");
    base = {
      propertyId: input.propertyId,
      unitId: input.unitId ?? null,
      trade: input.trade as Trade,
      title: input.title.trim(),
      description: input.description.trim(),
      urgency: "NORMAL",
      permissionToEnter: false,
      accessNotes: null,
      repairId: null,
    };
  }

  const property = await prisma.property.findFirst({
    where: { id: base.propertyId, orgId: ctx.orgId },
    select: { id: true, address1: true, city: true, state: true, zipCode: true },
  });
  if (!property) throw new NotFoundError("Property not found.");
  if (base.unitId) {
    const unit = await prisma.unit.findFirst({ where: { id: base.unitId, propertyId: property.id }, select: { id: true } });
    if (!unit) throw new NotFoundError("Unit not found.");
  }

  const now = new Date();
  const deadline = bidsCloseAt(now, Math.min(Math.max(input.bidDays ?? 3, 1), 14));
  const job = await prisma.$transaction(async (tx) => {
    const j = await tx.job.create({
      data: {
        orgId: ctx.orgId,
        posterUserId: ctx.userId,
        sourceMaintenanceRequestId: base.repairId,
        propertyId: property.id,
        unitId: base.unitId,
        address1: property.address1,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        trade: base.trade,
        title: base.title,
        description: base.description,
        urgency: base.urgency,
        status: "OPEN_FOR_BIDS",
        bidDeadline: deadline,
        permissionToEnter: base.permissionToEnter,
        accessNotes: base.accessNotes,
        takeRateBps: 0, // VillageKeep takes nothing from the job
      },
    });
    await tx.jobStatusHistory.create({
      data: { jobId: j.id, fromStatus: null, toStatus: "OPEN_FOR_BIDS", actorUserId: ctx.userId },
    });
    return j;
  });

  // Tell the pros who do this work in this ZIP code.
  const pros = await prisma.proProfile.findMany({
    where: {
      publishedAt: { not: null },
      status: { not: "SUSPENDED" },
      trades: { has: base.trade },
      areas: { some: { zipCode: property.zipCode } },
      user: { status: "ACTIVE" },
    },
    take: MAX_PROS_EMAILED,
    select: { id: true, businessName: true, userId: true, user: { select: { email: true, firstName: true } } },
  });
  let emailed = 0;
  const where = area(property.city, property.state, property.zipCode);
  for (const p of pros) {
    const link = new URL(`/pro/projects/${job.id}`, env.APP_URL).toString();
    await prisma.jobInvite.create({ data: { jobId: job.id, proProfileId: p.id } }).catch(() => undefined);
    await notify({
      userId: p.userId,
      channel: "IN_APP",
      type: "project.new",
      title: `New project near you: ${base.title}`,
      body: `${where}. ${closesLabel(deadline, now)}.`,
      linkUrl: `/pro/projects/${job.id}`,
      refType: "Job",
      refId: job.id,
    });
    const r = await sendEmail({
      to: p.user.email,
      ...projectNearYouEmail({
        brandName: brand.name,
        proName: p.user.firstName,
        title: base.title,
        description: base.description,
        area: where,
        closes: closesLabel(deadline, now),
        link,
      }),
    });
    if (r.sent) emailed++;
  }

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "project.create",
    entityType: "Job",
    entityId: job.id,
    meta: { trade: base.trade, fromRepair: base.repairId != null, prosTold: pros.length },
  });
  return { id: job.id, emailed, existing: false };
}

export type OwnerProjectRow = {
  id: string;
  title: string;
  trade: string;
  status: string;
  where: string;
  bids: number;
  closes: string;
  createdAt: Date;
};

export async function listOwnerProjects(ctx: OrgCtx): Promise<OwnerProjectRow[]> {
  const jobs = await prisma.job.findMany({
    where: { orgId: ctx.orgId },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { bids: { where: { status: { in: ["PENDING", "ACCEPTED"] } }, select: { id: true } } },
  });
  const units = await prisma.unit.findMany({
    where: { id: { in: jobs.map((j) => j.unitId).filter((x): x is string => !!x) } },
    select: { id: true, unitNumber: true },
  });
  const unitNo = new Map(units.map((u) => [u.id, u.unitNumber]));
  return jobs.map((j) => ({
    id: j.id,
    title: j.title,
    trade: j.trade,
    status: j.status,
    where: fullWhere(j.unitId ? unitNo.get(j.unitId) : null, j.address1, j.city),
    bids: j.bids.length,
    closes: closesLabel(j.bidDeadline),
    createdAt: j.createdAt,
  }));
}

export type OwnerBid = {
  id: string;
  status: string;
  amountCents: number;
  amountHighCents: number | null;
  availability: string | null;
  message: string | null;
  createdAt: Date;
  pro: {
    businessName: string;
    slug: string | null;
    phone: string | null;
    email: string;
    listedBy: number;
    jobsApproved: number;
  };
};

export async function getOwnerProject(ctx: OrgCtx, id: string) {
  const job = await prisma.job.findFirst({
    where: { id, orgId: ctx.orgId },
    include: {
      bids: {
        where: { status: { not: "WITHDRAWN" } },
        orderBy: { amountCents: "asc" },
        include: { proProfile: { include: { user: { select: { email: true } } } } },
      },
    },
  });
  if (!job) throw new NotFoundError("Project not found.");
  const unit = job.unitId ? await prisma.unit.findUnique({ where: { id: job.unitId }, select: { unitNumber: true } }) : null;
  const emails = job.bids.map((b) => b.proProfile.user.email);
  const [lists, approved] = await Promise.all([
    prisma.contractor.findMany({ where: { email: { in: emails }, archivedAt: null }, select: { email: true, orgId: true }, distinct: ["email", "orgId"] }),
    prisma.quoteRequest.findMany({ where: { status: "APPROVED", contractor: { email: { in: emails } } }, select: { contractor: { select: { email: true } } } }),
  ]);
  const countBy = (rows: Array<{ email: string | null }>, e: string) => rows.filter((r) => r.email === e).length;
  const accepted = job.bids.find((b) => b.status === "ACCEPTED");
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    trade: job.trade,
    status: job.status,
    where: fullWhere(unit?.unitNumber, job.address1, job.city),
    closes: closesLabel(job.bidDeadline),
    repairId: job.sourceMaintenanceRequestId,
    createdAt: job.createdAt,
    awarded: Boolean(accepted),
    bids: job.bids.map<OwnerBid>((b) => ({
      id: b.id,
      status: b.status,
      amountCents: b.amountCents,
      amountHighCents: b.amountHighCents,
      availability: b.availability,
      message: b.message,
      createdAt: b.createdAt,
      pro: {
        businessName: b.proProfile.businessName,
        slug: b.proProfile.publishedAt ? b.proProfile.slug : null,
        // Contact details only once they have the job.
        phone: b.status === "ACCEPTED" ? b.proProfile.phone || null : null,
        email: b.status === "ACCEPTED" ? b.proProfile.user.email : "",
        listedBy: countBy(lists, b.proProfile.user.email),
        jobsApproved: countBy(approved.map((a) => ({ email: a.contractor.email })), b.proProfile.user.email),
      },
    })),
  };
}

export async function acceptBid(ctx: OrgCtx, jobId: string, bidId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, orgId: ctx.orgId },
    include: { bids: { include: { proProfile: { include: { user: { select: { id: true, email: true, firstName: true } } } } } } },
  });
  if (!job) throw new NotFoundError("Project not found.");
  if (job.status !== "OPEN_FOR_BIDS") throw new ConflictError("This project already went to someone.");
  const bid = job.bids.find((b) => b.id === bidId);
  if (!bid || bid.status !== "PENDING") throw new ConflictError("That bid is no longer open.");

  const price = formatQuotePrice(bid.amountCents, bid.amountHighCents);
  const winner = bid.proProfile;

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.job.updateMany({
      where: { id: job.id, status: "OPEN_FOR_BIDS" },
      data: { status: "AWARDED", awardedBidId: bid.id },
    });
    if (claimed.count === 0) throw new ConflictError("This project already went to someone.");
    await tx.bid.update({ where: { id: bid.id }, data: { status: "ACCEPTED" } });
    await tx.bid.updateMany({
      where: { jobId: job.id, id: { not: bid.id }, status: "PENDING" },
      data: { status: "DECLINED" },
    });
    await tx.jobStatusHistory.create({
      data: { jobId: job.id, fromStatus: "OPEN_FOR_BIDS", toStatus: "AWARDED", actorUserId: ctx.userId, note: `${winner.businessName} at ${price}` },
    });
    // The winner joins the owner's own repair people for next time.
    const listed = await tx.contractor.findFirst({
      where: { orgId: ctx.orgId, email: winner.user.email, archivedAt: null },
      select: { id: true },
    });
    if (!listed) {
      await tx.contractor.create({
        data: {
          orgId: ctx.orgId,
          createdByUserId: ctx.userId,
          name: winner.businessName,
          trades: winner.trades,
          phone: winner.phone || null,
          email: winner.user.email,
          notes: `Won "${job.title}" at ${price}.`,
        },
      });
    }
    // A tenant's repair moves forward and says who is coming.
    if (job.sourceMaintenanceRequestId) {
      const req = await tx.maintenanceRequest.findUnique({ where: { id: job.sourceMaintenanceRequestId } });
      if (req && OPEN_REPAIR.includes(req.status)) {
        const next: MaintStatus = req.status === "SUBMITTED" ? "ACKNOWLEDGED" : req.status;
        if (next !== req.status) {
          await tx.maintenanceRequest.update({ where: { id: req.id }, data: { status: next } });
        }
        await tx.maintenanceStatusHistory.create({
          data: {
            requestId: req.id,
            fromStatus: req.status,
            toStatus: next,
            actorUserId: ctx.userId,
            note: `${winner.businessName} will do this repair.${bid.availability ? ` They can come: ${bid.availability}.` : ""}`,
          },
        });
      }
    }
  });

  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "project.accept_bid",
    entityType: "Job",
    entityId: job.id,
    meta: { bidId: bid.id, amountCents: bid.amountCents },
  });

  // Courtesy messages: none of these may undo the yes.
  try {
    const face = await ownerFace(ctx.orgId, ctx.userId);
    const unit = job.unitId ? await prisma.unit.findUnique({ where: { id: job.unitId }, select: { unitNumber: true } }) : null;
    const where = fullWhere(unit?.unitNumber, job.address1, job.city);
    const req = job.sourceMaintenanceRequestId
      ? await prisma.maintenanceRequest.findUnique({ where: { id: job.sourceMaintenanceRequestId }, select: { createdByUserId: true, origin: true, preferredTimes: true } })
      : null;
    const tenant = req?.origin === "TENANT" ? await prisma.user.findUnique({ where: { id: req.createdByUserId }, select: { id: true, firstName: true } }) : null;
    if (tenant) {
      await notify({
        userId: tenant.id,
        channel: "IN_APP",
        type: "maintenance.update",
        title: `Update: ${job.title}`,
        body: `${winner.businessName} will do this repair.${bid.availability ? ` They can come: ${bid.availability}.` : ""}`,
        linkUrl: "/tenant/maintenance",
        refType: "MaintenanceRequest",
        refId: job.sourceMaintenanceRequestId,
      });
    }
    await notify({
      userId: winner.user.id,
      channel: "IN_APP",
      type: "project.won",
      title: `You got the job: ${job.title}`,
      body: `${face?.name ?? "The owner"} said yes to ${price}.`,
      linkUrl: `/pro/projects/${job.id}`,
      refType: "Job",
      refId: job.id,
    });
    await sendEmail({
      to: winner.user.email,
      ...quoteApprovedEmail({
        brandName: brand.name,
        ownerName: face?.name ?? "The owner",
        ownerEmail: face?.email ?? null,
        contractorName: winner.businessName,
        title: job.title,
        where,
        price,
        availability: bid.availability,
        entry: job.permissionToEnter ? "You may go in even if the tenant is out" : "Only when the tenant is home",
        bestTimes: req?.preferredTimes?.length ? req.preferredTimes.join(", ") : null,
        accessNotes: job.accessNotes,
        tenantFirstName: tenant?.firstName ?? null,
      }),
    });
    for (const other of job.bids) {
      if (other.id === bid.id || other.status !== "PENDING") continue;
      await notify({
        userId: other.proProfile.user.id,
        channel: "IN_APP",
        type: "project.lost",
        title: `Not this time: ${job.title}`,
        body: "The owner went with someone else. Thank you for bidding.",
        linkUrl: `/pro/projects/${job.id}`,
        refType: "Job",
        refId: job.id,
      });
      await sendEmail({
        to: other.proProfile.user.email,
        ...quoteNotChosenEmail({
          brandName: brand.name,
          ownerName: face?.name ?? "The owner",
          contractorName: other.proProfile.businessName,
          title: job.title,
        }),
      });
    }
  } catch (e) {
    console.error("project follow-up failed", e);
  }
  return { ok: true, pro: winner.businessName, price };
}

export async function cancelProject(ctx: OrgCtx, id: string) {
  const job = await prisma.job.findFirst({ where: { id, orgId: ctx.orgId }, include: { bids: { where: { status: "PENDING" }, include: { proProfile: { select: { userId: true } } } } } });
  if (!job) throw new NotFoundError("Project not found.");
  if (job.status !== "OPEN_FOR_BIDS") throw new ConflictError("Only an open project can be taken down.");
  await prisma.$transaction([
    prisma.job.update({ where: { id }, data: { status: "CANCELLED" } }),
    prisma.bid.updateMany({ where: { jobId: id, status: "PENDING" }, data: { status: "EXPIRED" } }),
    prisma.jobStatusHistory.create({ data: { jobId: id, fromStatus: "OPEN_FOR_BIDS", toStatus: "CANCELLED", actorUserId: ctx.userId } }),
  ]);
  for (const b of job.bids) {
    await notify({
      userId: b.proProfile.userId,
      channel: "IN_APP",
      type: "project.cancelled",
      title: `Taken down: ${job.title}`,
      body: "The owner took this project down. Your bid is closed.",
      linkUrl: "/pro/projects",
      refType: "Job",
      refId: id,
    });
  }
  return { ok: true };
}

// ── Pro side ────────────────────────────────────────────────────────────────

async function proContext(ctx: ProCtx) {
  const p = await prisma.proProfile.findUnique({
    where: { id: ctx.proProfileId },
    include: { areas: true },
  });
  if (!p) throw new NotFoundError("Profile not found.");
  return { profile: p, bidder: { published: p.publishedAt != null, trades: p.trades as string[], zips: p.areas.map((a) => a.zipCode) } };
}

export type ProProjectRow = {
  id: string;
  title: string;
  trade: string;
  area: string;
  closes: string;
  bids: number;
  myBid: { status: string; amountCents: number; amountHighCents: number | null } | null;
  createdAt: Date;
};

export async function listProjectsForPro(ctx: ProCtx): Promise<{ near: ProProjectRow[]; mine: ProProjectRow[]; published: boolean; zips: string[]; trades: string[] }> {
  const { bidder } = await proContext(ctx);
  const now = new Date();
  const rows = (jobs: Array<Awaited<ReturnType<typeof prisma.job.findMany>>[number] & { bids: Array<{ proProfileId: string; status: string; amountCents: number; amountHighCents: number | null }> }>) =>
    jobs.map<ProProjectRow>((j) => {
      const mine = j.bids.find((b) => b.proProfileId === ctx.proProfileId) ?? null;
      return {
        id: j.id,
        title: j.title,
        trade: j.trade,
        area: area(j.city, j.state, j.zipCode),
        closes: closesLabel(j.bidDeadline, now),
        bids: j.bids.filter((b) => b.status === "PENDING" || b.status === "ACCEPTED").length,
        myBid: mine ? { status: mine.status, amountCents: mine.amountCents, amountHighCents: mine.amountHighCents } : null,
        createdAt: j.createdAt,
      };
    });
  const bidSelect = { select: { proProfileId: true, status: true, amountCents: true, amountHighCents: true } } as const;
  const [near, mine] = await Promise.all([
    bidder.trades.length > 0 && bidder.zips.length > 0
      ? prisma.job.findMany({
          where: {
            status: "OPEN_FOR_BIDS",
            bidDeadline: { gt: now },
            trade: { in: bidder.trades as Trade[] },
            zipCode: { in: bidder.zips },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { bids: bidSelect },
        })
      : Promise.resolve([]),
    prisma.job.findMany({
      where: { bids: { some: { proProfileId: ctx.proProfileId } } },
      orderBy: { updatedAt: "desc" },
      take: 30,
      include: { bids: bidSelect },
    }),
  ]);
  const mineIds = new Set(mine.map((m) => m.id));
  return {
    near: rows(near.filter((j) => !mineIds.has(j.id))),
    mine: rows(mine),
    ...bidder,
  };
}

export async function getProjectForPro(ctx: ProCtx, jobId: string) {
  const { bidder } = await proContext(ctx);
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { bids: { select: { id: true, proProfileId: true, status: true, amountCents: true, amountHighCents: true, availability: true, message: true } } },
  });
  if (!job) throw new NotFoundError("Project not found.");
  const mine = job.bids.find((b) => b.proProfileId === ctx.proProfileId) ?? null;
  const inArea = bidder.trades.includes(job.trade) && bidder.zips.includes(job.zipCode);
  // A pro sees a project in their area, or one they bid on. Nothing else.
  if (!mine && !inArea) throw new NotFoundError("Project not found.");
  const won = mine?.status === "ACCEPTED";
  const unit = won && job.unitId ? await prisma.unit.findUnique({ where: { id: job.unitId }, select: { unitNumber: true } }) : null;
  const face = won && job.orgId ? await ownerFace(job.orgId, job.posterUserId) : null;
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    trade: job.trade,
    status: job.status,
    area: area(job.city, job.state, job.zipCode),
    closes: closesLabel(job.bidDeadline),
    bids: job.bids.filter((b) => b.status === "PENDING" || b.status === "ACCEPTED").length,
    blocker: mine && mine.status !== "WITHDRAWN" ? null : bidBlocker(bidder, job),
    canChangeBid: mine?.status === "PENDING" && job.status === "OPEN_FOR_BIDS",
    myBid: mine
      ? { status: mine.status, amountCents: mine.amountCents, amountHighCents: mine.amountHighCents, availability: mine.availability, message: mine.message }
      : null,
    // Only the pro who got the job learns the door.
    won: won
      ? {
          where: fullWhere(unit?.unitNumber, job.address1, job.city),
          entry: job.permissionToEnter ? "You may go in even if the tenant is out" : "Only when the tenant is home",
          accessNotes: job.accessNotes,
          ownerName: face?.name ?? null,
          ownerEmail: face?.email ?? null,
        }
      : null,
  };
}

export async function placeBid(
  ctx: ProCtx,
  jobId: string,
  input: { amountCents: number; amountHighCents: number | null; availability: string; message: string | null },
) {
  const { profile, bidder } = await proContext(ctx);
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError("Project not found.");
  const existing = await prisma.bid.findUnique({
    where: { jobId_proProfileId: { jobId, proProfileId: ctx.proProfileId } },
  });
  if (existing && existing.status !== "PENDING" && existing.status !== "WITHDRAWN") {
    throw new ConflictError("This project is no longer taking bids.");
  }
  const blocker = bidBlocker(bidder, job);
  if (blocker) throw new ConflictError(blocker);
  const high = input.amountHighCents != null && input.amountHighCents > input.amountCents ? input.amountHighCents : null;
  const bid = await prisma.bid.upsert({
    where: { jobId_proProfileId: { jobId, proProfileId: ctx.proProfileId } },
    create: { jobId, proProfileId: ctx.proProfileId, amountCents: input.amountCents, amountHighCents: high, availability: input.availability, message: input.message },
    update: { amountCents: input.amountCents, amountHighCents: high, availability: input.availability, message: input.message, status: "PENDING" },
  });
  await prisma.jobInvite.updateMany({ where: { jobId, proProfileId: ctx.proProfileId }, data: { status: "BID", respondedAt: new Date() } });

  if (job.orgId) {
    const face = await ownerFace(job.orgId);
    for (const userId of face?.userIds ?? []) {
      await notify({
        userId,
        channel: "EMAIL",
        type: "project.bid",
        title: `${existing ? "Changed bid" : "New bid"}: ${profile.businessName}, ${formatQuotePrice(input.amountCents, high)}`,
        body: `For "${job.title}". They can come: ${input.availability}.`,
        linkUrl: `/landlord/projects/${job.id}`,
        refType: "Job",
        refId: job.id,
      });
    }
  }
  void audit({ actorUserId: ctx.userId, action: existing ? "bid.update" : "bid.create", entityType: "Bid", entityId: bid.id, meta: { jobId, amountCents: input.amountCents } });
  return { id: bid.id };
}

export async function withdrawBid(ctx: ProCtx, jobId: string) {
  const res = await prisma.bid.updateMany({
    where: { jobId, proProfileId: ctx.proProfileId, status: "PENDING" },
    data: { status: "WITHDRAWN" },
  });
  if (res.count === 0) throw new ConflictError("There is no open bid to take back.");
  return { ok: true };
}
