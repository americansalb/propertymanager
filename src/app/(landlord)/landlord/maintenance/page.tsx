import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listOrgMaintenance, type OrgMaintenanceRow } from "@/lib/services/maintenance";
import { Badge, Card, PageTitle } from "@/components/ui";
import { IconChevronRight, IconWrench } from "@/components/icons";
import { MAINT_STATUS_LABEL_LANDLORD } from "@/lib/validation/maintenance";
import { unitTitle } from "@/lib/units";

export const metadata = { title: "Maintenance" };

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

const URGENCY_CHIP: Record<string, string> = {
  EMERGENCY: "bg-red-50 text-red-700",
  URGENT: "bg-amber-50 text-amber-800",
  NORMAL: "bg-stone-100 text-stone-500",
  LOW: "bg-stone-100 text-stone-400",
};

const URGENCY_PREFIX: Record<string, string> = {
  EMERGENCY: "Emergency · ",
  URGENT: "Urgent · ",
  NORMAL: "",
  LOW: "",
};

function ageLabel(d: Date): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function RequestList({ rows }: { rows: OrgMaintenanceRow[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/landlord/maintenance/${r.id}`}>
            <Card
              className={`flex items-center gap-3 p-4 transition hover:border-patina ${
                r.urgency === "EMERGENCY" ? "border-red-200" : ""
              }`}
            >
              <span
                className={`cut-sm flex h-9 w-9 shrink-0 items-center justify-center ${
                  URGENCY_CHIP[r.urgency] ?? "bg-stone-100 text-stone-500"
                }`}
              >
                <IconWrench className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-stone-900">{r.title}</p>
                <p className="mt-0.5 truncate text-xs text-stone-500">
                  {URGENCY_PREFIX[r.urgency] ?? ""}
                  {r.unitNumber ? `${unitTitle(r.unitNumber)} · ` : ""}
                  {r.propertyName}
                  {r.tenantName ? ` · ${r.tenantName}` : ""} · {ageLabel(r.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={STATUS_TONE[r.status] ?? "stone"}>
                  {MAINT_STATUS_LABEL_LANDLORD[r.status] ?? r.status}
                </Badge>
                <IconChevronRight className="h-5 w-5 text-stone-300" />
              </div>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function MaintenanceInbox() {
  const session = await requireOrg("/landlord/maintenance");
  const rows = await listOrgMaintenance({ userId: session.userId, orgId: session.orgId });
  const open = rows.filter((r) => r.open);
  const closed = rows.filter((r) => !r.open);

  return (
    <div>
      <PageTitle>Maintenance</PageTitle>
      <p className="mt-1 text-sm tabular-nums text-stone-500">
        {open.length} open{closed.length > 0 ? ` · ${closed.length} closed` : ""}
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <IconWrench className="h-5 w-5" />
          </span>
          <h2 className="mt-3 font-display text-lg font-medium text-stone-900">
            Nothing needs fixing
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            When a tenant reports a problem, it lands here and you respond in a tap.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {open.length > 0 && <RequestList rows={open} />}
          {closed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">Closed</h2>
              <RequestList rows={closed} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
