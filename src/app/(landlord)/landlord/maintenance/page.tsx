import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listOrgMaintenance, type OrgMaintenanceRow } from "@/lib/services/maintenance";
import { Badge } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";
import { MAINT_STATUS_LABEL_LANDLORD } from "@/lib/validation/maintenance";
import { unitTitle } from "@/lib/units";

export const metadata = { title: "Repairs" };

function ageLabel(d: Date): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** One repair, one row, and the whole row is the link. */
function RequestRow({ r }: { r: OrgMaintenanceRow }) {
  const isNew = r.status === "SUBMITTED";
  const where = r.unitNumber ? `${unitTitle(r.unitNumber)} at ${r.propertyName}` : r.propertyName;
  return (
    <Link
      href={`/landlord/maintenance/${r.id}`}
      className="group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base font-semibold text-stone-900">{r.title}</span>
          {r.open && r.urgency === "EMERGENCY" && <Badge tone="red">Emergency</Badge>}
          {r.open && r.urgency === "URGENT" && <Badge tone="amber">Urgent</Badge>}
        </span>
        <span className="mt-0.5 block break-words text-sm text-stone-600">
          {where}
          {r.tenantName ? ` · ${r.tenantName}` : ""} · {ageLabel(r.createdAt)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${
            !r.open ? "bg-stone-300" : isNew ? "bg-copper" : "bg-patina"
          }`}
        />
        <span className={isNew ? "font-medium text-copper-deep" : "text-stone-600"}>
          {MAINT_STATUS_LABEL_LANDLORD[r.status] ?? r.status}
        </span>
      </span>
      <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
    </Link>
  );
}

function RequestList({ rows }: { rows: OrgMaintenanceRow[] }) {
  return (
    <ul className="divide-y divide-stone-100">
      {rows.map((r) => (
        <li key={r.id}>
          <RequestRow r={r} />
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
  const fresh = open.filter((r) => r.status === "SUBMITTED").length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Repairs</h1>
      <p className="mt-1 text-stone-600">
        {open.length === 0
          ? "Nothing is waiting to be fixed."
          : `${open.length} open${fresh > 0 ? `, ${fresh} not answered yet` : ""}.`}
      </p>

      {open.length > 0 ? (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-2 sm:px-6">
          <RequestList rows={open} />
        </section>
      ) : (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <p className="text-xl font-semibold tracking-tight text-stone-900">All clear</p>
          <p className="mt-1 text-stone-600">
            When a tenant reports a problem, it shows up here and you answer in one tap.
          </p>
        </section>
      )}

      {closed.length > 0 && (
        <details className="group mt-5 rounded-2xl border border-stone-200 bg-white">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 sm:px-6">
            <span>
              <span className="font-semibold text-stone-900">Finished</span>
              <span className="ml-2 text-sm text-stone-500">{closed.length}</span>
            </span>
            <span className="text-sm font-medium text-stone-500 group-open:hidden">Show</span>
            <span className="hidden text-sm font-medium text-stone-500 group-open:inline">Hide</span>
          </summary>
          <div className="border-t border-stone-100 px-5 py-2 sm:px-6">
            <RequestList rows={closed} />
          </div>
        </details>
      )}
    </div>
  );
}
