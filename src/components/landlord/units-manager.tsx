"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { buttonCls, inputCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import {
  UnitStatusSelect,
  unitTitle,
  type UnitView,
} from "@/components/landlord/unit-terms";
import { IconChevronRight, IconClose, IconPlus } from "@/components/icons";

export type { UnitView };

/** "$1,850 deposit · pet +$50/mo · parking incl." */
function termsSubline(u: UnitView): string {
  const parts: string[] = [];
  if (u.securityDepositCents != null) parts.push(`${formatCents(u.securityDepositCents)} deposit`);
  if (u.petRentCents != null) parts.push(`pet +${formatCents(u.petRentCents)}/mo`);
  else if (u.petDepositCents != null) parts.push(`pet dep ${formatCents(u.petDepositCents)}`);
  if (u.parkingRentCents === 0) parts.push("parking incl.");
  else if (u.parkingRentCents != null) parts.push(`parking +${formatCents(u.parkingRentCents)}/mo`);
  if (u.utilitiesIncluded.length > 0) parts.push(`${u.utilitiesIncluded.length} utilities incl.`);
  return parts.join(" · ");
}

/** Compact card: the unit's front door. Click anywhere to enter its profile. */
function UnitCard({
  unit,
  href,
  onDelete,
}: {
  unit: UnitView;
  href: string;
  onDelete: () => void;
}) {
  const router = useRouter();
  const occupied = unit.status !== "VACANT";
  const specs = [
    unit.bedrooms != null ? `${unit.bedrooms} bd` : null,
    unit.bathrooms != null ? `${unit.bathrooms} ba` : null,
    unit.squareFeet != null ? `${unit.squareFeet.toLocaleString()} sqft` : null,
  ].filter(Boolean);
  const terms = termsSubline(unit);

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className="group relative cursor-pointer rounded-xl border border-stone-200 bg-white p-4 transition hover:border-patina"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-display text-lg font-semibold text-stone-900">
          {unitTitle(unit.unitNumber)}
        </p>
        <UnitStatusSelect unitId={unit.id} unitNumber={unit.unitNumber} status={unit.status} />
      </div>

      <div className="mt-2 pb-5">
        {unit.marketRentCents != null ? (
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-semibold tabular-nums text-stone-900">
              {formatCents(unit.marketRentCents)}
            </span>
            <span className="text-xs text-stone-500">/mo {occupied ? "rent" : "asking"}</span>
          </p>
        ) : (
          <p className="text-sm text-stone-400 transition group-hover:text-copper-deep">
            <span className="mr-1 font-semibold text-copper">+</span>
            {occupied ? "Set the rent" : "Set asking rent"}
          </p>
        )}
        {terms && <p className="mt-1 text-xs text-stone-500">{terms}</p>}
        {specs.length > 0 && <p className="mt-1 text-sm text-stone-500">{specs.join(" · ")}</p>}
      </div>

      <div className="absolute right-3 bottom-3 flex items-center gap-1">
        <span onClick={(e) => e.stopPropagation()}>
          <ConfirmButton
            onConfirm={onDelete}
            confirmLabel="Delete"
            title="Delete unit"
            className="rounded-lg p-1.5 text-stone-300 transition hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:transition sm:group-hover:opacity-100"
          >
            <IconClose className="h-3.5 w-3.5" />
          </ConfirmButton>
        </span>
        <IconChevronRight className="h-3.5 w-3.5 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-patina" />
      </div>
    </div>
  );
}

/** Create is a tiny two-field card; the new unit's profile opens next. */
function NewUnitCard({
  propertyId,
  onClose,
}: {
  propertyId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [unitNumber, setUnitNumber] = useState("");
  const [rent, setRent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (unitNumber.trim() === "") {
      setError("Give the unit a name or number.");
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
    <div className="rounded-xl border border-patina bg-white p-4">
      <div className="space-y-2.5">
        <input
          autoFocus
          value={unitNumber}
          onChange={(e) => {
            setUnitNumber(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void create()}
          placeholder="Unit name or number (2F, 101, Garden…)"
          aria-label="Unit name or number"
          className={inputCls}
        />
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
            $
          </span>
          <input
            value={rent}
            onChange={(e) => setRent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void create()}
            inputMode="decimal"
            placeholder="Asking rent (optional)"
            aria-label="Asking rent"
            className={`${inputCls} pl-7`}
          />
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => void create()} disabled={busy} className={buttonCls("primary", "sm")}>
          {busy ? "Adding…" : "Add unit"}
        </button>
        <button onClick={onClose} disabled={busy} className={buttonCls("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function UnitsManager({ propertyId, units }: { propertyId: string; units: UnitView[] }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [adding, setAdding] = useState(false);

  async function remove(unit: UnitView) {
    const res = await fetch(`/api/v1/landlord/units/${unit.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast(data.error ?? `Couldn't delete ${unitTitle(unit.unitNumber)}.`, "bad");
      return;
    }
    toast(`${unitTitle(unit.unitNumber)} deleted.`);
    router.refresh();
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
        Units ({units.length})
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {units.map((u) => (
          <UnitCard
            key={u.id}
            unit={u}
            href={`/landlord/properties/${propertyId}/units/${u.id}`}
            onDelete={() => void remove(u)}
          />
        ))}
        {adding ? (
          <NewUnitCard propertyId={propertyId} onClose={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 text-sm font-medium text-stone-400 transition hover:border-patina hover:text-patina"
          >
            <IconPlus className="h-4 w-4" /> Add unit
          </button>
        )}
      </div>
    </section>
  );
}
