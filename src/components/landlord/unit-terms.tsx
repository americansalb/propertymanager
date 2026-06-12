"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { UTILITY_SUGGESTIONS } from "@/lib/validation/property";
import { useToast } from "@/components/ui-feedback";
import { EditableRow, useRowPatch } from "@/components/ui-inline";
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
};

export const STATUS_LABEL: Record<string, string> = {
  OCCUPIED: "Occupied",
  VACANT: "Vacant",
  NOTICE: "On notice",
};

const STATUS_STYLE: Record<string, string> = {
  VACANT: "bg-amber-50 text-amber-800",
  OCCUPIED: "bg-patina-tint text-patina",
  NOTICE: "bg-stone-100 text-stone-600",
};

export { unitTitle } from "@/lib/units";

/** The status IS the control: tap, pick the truth, the portrait follows. */
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

const dollars = (cents: number | null) => (cents != null ? (cents / 100).toString() : null);

/** The unit's standing terms as self-saving rows: Money and Home columns. */
export function UnitTermsGrid({ unit }: { unit: UnitView }) {
  const patch = useRowPatch(`/api/v1/landlord/units/${unit.id}`);
  const occupied = unit.status !== "VACANT";

  const money = (cents: number | null, suffix = "") =>
    cents != null ? `${formatCents(cents)}${suffix}` : null;

  return (
    <div className="grid gap-x-10 sm:grid-cols-2">
      <div>
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
          display={unit.parkingRentCents === 0 ? "Included" : money(unit.parkingRentCents, "/mo")}
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
      </div>

      <div>
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
      </div>
    </div>
  );
}
