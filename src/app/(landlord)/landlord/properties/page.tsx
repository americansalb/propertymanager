import Link from "next/link";
import { requireOrg } from "@/lib/authz";
import { listProperties } from "@/lib/services/property";
import { Badge, Button, PageTitle } from "@/components/ui";
import { PropertyPortrait } from "@/components/brand/property-portrait";

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
          <PageTitle>Properties</PageTitle>
          <p className="mt-1 text-sm text-stone-500">
            {properties.length} propert{properties.length === 1 ? "y" : "ies"} in your portfolio
          </p>
        </div>
        <Button href="/landlord/properties/new">Add property</Button>
      </div>

      {properties.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <h2 className="font-display text-lg font-medium text-stone-900">No properties yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
            Add your first property - a single-family home takes about 30 seconds, a building
            with units about two minutes.
          </p>
          <Button href="/landlord/properties/new" className="mt-5">
            Add your first property
          </Button>
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
                <p className="mt-2 text-sm font-medium tabular-nums text-patina">
                  {occupied} of {p.units.length} occupied
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
