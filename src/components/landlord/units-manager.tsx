"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { buttonCls, inputCls } from "@/components/ui";
import { IconClose, IconPencil, IconPlus } from "@/components/icons";

export type UnitView = {
  id: string;
  unitNumber: string;
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  marketRentCents: number | null;
  status: string;
};

type Draft = {
  unitNumber: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  marketRentDollars: string;
};

const toDraft = (u?: UnitView): Draft => ({
  unitNumber: u?.unitNumber ?? "",
  bedrooms: u?.bedrooms?.toString() ?? "",
  bathrooms: u?.bathrooms?.toString() ?? "",
  squareFeet: u?.squareFeet?.toString() ?? "",
  marketRentDollars: u?.marketRentCents != null ? (u.marketRentCents / 100).toString() : "",
});

// Create omits blanks; update sends explicit nulls so clearing a field works.
function draftPayload(d: Draft, mode: "create" | "update") {
  const num = (v: string) => (v === "" ? (mode === "update" ? null : undefined) : v.replace(/,/g, ""));
  const payload: Record<string, unknown> = {
    unitNumber: d.unitNumber.trim(),
    bedrooms: num(d.bedrooms),
    bathrooms: num(d.bathrooms),
    squareFeet: num(d.squareFeet),
    marketRentDollars: num(d.marketRentDollars),
  };
  for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k];
  return payload;
}

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
function UnitStatusSelect({ unitId, status }: { unitId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    if (next === status) return;
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/units/${unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <select
      value={status}
      onChange={(e) => change(e.target.value)}
      disabled={busy}
      aria-label="Unit status"
      className={`cursor-pointer appearance-none rounded-full border-0 py-0.5 pl-2 pr-5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-patina disabled:opacity-50 ${STATUS_STYLE[status] ?? "bg-stone-100 text-stone-600"}`}
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

function UnitCard({
  unit,
  onEdit,
  onDelete,
}: {
  unit: UnitView;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const occupied = unit.status !== "VACANT";
  const specs = [
    unit.bedrooms != null ? `${unit.bedrooms} bd` : null,
    unit.bathrooms != null ? `${unit.bathrooms} ba` : null,
    unit.squareFeet != null ? `${unit.squareFeet.toLocaleString()} sqft` : null,
  ].filter(Boolean);

  return (
    <div className="group relative rounded-xl border border-stone-200 bg-white p-4 transition hover:border-patina">
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-display text-lg font-semibold text-stone-900">
          {unitTitle(unit.unitNumber)}
        </p>
        <UnitStatusSelect unitId={unit.id} status={unit.status} />
      </div>

      <div className="mt-2">
        {unit.marketRentCents != null ? (
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-semibold tabular-nums text-stone-900">
              {formatCents(unit.marketRentCents)}
            </span>
            <span className="text-xs text-stone-500">/mo {occupied ? "rent" : "asking"}</span>
          </p>
        ) : (
          <button
            onClick={onEdit}
            className="text-sm text-stone-400 transition hover:text-copper-deep"
          >
            <span className="mr-1 font-semibold text-copper">+</span>
            {occupied ? "Set the rent" : "Set asking rent"}
          </button>
        )}
        {specs.length > 0 && <p className="mt-1 text-sm text-stone-500">{specs.join(" · ")}</p>}
      </div>

      <div className="absolute right-3 bottom-3 flex gap-1 opacity-0 transition group-hover:opacity-100">
        <button
          onClick={onEdit}
          title="Edit unit"
          className="rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
        >
          <IconPencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          title="Delete unit"
          className="rounded-lg p-1.5 text-stone-300 transition hover:bg-red-50 hover:text-red-600"
        >
          <IconClose className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function UnitForm({
  propertyId,
  unit,
  occupied,
  onClose,
}: {
  propertyId: string;
  unit?: UnitView;
  occupied?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(toDraft(unit));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = !unit;

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraft((d) => ({ ...d, [k]: e.target.value }));
    setError(null);
  };

  async function save() {
    if (draft.unitNumber.trim() === "") {
      setError("Give the unit a name or number.");
      return;
    }
    setBusy(true);
    const res = await fetch(
      isNew
        ? `/api/v1/landlord/properties/${propertyId}/units`
        : `/api/v1/landlord/units/${unit.id}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftPayload(draft, isNew ? "create" : "update")),
      },
    );
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    onClose();
    router.refresh();
  }

  const fieldLabel = "text-[10px] font-semibold uppercase tracking-wide text-stone-400";

  return (
    <div className="rounded-xl border border-patina bg-white p-4">
      <div className="space-y-2.5">
        <div>
          <label className={fieldLabel}>Unit name or number</label>
          <input autoFocus value={draft.unitNumber} onChange={set("unitNumber")} placeholder="2F, 101, Garden…" aria-label="Unit name or number" className={inputCls} />
        </div>
        <div>
          <label className={fieldLabel}>{occupied ?? unit?.status !== "VACANT" ? "Monthly rent" : "Asking rent"}</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">$</span>
            <input value={draft.marketRentDollars} onChange={set("marketRentDollars")} inputMode="decimal" placeholder="1,850" aria-label="Monthly rent" className={`${inputCls} pl-7`} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className={fieldLabel}>Beds</label>
            <input value={draft.bedrooms} onChange={set("bedrooms")} inputMode="numeric" aria-label="Bedrooms" className={inputCls} />
          </div>
          <div>
            <label className={fieldLabel}>Baths</label>
            <input value={draft.bathrooms} onChange={set("bathrooms")} inputMode="decimal" aria-label="Bathrooms" className={inputCls} />
          </div>
          <div>
            <label className={fieldLabel}>Sq ft</label>
            <input value={draft.squareFeet} onChange={set("squareFeet")} inputMode="numeric" aria-label="Square feet" className={inputCls} />
          </div>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={busy} className={buttonCls("primary", "sm")}>
          {busy ? "Saving…" : isNew ? "Add unit" : "Save"}
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
  const [editingId, setEditingId] = useState<string | "new" | null>(null);

  async function remove(unitId: string) {
    if (!window.confirm("Delete this unit?")) return;
    const res = await fetch(`/api/v1/landlord/units/${unitId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-400">
        Units ({units.length})
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {units.map((u) =>
          editingId === u.id ? (
            <UnitForm key={u.id} propertyId={propertyId} unit={u} onClose={() => setEditingId(null)} />
          ) : (
            <UnitCard key={u.id} unit={u} onEdit={() => setEditingId(u.id)} onDelete={() => void remove(u.id)} />
          ),
        )}
        {editingId === "new" ? (
          <UnitForm propertyId={propertyId} occupied={false} onClose={() => setEditingId(null)} />
        ) : (
          <button
            onClick={() => setEditingId("new")}
            className="flex min-h-28 items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 text-sm font-medium text-stone-400 transition hover:border-patina hover:text-patina"
          >
            <IconPlus className="h-4 w-4" /> Add unit
          </button>
        )}
      </div>
    </section>
  );
}
