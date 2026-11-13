/**
 * The owner's own repair people: their plumber, locksmith, handyman. A name,
 * what they do, and a way to reach them. Nobody here has an account.
 * Removing someone archives them, so the quotes they gave stay on record.
 */
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import type { ContractorInput, ContractorPatch } from "@/lib/validation/quote";

export type ContractorView = {
  id: string;
  name: string;
  trades: string[];
  phone: string | null;
  email: string | null;
  notes: string | null;
  autoApproveCents: number | null;
  /** Jobs this person was approved for. */
  jobsWon: number;
};

export async function listContractors(ctx: OrgCtx): Promise<ContractorView[]> {
  const rows = await prisma.contractor.findMany({
    where: { orgId: ctx.orgId, archivedAt: null },
    orderBy: { name: "asc" },
    include: { _count: { select: { quotes: { where: { status: "APPROVED" } } } } },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    trades: c.trades,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    autoApproveCents: c.autoApproveCents,
    jobsWon: c._count.quotes,
  }));
}

export async function createContractor(ctx: OrgCtx, input: ContractorInput) {
  const c = await prisma.contractor.create({
    data: {
      orgId: ctx.orgId,
      createdByUserId: ctx.userId,
      name: input.name,
      trades: input.trades,
      phone: input.phone ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
      autoApproveCents: input.autoApproveDollars ?? null,
    },
  });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "contractor.create",
    entityType: "Contractor",
    entityId: c.id,
    meta: { trades: input.trades },
  });
  return { id: c.id };
}

async function findOwned(ctx: OrgCtx, id: string) {
  const c = await prisma.contractor.findFirst({
    where: { id, orgId: ctx.orgId, archivedAt: null },
  });
  if (!c) throw new NotFoundError("That person is not on your list.");
  return c;
}

export async function updateContractor(ctx: OrgCtx, id: string, patch: ContractorPatch) {
  const existing = await findOwned(ctx, id);
  const next = {
    phone: patch.phone === undefined ? existing.phone : patch.phone,
    email: patch.email === undefined ? existing.email : patch.email,
  };
  if (!next.phone && !next.email) {
    // There must stay a way to reach them.
    throw new ConflictError("Keep a phone number or an email, so they can be reached.");
  }
  await prisma.contractor.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.trades !== undefined ? { trades: patch.trades } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      ...(patch.autoApproveDollars !== undefined
        ? { autoApproveCents: patch.autoApproveDollars }
        : {}),
    },
  });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "contractor.update",
    entityType: "Contractor",
    entityId: id,
    meta: { fields: Object.keys(patch) },
  });
  return { id };
}

export async function archiveContractor(ctx: OrgCtx, id: string) {
  await findOwned(ctx, id);
  await prisma.contractor.update({ where: { id }, data: { archivedAt: new Date() } });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "contractor.archive",
    entityType: "Contractor",
    entityId: id,
  });
}

export async function getAutoAsk(ctx: OrgCtx): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { autoAskQuotes: true },
  });
  return org?.autoAskQuotes ?? true;
}

export async function setAutoAsk(ctx: OrgCtx, on: boolean) {
  await prisma.organization.update({ where: { id: ctx.orgId }, data: { autoAskQuotes: on } });
  void audit({
    actorUserId: ctx.userId,
    orgId: ctx.orgId,
    action: "org.auto_ask_quotes",
    entityType: "Organization",
    entityId: ctx.orgId,
    meta: { on },
  });
}
