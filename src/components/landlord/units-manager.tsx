"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { UTILITY_SUGGESTIONS } from "@/lib/validation/property";
import { buttonCls, inputCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import { EditableRow, useRowPatch } from "@/components/ui-inline";
import { IconClose, IconPencil, IconPlus } from "@/components/icons";

export type UnitView = {
  id: string;
  unitNumber: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  marketRentCents: number | null;
  securityDepositCents: number | null;
  petDepositCents: number | null;
  petRentCents: number | null;
  parkingSpot: string | null;
  parkingRentCents: number | null;
  utilitiesIncluded: string[];
  status: string;
};

const STATUS_STYLE: Record<string, string> = {
  VACANT: "bg-amber-50 text-amber-800",
  OCCUPIED: "bg-patina-tint text-patina",
  NOTICE: "bg-stone-100 text-stone-600",
};

const STATUS_LABEL: Record<string, string> = {
  OCCUPIED: "Occupied",
  VACANT: "Vacant",
  NOTICE: "On notice",
};

/** The status IS the control: tap, pick the truth, the portrait follows. */
function UnitStatusSelect({
  unitId,
  unitNumber,
  status,
}: {
  unitId: string;
  unitNumber: string;
  status: string;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [shown, setShown] = useState(status);

  async function change(next: string) {
    if (next === shown) return;
    const previous = shown;
    setShown(next);
    const res = await fetch(`/api/v1/landlord/units/${unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) {
      setShown(previous);
      toast(`Couldn't update ${unitTitle(unitNumber)}.`, "bad");
      return;
    }
    toast(`${unitTitle(unitNumber)} is now ${STATUS_LABEL[next]?.toLowerCase()}.`);
    router.refresh();
  }

  return (
    <select
      value={shown}
      onChange={(e) => change(e.target.value)}
      aria-label="Unit status"
      className={`cursor-pointer appearance-none rounded-full border-0 py-0.5 pl-2 pr-5 text-xs font-medium transition focus:outline-none focus:ring-1 focus:ring-patina ${STATUS_STYLE[shown] ?? "bg-stone-100 text-stone-600"}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 6'%3E%3Cpath d='M0 0h8L4 6z' fill='%2378716c'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 6px center",
        backgroundSize: "7px",
      }}
    >
      {Object.entries(STATUS_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function unitTitle(unitNumber: string): string {
  return /^\d/.test(unitNumber) ? `Unit ${unitNumber}` : unitNumber;
}

const dollars = (cents: number | null) => (cents != null ? (cents / 100).toString() : null);

/** "$1,850 deposit · pet +$50/mo · parking +$150/mo" */
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

function UnitCard({
  unit,
  onExpand,
  onDelete,
}: {
  unit: UnitView;
  onExpand: () => void;
  onDelete: () => void;
}) {
  const occupied = unit.status !== "VACANT";
  const specs = [
    unit.bedrooms != null ? `${unit.bedrooms} bd` : null,
    unit.bathrooms != null ? `${unit.bathrooms} ba` : null,
    unit.squareFeet != null ? `${unit.squareFeet.toLocaleString()} sqft` : null,
  ].filter(Boolean);
  const terms = termsSubline(unit);

  return (
    <div className="group relative rounded-xl border border-stone-200 bg-white p-4 transition hover:border-patina">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-display text-lg font-semibold text-stone-900">
          {unitTitle(unit.unitNumber)}
        </p>
        <UnitStatusSelect unitId={unit.id} unitNumber={unit.unitNumber} status={unit.status} />
      </div>

      <div className="mt-2 pb-6">
        {unit.marketRentCents != null ? (
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-semibold tabular-nums text-stone-900">
              {formatCents(unit.marketRentCents)}
            </span>
            <span className="text-xs text-stone-500">/mo {occupied ? "rent" : "asking"}</span>
          </p>
        ) : (
          <button onClick={onExpand} className="text-sm text-stone-400 transition hover:text-copper-deep">
            <span className="mr-1 font-semibold text-copper">+</span>
            {occupied ? "Set the rent" : "Set asking rent"}
          </button>
        )}
        {terms && <p className="mt-1 text-xs text-stone-500">{terms}</p>}
        {specs.length > 0 && <p className="mt-1 text-sm text-stone-500">{specs.join(" · ")}</p>}
      </div>

      {/* Reachable everywhere: visible on touch, hover-revealed on desktop. */}
      <div className="absolute right-3 bottom-3 flex items-center gap-1 transition sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          onClick={onExpand}
          title="Edit terms"
          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <IconPencil className="h-3.5 w-3.5" />
        </button>
        <ConfirmButton
          onConfirm={onDelete}
          confirmLabel="Delete"
          title="Delete unit"
          className="rounded-lg p-1.5 text-stone-300 transition hover:bg-red-50 hover:text-red-600"
        >
          <IconClose className="h-3.5 w-3.5" />
        </ConfirmButton>
      </div>
    </div>
  );
}

/** Expanded in place: every term is its own self-saving row. */
function UnitTermsPanel({ unit, onClose }: { unit: UnitView; onClose: () => void }) {
  const patch = useRowPatch(`/api/v1/landlord/units/${unit.id}`);
  const occupied = unit.status !== "VACANT";

  const money = (cents: number | null, suffix = "") =>
    cents != null ? `${formatCents(cents)}${suffix}` : null;

  return (
    <div className="col-span-full rounded-xl border border-patina bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-display text-lg font-semibold text-stone-900">
          {unitTitle(unit.unitNumber)}
        </p>
        <div className="flex items-center gap-2">
          <UnitStatusSelect unitId={unit.id} unitNumber={unit.unitNumber} status={unit.status} />
          <button onClick={onClose} className={buttonCls("ghost", "sm")}>
            Done
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-x-10 sm:grid-cols-2">
        <dl>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-copper-deep">
            Money
          </p>
          <EditableRow
            label={occupied ? "Rent" : "Asking rent"}
            value={dollars(unit.marketRentCents)}
            display={money(unit.marketRentCents, "/mo")}
            emptyPrompt={occupied ? "What does it rent for?" : "What should it list at?"}
            kind={{ kind: "money", placeholder: "1,850" }}
            onSave={(v) => patch({ marketRentDollars: v })}
            savedToast="Rent saved."
          />
          <EditableRow
            label="Deposit"
            value={dollars(unit.securityDepositCents)}
            display={money(unit.securityDepositCents)}
            emptyPrompt="Security deposit held."
            kind={{ kind: "money", placeholder: "1,850" }}
            onSave={(v) => patch({ securityDepositDollars: v })}
            savedToast="Deposit saved."
          />
          <EditableRow
            label="Pet deposit"
            value={dollars(unit.petDepositCents)}
            display={money(unit.petDepositCents)}
            emptyPrompt="One-time, if pets move in."
            kind={{ kind: "money", placeholder: "300" }}
            onSave={(v) => patch({ petDepositDollars: v })}
            savedToast="Pet deposit saved."
          />
          <EditableRow
            label="Pet rent"
            value={dollars(unit.petRentCents)}
            display={money(unit.petRentCents, "/mo")}
            emptyPrompt="Monthly, per pet."
            kind={{ kind: "money", placeholder: "50" }}
            onSave={(v) => patch({ petRentDollars: v })}
            savedToast="Pet rent saved."
          />
          <EditableRow
            label="Parking rent"
            value={dollars(unit.parkingRentCents)}
            display={
              unit.parkingRentCents === 0 ? "Included" : money(unit.parkingRentCents, "/mo")
            }
            emptyPrompt="Monthly; enter 0 if included."
            kind={{ kind: "money", placeholder: "150" }}
            onSave={(v) => patch({ parkingRentDollars: v })}
            savedToast="Parking rent saved."
          />
          <EditableRow
            label="Utilities"
            value={unit.utilitiesIncluded}
            emptyPrompt="Which utilities are included?"
            kind={{ kind: "chips", suggestions: UTILITY_SUGGESTIONS, placeholder: "Add utility" }}
            onSave={(v) => patch({ utilitiesIncluded: Array.isArray(v) ? v : [] })}
            savedToast="Utilities saved."
          />
        </dl>

        <dl>
          <p className="mb-1 mt-4 text-[10px] font-semibold uppercase tracking-widest text-patina sm:mt-0">
            Home
          </p>
          <EditableRow
            label="Unit name"
            value={unit.unitNumber}
            emptyPrompt="Name or number."
            kind={{ kind: "text", placeholder: "2F, 101, Garden…" }}
            onSave={(v) => patch({ unitNumber: v })}
            savedToast="Renamed."
            required
          />
          <EditableRow
            label="Beds"
            value={unit.bedrooms?.toString() ?? null}
            emptyPrompt="How many bedrooms?"
            kind={{ kind: "number", placeholder: "2" }}
            onSave={(v) => patch({ bedrooms: v })}
            savedToast="Saved."
          />
          <EditableRow
            label="Baths"
            value={unit.bathrooms?.toString() ?? null}
            emptyPrompt="Half baths count as .5"
            kind={{ kind: "number", decimal: true, placeholder: "1.5" }}
            onSave={(v) => patch({ bathrooms: v })}
            savedToast="Saved."
          />
          <EditableRow
            label="Sq ft"
            value={unit.squareFeet?.toString() ?? null}
            emptyPrompt="Approximate is fine."
            kind={{ kind: "number", placeholder: "850" }}
            onSave={(v) => patch({ squareFeet: v })}
            savedToast="Saved."
          />
          <EditableRow
            label="Parking spot"
            value={unit.parkingSpot}
            emptyPrompt="Assigned spot, garage, street permit?"
            kind={{ kind: "text", placeholder: "1 assigned spot, garage" }}
            onSave={(v) => patch({ parkingSpot: v })}
            savedToast="Saved."
          />
        </dl>
      </div>
    </div>
  );
}

/** Create stays a tiny one-shot form; terms entry continues in the panel. */
function NewUnitCard({
  propertyId,
  onCreated,
  onClose,
}: {
  propertyId: string;
  onCreated: (id: string) => void;
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
    onCreated(data.unit.id);
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
  const [expandedId, setExpandedId] = useState<string | "new" | null>(null);

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
        {units.map((u) =>
          expandedId === u.id ? (
            <UnitTermsPanel key={u.id} unit={u} onClose={() => setExpandedId(null)} />
          ) : (
            <UnitCard
              key={u.id}
              unit={u}
              onExpand={() => setExpandedId(u.id)}
              onDelete={() => void remove(u)}
            />
          ),
        )}
        {expandedId === "new" ? (
          <NewUnitCard
            propertyId={propertyId}
            onCreated={(id) => setExpandedId(id)}
            onClose={() => setExpandedId(null)}
          />
        ) : (
          <button
            onClick={() => setExpandedId("new")}
            className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 text-sm font-medium text-stone-400 transition hover:border-patina hover:text-patina"
          >
            <IconPlus className="h-4 w-4" /> Add unit
          </button>
        )}
      </div>
    </section>
  );
}
