import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listProperties } from "@/lib/services/property";

export const metadata = { title: "Properties" };

const TYPE_LABEL: Record<string, string> = {
  SINGLE_FAMILY: "Single family",
  MULTIFAMILY: "Multifamily",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

export default async function PropertiesPage() {
  const session = await requireOrg("/landlord/properties");
  const properties = await listProperties({ userId: session.userId, orgId: session.orgId });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Properties</h1>
          <p className="mt-1 text-sm text-stone-500">
            {properties.length} propert{properties.length === 1 ? "y" : "ies"} in your portfolio
          </p>
        </div>
        <Link
          href="/landlord/properties/new"
          className="rounded-lg bg-iron px-4 py-2 text-sm font-semibold text-white hover:bg-iron-deep"
        >
          Add property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <h2 className="text-lg font-medium text-stone-900">No properties yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Add your first property - a single-family home takes about 30 seconds, a building
            with units about two minutes.
          </p>
          <Link
            href="/landlord/properties/new"
            className="mt-5 inline-block rounded-lg bg-iron px-4 py-2 text-sm font-semibold text-white hover:bg-iron-deep"
          >
            Add your first property
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => (
            <Link
              key={p.id}
              href={`/landlord/properties/${p.id}`}
              className="rounded-xl border border-stone-200 bg-white p-5 transition hover:border-patina hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-stone-900">{p.name}</h2>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {TYPE_LABEL[p.type] ?? p.type}
                </span>
              </div>
              <p className="mt-1 text-sm text-stone-500">
                {p.address1}
                {p.address2 ? `, ${p.address2}` : ""}
              </p>
              <p className="text-sm text-stone-500">
                {p.city}, {p.state} {p.zipCode}
              </p>
              <p className="mt-3 text-sm font-medium text-patina">
                {p._count.units} unit{p._count.units === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
