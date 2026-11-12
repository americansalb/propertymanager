"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { UTILITY_SUGGESTIONS } from "@/lib/validation/property";
import { useToast } from "@/components/ui-feedback";
import { AddChips, EditableRow, useOptionalRows, useRowPatch } from "@/components/ui-inline";
import { unitTitle } from "@/lib/units";

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
  /** Card subline: who lives here / who's been invited (property page only). */
  tenantNames?: string[];
  pendingInviteEmail?: string | null;
};

export const STATUS_LABEL: Record<string, string> = {
  OCCUPIED: "Occupied",
  VACANT: "Vacant",
  NOTICE: "On notice",
};

const STATUS_STYLE: Record<string, string> = {
  VACANT: "bg-copper-tint text-copper-deep",
  OCCUPIED: "bg-patina-tint text-patina",
  NOTICE: "bg-stone-100 text-stone-600",
};

export { unitTitle } from "@/lib/units";

/** The status IS the control: tap it and pick what is true. */
export function UnitStatusSelect({
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
      onClick={(e) => e.stopPropagation()}
      aria-label="Unit status"
      className={`min-h-8 cursor-pointer appearance-none rounded-full border-0 py-1 pl-3 pr-7 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-patina/40 ${STATUS_STYLE[shown] ?? "bg-stone-100 text-stone-600"}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 6'%3E%3Cpath d='M0 0h8L4 6z' fill='%23476b5f'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
        backgroundSize: "8px",
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

const dollars = (cents: number | null) => (cents != null ? (cents / 100).toString() : null);
const money = (cents: number | null, suffix = "") =>
  cents != null ? `${formatCents(cents)}${suffix}` : null;

/**
 * The home itself: what it is called and how big it is. Name and bedrooms
 * always show; the rest appear once filled in, or when asked for.
 */
export function UnitFacts({ unit }: { unit: UnitView }) {
  const patch = useRowPatch(`/api/v1/landlord/units/${unit.id}`);
  const rows = useOptionalRows({
    baths: unit.bathrooms != null,
    sqft: unit.squareFeet != null,
    parking: Boolean(unit.parkingSpot),
  });
  const chipLabel = { baths: "Bathrooms", sqft: "Size", parking: "Parking" } as const;

  return (
    <div>
      <EditableRow
        label="Name"
        value={unit.unitNumber}
        emptyPrompt="Name or number"
        kind={{ kind: "text", placeholder: "2F, 101, Garden…" }}
        onSave={(v) => patch({ unitNumber: v })}
        savedToast="Renamed."
        required
      />
      <EditableRow
        label="Bedrooms"
        value={unit.bedrooms?.toString() ?? null}
        emptyPrompt="How many bedrooms?"
        kind={{ kind: "number", placeholder: "2" }}
        onSave={(v) => patch({ bedrooms: v })}
        savedToast="Saved."
      />
      {rows.shows("baths") && (
        <EditableRow
          label="Bathrooms"
          value={unit.bathrooms?.toString() ?? null}
          emptyPrompt="A half bath counts as .5"
          kind={{ kind: "number", decimal: true, placeholder: "1.5" }}
          onSave={(v) => patch({ bathrooms: v })}
          savedToast="Saved."
          autoOpen={rows.fresh("baths")}
          onDismissEmpty={() => rows.hide("baths")}
        />
      )}
      {rows.shows("sqft") && (
        <EditableRow
          label="Size"
          value={unit.squareFeet?.toString() ?? null}
          display={unit.squareFeet != null ? `${unit.squareFeet.toLocaleString()} sq ft` : null}
          emptyPrompt="Square feet. A rough number is fine."
          kind={{ kind: "number", placeholder: "850" }}
          onSave={(v) => patch({ squareFeet: v })}
          savedToast="Saved."
          autoOpen={rows.fresh("sqft")}
          onDismissEmpty={() => rows.hide("sqft")}
        />
      )}
      {rows.shows("parking") && (
        <EditableRow
          label="Parking"
          value={unit.parkingSpot}
          emptyPrompt="Assigned spot, garage, street permit?"
          kind={{ kind: "text", placeholder: "1 assigned spot, garage" }}
          onSave={(v) => patch({ parkingSpot: v })}
          savedToast="Saved."
          autoOpen={rows.fresh("parking")}
          onDismissEmpty={() => rows.hide("parking")}
        />
      )}
      <AddChips
        title="Add a detail"
        items={rows.pending.map((key) => ({ key, label: chipLabel[key] }))}
        onPick={(key) => rows.reveal(key as keyof typeof chipLabel)}
      />
    </div>
  );
}

/**
 * What this home rents for when it is next offered. A lease starts as a
 * copy of these, so they only matter between tenants.
 */
export function UnitAskingTerms({ unit }: { unit: UnitView }) {
  const patch = useRowPatch(`/api/v1/landlord/units/${unit.id}`);
  const rows = useOptionalRows({
    deposit: unit.securityDepositCents != null,
    petDeposit: unit.petDepositCents != null,
    petRent: unit.petRentCents != null,
    parkingRent: unit.parkingRentCents != null,
    utilities: unit.utilitiesIncluded.length > 0,
  });
  const chipLabel = {
    deposit: "Deposit",
    petDeposit: "Pet deposit",
    petRent: "Pet rent",
    parkingRent: "Parking rent",
    utilities: "Utilities included",
  } as const;

  return (
    <div>
      <EditableRow
        label="Asking rent"
        value={dollars(unit.marketRentCents)}
        display={money(unit.marketRentCents, " a month")}
        emptyPrompt="What should it rent for?"
        kind={{ kind: "money", placeholder: "1,850" }}
        onSave={(v) => patch({ marketRentDollars: v })}
        savedToast="Asking rent saved."
      />
      {rows.shows("deposit") && (
        <EditableRow
          label="Deposit"
          value={dollars(unit.securityDepositCents)}
          display={money(unit.securityDepositCents)}
          emptyPrompt="Security deposit"
          kind={{ kind: "money", placeholder: "1,850" }}
          onSave={(v) => patch({ securityDepositDollars: v })}
          savedToast="Deposit saved."
          autoOpen={rows.fresh("deposit")}
          onDismissEmpty={() => rows.hide("deposit")}
        />
      )}
      {rows.shows("petDeposit") && (
        <EditableRow
          label="Pet deposit"
          value={dollars(unit.petDepositCents)}
          display={money(unit.petDepositCents)}
          emptyPrompt="One time, if pets move in"
          kind={{ kind: "money", placeholder: "300" }}
          onSave={(v) => patch({ petDepositDollars: v })}
          savedToast="Pet deposit saved."
          autoOpen={rows.fresh("petDeposit")}
          onDismissEmpty={() => rows.hide("petDeposit")}
        />
      )}
      {rows.shows("petRent") && (
        <EditableRow
          label="Pet rent"
          value={dollars(unit.petRentCents)}
          display={money(unit.petRentCents, " a month")}
          emptyPrompt="Each month, per pet"
          kind={{ kind: "money", placeholder: "50" }}
          onSave={(v) => patch({ petRentDollars: v })}
          savedToast="Pet rent saved."
          autoOpen={rows.fresh("petRent")}
          onDismissEmpty={() => rows.hide("petRent")}
        />
      )}
      {rows.shows("parkingRent") && (
        <EditableRow
          label="Parking rent"
          value={dollars(unit.parkingRentCents)}
          display={
            unit.parkingRentCents === 0 ? "Included" : money(unit.parkingRentCents, " a month")
          }
          emptyPrompt="Each month. Enter 0 if it is included."
          kind={{ kind: "money", placeholder: "150" }}
          onSave={(v) => patch({ parkingRentDollars: v })}
          savedToast="Parking rent saved."
          autoOpen={rows.fresh("parkingRent")}
          onDismissEmpty={() => rows.hide("parkingRent")}
        />
      )}
      {rows.shows("utilities") && (
        <EditableRow
          label="Utilities included"
          value={unit.utilitiesIncluded}
          emptyPrompt="Which utilities are included?"
          kind={{ kind: "chips", suggestions: UTILITY_SUGGESTIONS, placeholder: "Add a utility" }}
          onSave={(v) => patch({ utilitiesIncluded: Array.isArray(v) ? v : [] })}
          savedToast="Utilities saved."
          autoOpen={rows.fresh("utilities")}
          onDismissEmpty={() => rows.hide("utilities")}
        />
      )}
      <AddChips
        title="Add to the asking terms"
        items={rows.pending.map((key) => ({ key, label: chipLabel[key] }))}
        onPick={(key) => rows.reveal(key as keyof typeof chipLabel)}
      />
    </div>
  );
}
