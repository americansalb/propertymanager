import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listLandlordThreads } from "@/lib/services/message";
import { Card, PageTitle } from "@/components/ui";
import { IconChevronRight, IconMail } from "@/components/icons";
import { unitTitle } from "@/lib/units";

export const metadata = { title: "Messages" };

function ago(d: Date): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function LandlordMessages() {
  const session = await requireOrg("/landlord/messages");
  const rows = await listLandlordThreads({ userId: session.userId, orgId: session.orgId });

  return (
    <div>
      <PageTitle>Messages</PageTitle>
      <p className="mt-1 text-sm text-stone-500">Your conversations with tenants.</p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-400">
            <IconMail className="h-5 w-5" />
          </span>
          <h2 className="mt-3 font-display text-lg font-medium text-stone-900">
            No tenants to message yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Once a tenant accepts their invite, your conversation with them lives here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.leaseId}>
              <Link href={`/landlord/messages/${r.leaseId}`}>
                <Card className="flex items-center gap-4 p-4 transition hover:border-patina">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                    <IconMail className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-stone-900">{r.tenantName ?? "Tenant"}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {unitTitle(r.unitNumber)} · {r.propertyName}
                      {r.lastBody
                        ? ` · ${r.lastFromTenant ? "" : "You: "}${r.lastBody}`
                        : " · No messages yet"}
                    </p>
                  </div>
                  {r.lastAt && (
                    <span className="shrink-0 text-[11px] text-stone-400">{ago(r.lastAt)}</span>
                  )}
                  <IconChevronRight className="h-5 w-5 shrink-0 text-stone-300" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
