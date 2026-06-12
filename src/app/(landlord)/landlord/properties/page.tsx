import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listProperties } from "@/lib/services/property";
import { Badge, Button, PageTitle } from "@/components/ui";
import { PropertyPortrait } from "@/components/brand/property-portrait";
import { IconSearch } from "@/components/icons";

export const metadata = { title: "Properties" };

const TYPE_LABEL: Record<string, string> = {
  SINGLE_FAMILY: "Single family",
  MULTIFAMILY: "Multifamily",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

const SORTS = [
  { key: "new", label: "Newest" },
  { key: "name", label: "Name" },
  { key: "vacancy", label: "Most vacant" },
] as const;

type Search = { q?: string; type?: string; tag?: string; vac?: string; sort?: string };

function href(params: Search, patch: Partial<Search>): string {
  const merged = { ...params, ...patch };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
  const s = sp.toString();
  return `/landlord/properties${s ? `?${s}` : ""}`;
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const session = await requireOrg("/landlord/properties");
  const params = await searchParams;
  const all = await listProperties(
    { userId: session.userId, orgId: session.orgId },
    { q: params.q, type: params.type, tag: params.tag },
  );

  let properties = all;
  if (params.vac === "1") {
    properties = properties.filter((p) => p.units.some((u) => u.status === "VACANT"));
  }
  if (params.sort === "name") {
    properties = [...properties].sort((a, b) => a.name.localeCompare(b.name));
  } else if (params.sort === "vacancy") {
    properties = [...properties].sort(
      (a, b) =>
        b.units.filter((u) => u.status === "VACANT").length -
        a.units.filter((u) => u.status === "VACANT").length,
    );
  }

  const tagCloud = [...new Set(all.flatMap((p) => p.tags))].slice(0, 10);
  const filtered = Boolean(params.q || params.type || params.tag || params.vac);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <PageTitle>Properties</PageTitle>
          <p className="mt-1 text-sm tabular-nums text-stone-500">
            {properties.length}
            {filtered ? ` of ${all.length}` : ""} propert
            {properties.length === 1 ? "y" : "ies"}
          </p>
        </div>
        <Button href="/landlord/properties/new">Add property</Button>
      </div>

      {(all.length > 0 || filtered) && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <form action="/landlord/properties" className="relative">
            {params.type && <input type="hidden" name="type" value={params.type} />}
            {params.tag && <input type="hidden" name="tag" value={params.tag} />}
            {params.vac && <input type="hidden" name="vac" value={params.vac} />}
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
            <input
              name="q"
              defaultValue={params.q}
              placeholder="Search address or name"
              className="w-56 rounded-lg border border-stone-300 py-1.5 pl-8 pr-3 text-sm focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina"
            />
          </form>

          {Object.entries(TYPE_LABEL).map(([key, label]) => {
            const active = params.type === key;
            return (
              <Link
                key={key}
                href={href(params, { type: active ? undefined : key })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-iron text-white"
                    : "border border-stone-200 bg-white text-stone-600 hover:border-patina"
                }`}
              >
                {label}
              </Link>
            );
          })}

          <Link
            href={href(params, { vac: params.vac === "1" ? undefined : "1" })}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              params.vac === "1"
                ? "bg-amber-500 text-white"
                : "border border-stone-200 bg-white text-stone-600 hover:border-patina"
            }`}
          >
            Has vacancy
          </Link>

          {tagCloud.map((t) => {
            const active = params.tag === t;
            return (
              <Link
                key={t}
                href={href(params, { tag: active ? undefined : t })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "bg-patina text-white"
                    : "border border-stone-200 bg-white text-stone-600 hover:border-patina"
                }`}
              >
                #{t}
              </Link>
            );
          })}

          <span className="ml-auto flex items-center gap-1 text-xs text-stone-400">
            sort
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={href(params, { sort: s.key === "new" ? undefined : s.key })}
                className={`rounded px-1.5 py-0.5 font-medium ${
                  (params.sort ?? "new") === s.key
                    ? "text-patina"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </span>
        </div>
      )}

      {properties.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <h2 className="font-display text-lg font-medium text-stone-900">
            {filtered ? "Nothing matches those filters" : "No properties yet"}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            {filtered
              ? "Clear a filter or two and the village comes back."
              : "Add your first property - a single-family home takes about 30 seconds."}
          </p>
          {filtered ? (
            <Button href="/landlord/properties" variant="secondary" className="mt-5">
              Clear filters
            </Button>
          ) : (
            <Button href="/landlord/properties/new" className="mt-5">
              Add your first property
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const occupied = p.units.filter((u) => u.status === "OCCUPIED").length;
            return (
              <Link
                key={p.id}
                href={`/landlord/properties/${p.id}`}
                className="group rounded-xl border border-stone-200 bg-white p-5 transition hover:border-patina"
              >
                <div className="flex h-28 items-end justify-center">
                  <PropertyPortrait
                    seedKey={p.id}
                    type={p.type}
                    units={p.units}
                    className="h-full w-auto transition group-hover:-translate-y-0.5"
                  />
                </div>
                <div className="mt-4 flex items-start justify-between gap-2">
                  <h2 className="truncate font-semibold text-stone-900">{p.name}</h2>
                  <Badge>{TYPE_LABEL[p.type] ?? p.type}</Badge>
                </div>
                <p className="mt-1 truncate text-sm text-stone-500">
                  {p.address1}
                  {p.address2 ? `, ${p.address2}` : ""} · {p.city}, {p.state} {p.zipCode}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-medium tabular-nums text-patina">
                    {occupied} of {p.units.length} occupied
                  </p>
                  {p.tags.length > 0 && (
                    <span className="truncate text-xs text-stone-400">
                      #{p.tags.slice(0, 2).join(" #")}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
