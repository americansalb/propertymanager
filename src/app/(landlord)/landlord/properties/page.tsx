import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listProperties } from "@/lib/services/property";
import { Button } from "@/components/ui";
import { PropertyRow } from "@/components/landlord/property-row";
import { IconSearch } from "@/components/icons";

export const metadata = { title: "Properties" };

type Search = { q?: string; tag?: string; vac?: string };

/** Below this many properties, a search box is just clutter. */
const SEARCH_FROM = 6;

function href(params: Search, patch: Partial<Search>): string {
  const merged = { ...params, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
  const s = sp.toString();
  return `/landlord/properties${s ? `?${s}` : ""}`;
}

const chip = (active: boolean) =>
  `inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium transition ${
    active
      ? "bg-keep-deep text-white"
      : "border border-stone-300 bg-white text-stone-700 hover:border-patina hover:text-patina"
  }`;

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireOrg("/landlord/properties");
  const params = await searchParams;
  const ctx = { userId: session.userId, orgId: session.orgId };
  const filtered = Boolean(params.q || params.tag || params.vac);
  const matches = await listProperties(ctx, { q: params.q, tag: params.tag });
  // The unfiltered list decides what tools to show, and which labels exist.
  const all = filtered ? await listProperties(ctx, {}) : matches;

  const properties = (
    params.vac === "1"
      ? matches.filter((p) => p.units.some((u) => u.status === "VACANT"))
      : matches
  ).sort((a, b) => a.name.localeCompare(b.name));

  const labels = [...new Set(all.flatMap((p) => p.tags))].slice(0, 8);
  const anyVacant = all.some((p) => p.units.some((u) => u.status === "VACANT"));
  const showTools = all.length >= SEARCH_FROM || filtered;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Properties</h1>
        {all.length > 0 && <Button href="/landlord/properties/new">Add a property</Button>}
      </div>

      {showTools && (
        <div className="mt-5 space-y-3">
          <form action="/landlord/properties" className="relative">
            {params.tag && <input type="hidden" name="tag" value={params.tag} />}
            {params.vac && <input type="hidden" name="vac" value={params.vac} />}
            <label htmlFor="property-search" className="sr-only">
              Search by name or address
            </label>
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              id="property-search"
              name="q"
              defaultValue={params.q}
              placeholder="Search by name or address"
              className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-11 pr-3.5 text-base text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-2 focus:ring-patina/25"
            />
          </form>
          {(anyVacant || labels.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {anyVacant && (
                <Link
                  href={href(params, { vac: params.vac === "1" ? undefined : "1" })}
                  className={chip(params.vac === "1")}
                >
                  With a vacancy
                </Link>
              )}
              {labels.map((t) => (
                <Link
                  key={t}
                  href={href(params, { tag: params.tag === t ? undefined : t })}
                  className={chip(params.tag === t)}
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {properties.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
          {filtered ? (
            <>
              <p className="text-xl font-semibold tracking-tight text-stone-900">
                Nothing matches that
              </p>
              <p className="mt-1 text-stone-600">
                Try a shorter search, or go back to the whole list.
              </p>
              <Button href="/landlord/properties" variant="secondary" className="mt-5">
                Show all properties
              </Button>
            </>
          ) : (
            <>
              <p className="text-xl font-semibold tracking-tight text-stone-900">
                Add your first property
              </p>
              <p className="mt-1 text-stone-600">
                Start with the address. A single house takes about a minute.
              </p>
              <Button href="/landlord/properties/new" variant="accent" className="mt-5">
                Add a property
              </Button>
            </>
          )}
        </section>
      ) : (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-2 sm:px-6">
          <ul className="divide-y divide-stone-100">
            {properties.map((p) => (
              <li key={p.id}>
                <PropertyRow property={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {filtered && properties.length > 0 && (
        <p className="mt-3 text-sm text-stone-500">
          Showing {properties.length} of {all.length}.{" "}
          <Link href="/landlord/properties" className="font-medium text-patina underline">
            Show all
          </Link>
        </p>
      )}
    </div>
  );
}
