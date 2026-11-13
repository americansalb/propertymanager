/**
 * Quotes from the owner's own repair people.
 *
 * A repair goes out to the people whose trade fits. Each gets a private
 * link (32 random bytes in the link, sha256 at rest, same pattern as
 * invites) and answers with a price and a time, or passes. The owner
 * compares and says yes to one, or a limit they set ahead of time says yes
 * for them. No money moves here: approving is "go ahead at this price".
 *
 * Email is a bonus channel, never a gate. Someone with only a phone number
 * is still asked: the owner texts them the link from their own phone.
 */
import { randomBytes } from "node:crypto";
import type { MaintStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { env } from "@/lib/env";
import { brand } from "@/lib/brand";
import { hashToken } from "@/lib/auth/session";
import { ConflictError, NotFoundError, type OrgCtx } from "@/lib/authz/api";
import { notify } from "@/lib/services/notification";
import { sendEmail } from "@/lib/email/send";
import {
  quoteApprovedEmail,
  quoteNotChosenEmail,
  quoteRequestEmail,
} from "@/lib/email/templates/quote";
import {
  buildQuoteLink,
  formatQuotePrice,
  pickContractors,
  quoteTextMessage,
  ruleApproves,
  type RepairCategory,
} from "@/lib/quotes";
import { unitTitle } from "@/lib/units";
import type { QuoteRespondInput } from "@/lib/validation/quote";

/** A repair that can still be quoted on. */
const OPEN: MaintStatus[] = ["SUBMITTED", "ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS"];

function newToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

type Face = { userId: string; name: string; email: string; orgName: string };

/** The person a repair person hears from: the owner, by name. */
async function orgFace(orgId: string, preferUserId?: string | null): Promise<Face | null> {
  const members = await prisma.membership.findMany({
    where: { orgId, role: { in: ["OWNER", "MANAGER"] } },
    select: {
      userId: true,
      role: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      org: { select: { name: true } },
    },
  });
  const m =
    members.find((x) => x.userId === preferUserId) ??
    members.find((x) => x.role === "OWNER") ??
    members[0];
  if (!m) return null;
  return {
    userId: m.userId,
    name: `${m.user.firstName} ${m.user.lastName}`.trim(),
    email: m.user.email,
    orgName: m.org.name,
  };
}

/** "Unit 1F, 1247 W Oakdale Ave, Chicago" */
function whereLabel(
  unitNumber: string | null | undefined,
  property: { address1: string; city: string },
): string {
  const unit =
    unitNumber && unitNumber.toLowerCase() !== "main" ? `${unitTitle(unitNumber)}, ` : "";
  return `${unit}${property.address1}, ${property.city}`;
}

async function loadRequest(orgId: string, requestId: string) {
  const req = await prisma.maintenanceRequest.findFirst({
    where: { id: requestId, orgId },
    include: {
      property: { select: { name: true, address1: true, city: true, state: true } },
      unit: { select: { unitNumber: true } },
      quotes: { select: { id: true, contractorId: true, status: true } },
    },
  });
  if (!req) throw new NotFoundError("Request not found.");
  return req;
}

export type AskedLine = {
  quoteId: string;
  contractorId: string;
  name: string;
  emailed: boolean;
};

/**
 * Ask repair people for a price. With no list given, the ones whose trade
 * fits the problem are asked. People already asked are skipped.
 */
export async function askForQuotes(opts: {
  orgId: string;
  /** Null when the system asks on its own, right after a tenant reports. */
  actorUserId: string | null;
  requestId: string;
  contractorIds?: string[];
}): Promise<{ asked: AskedLine[] }> {
  const req = await loadRequest(opts.orgId, opts.requestId);
  if (!OPEN.includes(req.status)) throw new ConflictError("This repair is already finished.");
  if (req.quotes.some((q) => q.status === "APPROVED")) {
    throw new ConflictError("Someone already has this job.");
  }

  const people = await prisma.contractor.findMany({
    where: { orgId: opts.orgId, archivedAt: null },
    orderBy: { createdAt: "asc" },
  });
  const chosen = opts.contractorIds
    ? people.filter((p) => opts.contractorIds!.includes(p.id))
    : pickContractors(req.category as RepairCategory, people);
  const already = new Set(req.quotes.map((q) => q.contractorId));
  const fresh = chosen.filter((p) => !already.has(p.id));
  if (fresh.length === 0) return { asked: [] };

  const face = await orgFace(opts.orgId, opts.actorUserId);
  const where = whereLabel(req.unit?.unitNumber, req.property);
  const urgent = req.urgency === "EMERGENCY" || req.urgency === "URGENT";

  const asked: AskedLine[] = [];
  for (const person of fresh) {
    const { token, tokenHash } = newToken();
    const quote = await prisma.quoteRequest.create({
      data: {
        orgId: opts.orgId,
        requestId: req.id,
        contractorId: person.id,
        tokenHash,
      },
    });
    let emailed = false;
    if (person.email) {
      const mail = quoteRequestEmail({
        brandName: brand.name,
        ownerName: face?.name ?? face?.orgName ?? "Your customer",
        contractorName: person.name,
        title: req.title,
        description: req.description,
        where,
        urgent,
        link: buildQuoteLink(env.APP_URL, token),
      });
      const result = await sendEmail({ to: person.email, ...mail });
      emailed = result.sent;
      if (emailed) {
        await prisma.quoteRequest.update({
          where: { id: quote.id },
          data: { emailedAt: new Date() },
        });
      }
    }
    asked.push({ quoteId: quote.id, contractorId: person.id, name: person.name, emailed });
  }

  void audit({
    actorUserId: opts.actorUserId,
    orgId: opts.orgId,
    action: "quote.ask",
    entityType: "MaintenanceRequest",
    entityId: req.id,
    meta: { asked: asked.length, automatic: opts.actorUserId === null },
  });
  return { asked };
}

/**
 * Called right after a tenant reports a problem. Never throws: a tenant's
 * report must go through whether or not anyone could be asked.
 */
export async function autoAskOnReport(orgId: string, requestId: string): Promise<AskedLine[]> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { autoAskQuotes: true },
    });
    if (!org?.autoAskQuotes) return [];
    const { asked } = await askForQuotes({ orgId, actorUserId: null, requestId });
    return asked;
  } catch (e) {
    console.error("auto-ask for quotes failed", e);
    return [];
  }
}

// ── The owner's view of a repair's quotes ───────────────────────────────────

export type QuoteLine = {
  id: string;
  contractorId: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  emailed: boolean;
  viewed: boolean;
  priceLowCents: number | null;
  priceHighCents: number | null;
  availability: string | null;
  note: string | null;
  respondedAt: Date | null;
  autoApproved: boolean;
  /** The owner's standing limit for this person, if any. */
  autoApproveCents: number | null;
};

export type RequestQuotes = {
  quotes: QuoteLine[];
  /** People who fit this problem and have not been asked yet. */
  canAsk: Array<{ id: string; name: string }>;
  /** How many repair people the owner has on file at all. */
  peopleOnFile: number;
  open: boolean;
};

export async function getRequestQuotes(ctx: OrgCtx, requestId: string): Promise<RequestQuotes> {
  const req = await loadRequest(ctx.orgId, requestId);
  const [rows, people] = await Promise.all([
    prisma.quoteRequest.findMany({
      where: { requestId, orgId: ctx.orgId },
      orderBy: { createdAt: "asc" },
      include: {
        contractor: {
          select: { name: true, phone: true, email: true, autoApproveCents: true },
        },
      },
    }),
    prisma.contractor.findMany({
      where: { orgId: ctx.orgId, archivedAt: null },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const asked = new Set(rows.map((r) => r.contractorId));
  const open = OPEN.includes(req.status) && !rows.some((r) => r.status === "APPROVED");
  return {
    quotes: rows.map((r) => ({
      id: r.id,
      contractorId: r.contractorId,
      name: r.contractor.name,
      phone: r.contractor.phone,
      email: r.contractor.email,
      status: r.status,
      emailed: r.emailedAt != null,
      viewed: r.viewedAt != null,
      priceLowCents: r.priceLowCents,
      priceHighCents: r.priceHighCents,
      availability: r.availability,
      note: r.note,
      respondedAt: r.respondedAt,
      autoApproved: r.autoApproved,
      autoApproveCents: r.contractor.autoApproveCents,
    })),
    canAsk: open
      ? pickContractors(req.category as RepairCategory, people)
          .filter((p) => !asked.has(p.id))
          .map((p) => ({ id: p.id, name: p.name }))
      : [],
    peopleOnFile: people.length,
    open,
  };
}

/** A fresh private link for one person, with a ready-made text message. */
export async function reissueQuoteLink(ctx: OrgCtx, quoteId: string) {
  const quote = await prisma.quoteRequest.findFirst({
    where: { id: quoteId, orgId: ctx.orgId },
    include: {
      contractor: { select: { name: true, phone: true } },
      request: {
        select: {
          title: true,
          unit: { select: { unitNumber: true } },
          property: { select: { address1: true, city: true } },
        },
      },
    },
  });
  if (!quote) throw new NotFoundError("Quote not found.");
  if (quote.status === "APPROVED" || quote.status === "NOT_CHOSEN") {
    throw new ConflictError("This repair already went to someone.");
  }
  const { token, tokenHash } = newToken();
  await prisma.quoteRequest.update({ where: { id: quote.id }, data: { tokenHash } });
  const face = await orgFace(ctx.orgId, ctx.userId);
  const link = buildQuoteLink(env.APP_URL, token);
  return {
    link,
    name: quote.contractor.name,
    phone: quote.contractor.phone,
    text: quoteTextMessage({
      ownerName: face?.name ?? "your customer",
      title: quote.request.title,
      where: whereLabel(quote.request.unit?.unitNumber, quote.request.property),
      link,
    }),
  };
}

// ── The repair person's side: one private link, no account ──────────────────

export type QuotePreview =
  | { state: "invalid" }
  | {
      /** open: waiting for an answer. answered: they can still change it.
       *  won: they have the job. closed: it went elsewhere or is finished. */
      state: "open" | "answered" | "won" | "closed";
      ownerName: string;
      contractorName: string;
      title: string;
      description: string;
      category: string;
      urgency: string;
      where: string;
      mayEnter: boolean;
      bestTimes: string[];
      mine: {
        status: string;
        priceLowCents: number | null;
        priceHighCents: number | null;
        availability: string | null;
        note: string | null;
      };
    };

async function findByToken(rawToken: string) {
  return prisma.quoteRequest.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: {
      contractor: true,
      request: {
        include: {
          property: { select: { name: true, address1: true, city: true } },
          unit: { select: { unitNumber: true } },
          quotes: { select: { id: true, status: true } },
        },
      },
    },
  });
}

type Loaded = NonNullable<Awaited<ReturnType<typeof findByToken>>>;

function stateOf(quote: Loaded): "open" | "answered" | "won" | "closed" {
  if (quote.status === "APPROVED") return "won";
  if (quote.status === "NOT_CHOSEN") return "closed";
  if (!OPEN.includes(quote.request.status)) return "closed";
  if (quote.request.quotes.some((q) => q.status === "APPROVED")) return "closed";
  return quote.status === "SENT" ? "open" : "answered";
}

export async function previewQuote(rawToken: string): Promise<QuotePreview> {
  const quote = await findByToken(rawToken);
  if (!quote) return { state: "invalid" };
  if (!quote.viewedAt) {
    await prisma.quoteRequest.update({ where: { id: quote.id }, data: { viewedAt: new Date() } });
  }
  const face = await orgFace(quote.orgId);
  const req = quote.request;
  return {
    state: stateOf(quote),
    ownerName: face?.name ?? face?.orgName ?? "Your customer",
    contractorName: quote.contractor.name,
    title: req.title,
    description: req.description,
    category: req.category,
    urgency: req.urgency,
    where: whereLabel(req.unit?.unitNumber, req.property),
    mayEnter: req.permissionToEnter,
    bestTimes: req.preferredTimes,
    mine: {
      status: quote.status,
      priceLowCents: quote.priceLowCents,
      priceHighCents: quote.priceHighCents,
      availability: quote.availability,
      note: quote.note,
    },
  };
}

/** Tell everyone who runs the org. */
async function tellOwners(orgId: string, input: { type: string; title: string; body: string; requestId: string }) {
  const members = await prisma.membership.findMany({
    where: { orgId, role: { in: ["OWNER", "MANAGER"] } },
    select: { userId: true },
  });
  for (const m of members) {
    await notify({
      userId: m.userId,
      channel: "EMAIL",
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: `/landlord/maintenance/${input.requestId}`,
      refType: "MaintenanceRequest",
      refId: input.requestId,
    });
  }
}

export async function respondToQuote(
  input: QuoteRespondInput,
): Promise<{ state: "answered" | "won"; autoApproved: boolean }> {
  const quote = await findByToken(input.token);
  if (!quote) throw new NotFoundError("This link does not work.");
  const state = stateOf(quote);
  if (state === "won") throw new ConflictError("You already have this job.");
  if (state === "closed") throw new ConflictError("This repair is no longer open.");

  const req = quote.request;
  const where = whereLabel(req.unit?.unitNumber, req.property);

  if (input.answer === "pass") {
    await prisma.quoteRequest.update({
      where: { id: quote.id },
      data: {
        status: "DECLINED",
        respondedAt: new Date(),
        priceLowCents: null,
        priceHighCents: null,
        availability: null,
        note: null,
      },
    });
    await tellOwners(quote.orgId, {
      type: "quote.declined",
      title: `${quote.contractor.name} cannot take it`,
      body: `They passed on: ${req.title}, ${where}.`,
      requestId: req.id,
    });
    return { state: "answered", autoApproved: false };
  }

  const low = input.priceDollars as number;
  const high = input.priceHighDollars != null && input.priceHighDollars > low ? input.priceHighDollars : null;
  await prisma.quoteRequest.update({
    where: { id: quote.id },
    data: {
      status: "QUOTED",
      respondedAt: new Date(),
      priceLowCents: low,
      priceHighCents: high,
      availability: input.availability,
      note: input.note ?? null,
    },
  });
  const price = formatQuotePrice(low, high);

  // The owner's standing rule, if they set one for this person.
  if (
    ruleApproves({
      limitCents: quote.contractor.autoApproveCents,
      priceLowCents: low,
      priceHighCents: high,
      someoneAlreadyApproved: false, // stateOf() already ruled that out
    })
  ) {
    try {
      await approve(quote.id, quote.orgId, null);
      await tellOwners(quote.orgId, {
        type: "quote.auto_approved",
        title: `Approved for you: ${quote.contractor.name}, ${price}`,
        body: `${req.title}, ${where}. It was under the limit you set for them. They can come: ${input.availability}.`,
        requestId: req.id,
      });
      return { state: "won", autoApproved: true };
    } catch (e) {
      // Lost a race to another approval: fall through as a normal quote.
      if (!(e instanceof ConflictError)) throw e;
    }
  }

  await tellOwners(quote.orgId, {
    type: "quote.received",
    title: `${quote.contractor.name}: ${price}`,
    body: `Their price for ${req.title}, ${where}. They can come: ${input.availability}.`,
    requestId: req.id,
  });
  return { state: "answered", autoApproved: false };
}

// ── Saying yes ──────────────────────────────────────────────────────────────

/**
 * Give the job to one person. Everyone else still in the running is told it
 * went elsewhere. `byUserId` is null when the owner's own rule approved it.
 */
async function approve(quoteId: string, orgId: string, byUserId: string | null) {
  const quote = await prisma.quoteRequest.findFirst({
    where: { id: quoteId, orgId },
    include: {
      contractor: true,
      request: {
        include: {
          property: { select: { address1: true, city: true } },
          unit: { select: { unitNumber: true } },
        },
      },
    },
  });
  if (!quote) throw new NotFoundError("Quote not found.");
  if (quote.status !== "QUOTED") {
    throw new ConflictError(
      quote.status === "APPROVED"
        ? "This one is already approved."
        : "They have not given a price yet.",
    );
  }
  const req = quote.request;
  if (!OPEN.includes(req.status)) throw new ConflictError("This repair is already finished.");

  const price = formatQuotePrice(quote.priceLowCents ?? 0, quote.priceHighCents);
  const nextStatus: MaintStatus = req.status === "SUBMITTED" ? "ACKNOWLEDGED" : req.status;
  const note = `${quote.contractor.name} will do this repair.${
    quote.availability ? ` They can come: ${quote.availability}.` : ""
  }`;
  const now = new Date();

  const losers = await prisma.$transaction(async (tx) => {
    const taken = await tx.quoteRequest.count({
      where: { requestId: req.id, status: "APPROVED" },
    });
    if (taken > 0) throw new ConflictError("Someone already has this job.");
    await tx.quoteRequest.update({
      where: { id: quote.id },
      data: {
        status: "APPROVED",
        decidedAt: now,
        decidedByUserId: byUserId,
        autoApproved: byUserId === null,
      },
    });
    const others = await tx.quoteRequest.findMany({
      where: { requestId: req.id, id: { not: quote.id }, status: { in: ["SENT", "QUOTED"] } },
      select: { id: true, status: true, contractor: { select: { name: true, email: true } } },
    });
    await tx.quoteRequest.updateMany({
      where: { id: { in: others.map((o) => o.id) } },
      data: { status: "NOT_CHOSEN", decidedAt: now },
    });
    if (nextStatus !== req.status) {
      await tx.maintenanceRequest.update({ where: { id: req.id }, data: { status: nextStatus } });
    }
    await tx.maintenanceStatusHistory.create({
      data: {
        requestId: req.id,
        fromStatus: req.status,
        toStatus: nextStatus,
        // History needs a person: a rule acts for whoever set it.
        actorUserId: byUserId ?? quote.contractor.createdByUserId,
        note: byUserId === null ? `${note} Approved by your limit, at ${price}.` : note,
      },
    });
    return others;
  });

  void audit({
    actorUserId: byUserId,
    orgId,
    action: "quote.approve",
    entityType: "QuoteRequest",
    entityId: quote.id,
    meta: { automatic: byUserId === null, priceLowCents: quote.priceLowCents },
  });

  // Everything below is courtesy: none of it may undo the approval.
  try {
    const face = await orgFace(orgId, byUserId);
    const where = whereLabel(req.unit?.unitNumber, req.property);
    const tenant =
      req.origin === "TENANT"
        ? await prisma.user.findUnique({
            where: { id: req.createdByUserId },
            select: { id: true, firstName: true },
          })
        : null;

    if (tenant) {
      await notify({
        userId: tenant.id,
        channel: "IN_APP",
        type: "maintenance.update",
        title: `Update: ${req.title}`,
        body: note,
        linkUrl: "/tenant/maintenance",
        refType: "MaintenanceRequest",
        refId: req.id,
      });
    }
    if (quote.contractor.email) {
      await sendEmail({
        to: quote.contractor.email,
        ...quoteApprovedEmail({
          brandName: brand.name,
          ownerName: face?.name ?? "Your customer",
          ownerEmail: face?.email ?? null,
          contractorName: quote.contractor.name,
          title: req.title,
          where,
          price,
          availability: quote.availability,
          entry: req.permissionToEnter
            ? "You may go in even if the tenant is out"
            : "Only when the tenant is home",
          bestTimes: req.preferredTimes.length > 0 ? req.preferredTimes.join(", ") : null,
          accessNotes: req.accessNotes,
          tenantFirstName: tenant?.firstName ?? null,
        }),
      });
    }
    for (const o of losers) {
      // Only people who took the time to give a price hear back.
      if (o.status !== "QUOTED" || !o.contractor.email) continue;
      await sendEmail({
        to: o.contractor.email,
        ...quoteNotChosenEmail({
          brandName: brand.name,
          ownerName: face?.name ?? "Your customer",
          contractorName: o.contractor.name,
          title: req.title,
        }),
      });
    }
  } catch (e) {
    console.error("quote approval follow-up failed", e);
  }

  return { id: quote.id, contractorName: quote.contractor.name, price };
}

/** The owner says yes to one price. */
export async function approveQuote(ctx: OrgCtx, quoteId: string) {
  return approve(quoteId, ctx.orgId, ctx.userId);
}
