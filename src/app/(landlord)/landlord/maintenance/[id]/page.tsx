import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { NotFoundError } from "@/lib/authz/api";
import { getOrgMaintenanceRequest } from "@/lib/services/maintenance";
import { getRequestQuotes } from "@/lib/services/quote";
import { BackLink, Badge, InfoRow, Section } from "@/components/ui";
import { CATEGORY_LABEL, MAINT_STATUS_LABEL_LANDLORD } from "@/lib/validation/maintenance";
import { unitTitle } from "@/lib/units";
import { MaintenanceRespond } from "@/components/landlord/maintenance-respond";
import { RepairQuotes } from "@/components/landlord/repair-quotes";

export const metadata = { title: "Repair" };

const STATUS_TONE: Record<string, "patina" | "copper" | "amber" | "stone" | "red"> = {
  SUBMITTED: "copper",
  ACKNOWLEDGED: "patina",
  SCHEDULED: "patina",
  IN_PROGRESS: "patina",
  RESOLVED: "patina",
  CLOSED: "stone",
  CANCELLED: "stone",
  SENT_TO_MARKETPLACE: "patina",
};

function fmt(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MaintenanceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOrg("/landlord/maintenance");
  const { id } = await params;
  let req: Awaited<ReturnType<typeof getOrgMaintenanceRequest>>;
  try {
    req = await getOrgMaintenanceRequest({ userId: session.userId, orgId: session.orgId }, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }

  const quotes = await getRequestQuotes({ userId: session.userId, orgId: session.orgId }, id);
  const pricesIn = quotes.quotes.filter((q) => q.status === "QUOTED").length;

  const where = req.unitNumber
    ? `${unitTitle(req.unitNumber)} at ${req.propertyName}`
    : req.propertyName;
  const category = CATEGORY_LABEL[req.category as keyof typeof CATEGORY_LABEL] ?? req.category;
  const firstName = req.reporterName?.split(" ")[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/landlord/maintenance">Repairs</BackLink>

      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-stone-900">
          {req.title}
        </h1>
        <span className="mt-2 flex shrink-0 items-center gap-2">
          {req.urgency === "EMERGENCY" && <Badge tone="red">Emergency</Badge>}
          {req.urgency === "URGENT" && <Badge tone="amber">Urgent</Badge>}
          <Badge tone={STATUS_TONE[req.status] ?? "stone"}>
            {MAINT_STATUS_LABEL_LANDLORD[req.status] ?? req.status}
          </Badge>
        </span>
      </div>
      <p className="mt-1 text-stone-600">
        {where} · {category}
      </p>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <p className="whitespace-pre-wrap text-lg leading-7 text-stone-900">{req.description}</p>
        <p className="mt-2 text-sm text-stone-500">
          {req.reporterName ?? "The tenant"} reported this on {fmt(req.createdAt)}.
        </p>
        <dl className="mt-4 border-t border-stone-100 pt-2">
          <InfoRow label="Can someone go in?">
            {req.permissionToEnter
              ? "Yes, even if the tenant is out"
              : "Only when the tenant is home"}
          </InfoRow>
          {req.preferredTimes.length > 0 && (
            <InfoRow label="Best times">{req.preferredTimes.join(", ")}</InfoRow>
          )}
          {req.accessNotes && <InfoRow label="Getting in">{req.accessNotes}</InfoRow>}
        </dl>
      </section>

      <Section
        title="Prices"
        aside={
          quotes.open && pricesIn > 0 ? (
            <Badge tone="copper">
              {pricesIn === 1 ? "1 price to look at" : `${pricesIn} prices to compare`}
            </Badge>
          ) : null
        }
      >
        <RepairQuotes
          requestId={req.id}
          quotes={quotes.quotes}
          canAsk={quotes.canAsk}
          peopleOnFile={quotes.peopleOnFile}
          open={quotes.open}
        />
      </Section>

      <Section title="Send an update">
        <MaintenanceRespond
          requestId={req.id}
          currentStatus={req.status}
          tenantFirstName={firstName}
        />
      </Section>

      {req.timeline.length > 0 && (
        <Section title="What has happened">
          <ul className="space-y-4 pt-1">
            {[...req.timeline].reverse().map((t) => (
              <li key={t.id} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-stone-300"
                />
                <div className="min-w-0">
                  <p className="text-base text-stone-900">
                    <span className="font-semibold">
                      {t.byMe ? "You" : (t.actorName ?? "The tenant")}
                    </span>{" "}
                    {t.fromStatus === null
                      ? "reported the problem"
                      : t.fromStatus !== t.toStatus
                        ? `set it to ${(
                            MAINT_STATUS_LABEL_LANDLORD[t.toStatus] ?? t.toStatus
                          ).toLowerCase()}`
                        : "sent a note"}
                  </p>
                  {t.note && (
                    <p className="mt-0.5 whitespace-pre-wrap text-stone-700">{t.note}</p>
                  )}
                  <p className="mt-0.5 text-sm text-stone-500">{fmt(t.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
