import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrg } from "@/lib/authz";
import { NotFoundError } from "@/lib/authz/api";
import { getOrgMaintenanceRequest } from "@/lib/services/maintenance";
import { Badge, Card } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
import {
  CATEGORY_LABEL,
  MAINT_STATUS_LABEL_LANDLORD,
  URGENCY_LABEL,
} from "@/lib/validation/maintenance";
import { unitTitle } from "@/lib/units";
import { MaintenanceRespond } from "@/components/landlord/maintenance-respond";

export const metadata = { title: "Request" };

const STATUS_TONE: Record<string, "patina" | "copper" | "amber" | "stone" | "red"> = {
  SUBMITTED: "copper",
  ACKNOWLEDGED: "copper",
  SCHEDULED: "patina",
  IN_PROGRESS: "patina",
  RESOLVED: "patina",
  CLOSED: "stone",
  CANCELLED: "stone",
  SENT_TO_MARKETPLACE: "amber",
};

const URGENCY_TONE: Record<string, "patina" | "copper" | "amber" | "stone" | "red"> = {
  EMERGENCY: "red",
  URGENT: "amber",
  NORMAL: "stone",
  LOW: "stone",
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

  const where = req.unitNumber
    ? `${unitTitle(req.unitNumber)} · ${req.propertyName}`
    : req.propertyName;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/landlord/maintenance"
        className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600"
      >
        <IconChevronLeft className="h-3 w-3" /> Maintenance
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
            {req.title}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            {CATEGORY_LABEL[req.category as keyof typeof CATEGORY_LABEL] ?? req.category} · {where}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge tone={URGENCY_TONE[req.urgency] ?? "stone"}>
            {URGENCY_LABEL[req.urgency as keyof typeof URGENCY_LABEL] ?? req.urgency}
          </Badge>
          <Badge tone={STATUS_TONE[req.status] ?? "stone"}>
            {MAINT_STATUS_LABEL_LANDLORD[req.status] ?? req.status}
          </Badge>
        </div>
      </div>

      <Card className="mt-4 p-5">
        <p className="text-xs text-stone-400">
          Reported by {req.reporterName ?? "tenant"} · {fmt(req.createdAt)}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-stone-700">{req.description}</p>

        <dl className="mt-4 space-y-1.5 border-t border-stone-100 pt-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-stone-500">Entry</dt>
            <dd className="text-right text-stone-800">
              {req.permissionToEnter ? "May enter if tenant is out" : "Only when tenant is home"}
            </dd>
          </div>
          {req.preferredTimes.length > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Best times</dt>
              <dd className="text-right text-stone-800">{req.preferredTimes.join(", ")}</dd>
            </div>
          )}
          {req.accessNotes && (
            <div className="flex justify-between gap-4">
              <dt className="text-stone-500">Access notes</dt>
              <dd className="text-right text-stone-800">{req.accessNotes}</dd>
            </div>
          )}
        </dl>
      </Card>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Respond</h2>
        <Card className="mt-3 p-5">
          <MaintenanceRespond requestId={req.id} currentStatus={req.status} />
        </Card>
      </section>

      {req.timeline.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Activity</h2>
          <ul className="mt-3 space-y-3">
            {[...req.timeline].reverse().map((t) => (
              <li key={t.id} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-stone-300" />
                <div className="min-w-0">
                  <p className="text-sm text-stone-700">
                    <span className="font-medium text-stone-900">
                      {t.byMe ? "You" : (t.actorName ?? "Tenant")}
                    </span>{" "}
                    {t.fromStatus === null
                      ? "opened this request"
                      : t.fromStatus !== t.toStatus
                        ? `marked it ${(
                            MAINT_STATUS_LABEL_LANDLORD[t.toStatus] ?? t.toStatus
                          ).toLowerCase()}`
                        : "added a note"}
                    <span className="text-stone-400"> · {fmt(t.at)}</span>
                  </p>
                  {t.note && <p className="mt-0.5 text-sm text-stone-600">{t.note}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
