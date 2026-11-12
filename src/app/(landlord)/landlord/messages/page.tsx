import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listLandlordThreads } from "@/lib/services/message";
import { IconChevronRight } from "@/components/icons";
import { unitTitle } from "@/lib/units";

export const metadata = { title: "Messages" };

function when(d: Date): string {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default async function LandlordMessages() {
  const session = await requireOrg("/landlord/messages");
  const rows = await listLandlordThreads({ userId: session.userId, orgId: session.orgId });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Messages</h1>

      {rows.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          <p className="text-xl font-semibold tracking-tight text-stone-900">
            Nobody to message yet
          </p>
          <p className="mt-1 text-stone-600">
            Once a tenant accepts their invite, your conversation with them is kept here.
          </p>
        </section>
      ) : (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-2 sm:px-6">
          <ul className="divide-y divide-stone-100">
            {rows.map((r) => {
              // The tenant spoke last: this one is waiting on the owner.
              const waiting = Boolean(r.lastBody) && r.lastFromTenant;
              return (
                <li key={r.leaseId}>
                  <Link
                    href={`/landlord/messages/${r.leaseId}`}
                    className="group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-base font-semibold text-stone-900">
                          {r.tenantName ?? "Tenant"}
                        </span>
                        {r.lastAt && (
                          <span className="shrink-0 text-sm text-stone-500">{when(r.lastAt)}</span>
                        )}
                      </span>
                      <span className="block truncate text-sm text-stone-500">
                        {unitTitle(r.unitNumber)} at {r.propertyName}
                      </span>
                      <span className="mt-0.5 flex items-baseline gap-2 text-sm">
                        {waiting && (
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 -translate-y-px rounded-full bg-copper"
                          />
                        )}
                        <span
                          className={`truncate ${waiting ? "font-medium text-stone-900" : "text-stone-600"}`}
                        >
                          {r.lastBody
                            ? `${r.lastFromTenant ? "" : "You: "}${r.lastBody}`
                            : "No messages yet"}
                        </span>
                      </span>
                    </span>
                    <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
