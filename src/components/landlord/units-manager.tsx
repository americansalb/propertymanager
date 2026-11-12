"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { formatCents } from "@/lib/money";
import { Section, buttonCls, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui-feedback";
import { STATUS_LABEL, unitTitle, type UnitView } from "@/components/landlord/unit-terms";
import { IconChevronRight, IconPlus } from "@/components/icons";

export type { UnitView };

/** Who is in the unit, said in one line. Copper means it needs the owner. */
function standing(unit: UnitView): { line: string; needsYou: boolean } {
  const names = unit.tenantNames ?? [];
  if (names.length > 0) {
    const who = names.join(" and ");
    return unit.status === "NOTICE"
      ? { line: `${who}, moving out`, needsYou: true }
      : { line: who, needsYou: false };
  }
  if (unit.pendingInviteEmail) {
    return { line: `Waiting for ${unit.pendingInviteEmail} to accept`, needsYou: true };
  }
  if (unit.status === "VACANT") return { line: "Vacant", needsYou: true };
  return {
    line: `${STATUS_LABEL[unit.status] ?? "Occupied"}, no lease on file`,
    needsYou: true,
  };
}

/** One unit, one row, and the whole row is the link into it. */
function UnitRow({ unit, href }: { unit: UnitView; href: string }) {
  const vacant = unit.status === "VACANT";
  const rent = vacant ? unit.marketRentCents : (unit.leaseRentCents ?? unit.marketRentCents);
  const { line, needsYou } = standing(unit);

  return (
    <Link
      href={href}
      className="group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-stone-900">
          {unitTitle(unit.unitNumber)}
        </span>
        <span className="mt-0.5 flex items-baseline gap-2 text-sm">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 -translate-y-px rounded-full ${needsYou ? "bg-copper" : "bg-patina"}`}
          />
          <span className={`min-w-0 break-words sm:truncate ${needsYou ? "text-copper-deep" : "text-stone-600"}`}>
            {line}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        {rent != null ? (
          <>
            <span className="block text-base font-semibold tabular-nums text-stone-900">
              {formatCents(rent)}
            </span>
            <span className="block text-sm text-stone-500">{vacant ? "asking" : "a month"}</span>
          </>
        ) : (
          <span className="text-sm font-medium text-copper-deep">Rent not set</span>
        )}
      </span>
      <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
    </Link>
  );
}

/** Two labeled fields. The new unit's own page opens next. */
function NewUnitForm({ propertyId, onClose }: { propertyId: string; onClose: () => void }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const nameId = useId();
  const rentId = useId();
  const [unitNumber, setUnitNumber] = useState("");
  const [rent, setRent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (unitNumber.trim() === "") {
      setError("Give the unit a name or a number first.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/properties/${propertyId}/units`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitNumber: unitNumber.trim(),
        ...(rent.trim() !== "" ? { marketRentDollars: rent } : {}),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      unit?: { id: string };
      error?: string;
    };
    setBusy(false);
    if (!res.ok || !data.unit) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    toast(`${unitTitle(unitNumber.trim())} added.`);
    router.push(`/landlord/properties/${propertyId}/units/${data.unit.id}`);
    router.refresh();
  }

  return (
    <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="font-semibold text-stone-900">Add a unit</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className="mb-1 block text-sm font-medium text-stone-700">
            Name or number
          </label>
          <input
            id={nameId}
            autoFocus
            value={unitNumber}
            onChange={(e) => {
              setUnitNumber(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && void create()}
            placeholder="2F, 101, Garden"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor={rentId} className="mb-1 block text-sm font-medium text-stone-700">
            Asking rent <span className="font-normal text-stone-500">(you can add it later)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">
              $
            </span>
            <input
              id={rentId}
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void create()}
              inputMode="decimal"
              placeholder="1,850"
              className={`${inputCls} pl-8`}
            />
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={() => void create()} disabled={busy} className={buttonCls("primary")}>
          {busy ? "Adding…" : "Add unit"}
        </button>
        <button onClick={onClose} disabled={busy} className={buttonCls("ghost")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function UnitsManager({ propertyId, units }: { propertyId: string; units: UnitView[] }) {
  const [adding, setAdding] = useState(false);
  const none = units.length === 0;

  return (
    <Section
      title={units.length === 1 ? "Unit" : "Units"}
      aside={
        !adding && !none ? (
          <button onClick={() => setAdding(true)} className={buttonCls("secondary", "sm")}>
            <IconPlus className="h-3.5 w-3.5" /> Add a unit
          </button>
        ) : null
      }
    >
      {none && !adding && (
        <div className="flex flex-col gap-4 py-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-stone-600">
            No units yet. A single house is one unit. A duplex is two.
          </p>
          <button onClick={() => setAdding(true)} className={`${buttonCls("accent")} shrink-0`}>
            Add the first unit
          </button>
        </div>
      )}
      {!none && (
        <ul className="divide-y divide-stone-100">
          {units.map((u) => (
            <li key={u.id}>
              <UnitRow unit={u} href={`/landlord/properties/${propertyId}/units/${u.id}`} />
            </li>
          ))}
        </ul>
      )}
      {adding && <NewUnitForm propertyId={propertyId} onClose={() => setAdding(false)} />}
    </Section>
  );
}
