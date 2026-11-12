import Link from "next/link";
import { IconChevronRight } from "@/components/icons";

export type PropertyRowData = {
  id: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  units: Array<{ status: string }>;
};

/**
 * One property, one row, and the whole row is the link. Used on the
 * dashboard and on the properties list so a property always looks the same.
 */
export function PropertyRow({ property: p }: { property: PropertyRowData }) {
  const total = p.units.length;
  const vacant = p.units.filter((u) => u.status === "VACANT").length;
  // A property is often named after its street address: do not say it twice.
  const where = p.name.trim().toLowerCase().startsWith(p.address1.trim().toLowerCase())
    ? `${p.city}, ${p.state}`
    : `${p.address1}, ${p.city}, ${p.state}`;
  const needsYou = total === 0 || vacant > 0;
  const standing =
    total === 0 ? "No units yet" : vacant > 0 ? `${vacant} vacant` : total === 1 ? "Lived in" : "All lived in";

  return (
    <Link
      href={`/landlord/properties/${p.id}`}
      className="group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-stone-900">{p.name}</span>
        <span className="mt-0.5 block break-words text-sm text-stone-600 sm:truncate">
          {where}
          {total > 1 ? ` · ${total} units` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={`h-2 w-2 rounded-full ${needsYou ? "bg-copper" : "bg-patina"}`}
        />
        <span className={needsYou ? "font-medium text-copper-deep" : "text-stone-600"}>
          {standing}
        </span>
      </span>
      <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
    </Link>
  );
}
