"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";
import { buttonCls } from "@/components/ui";

const inputCls =
  "w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";

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
  const num = (v: string) => (v === "" ? (mode === "update" ? null : undefined) : v);
  const payload: Record<string, unknown> = {
    unitNumber: d.unitNumber,
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
  VACANT: "Vacant",
  OCCUPIED: "Occupied",
  NOTICE: "On notice",
};

/**
 * The answer to "how do I make it not vacant": the status IS the control.
 * One tap on the badge, pick the truth, the portrait windows follow.
 * Leases will set this automatically in 1.4; this stays as the manual lever.
 */
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

export function UnitsManager({ propertyId, units }: { propertyId: string; units: UnitView[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [busy, setBusy] = useState(false);

  function startEdit(u?: UnitView) {
    setError(null);
    setEditingId(u ? u.id : "new");
    setDraft(toDraft(u));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const isNew = editingId === "new";
    const res = await fetch(
      isNew ? `/api/v1/landlord/properties/${propertyId}/units` : `/api/v1/landlord/units/${editingId}`,
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
    setEditingId(null);
    router.refresh();
  }

  async function remove(unitId: string) {
    if (!window.confirm("Delete this unit?")) return;
    setError(null);
    const res = await fetch(`/api/v1/landlord/units/${unitId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
  }

  const editorRow = (
    <tr className="bg-stone-50">
      <td className="px-3 py-2"><input value={draft.unitNumber} onChange={(e) => setDraft({ ...draft, unitNumber: e.target.value })} placeholder="Unit #" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={draft.bedrooms} onChange={(e) => setDraft({ ...draft, bedrooms: e.target.value })} inputMode="numeric" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={draft.bathrooms} onChange={(e) => setDraft({ ...draft, bathrooms: e.target.value })} inputMode="decimal" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={draft.squareFeet} onChange={(e) => setDraft({ ...draft, squareFeet: e.target.value })} inputMode="numeric" className={inputCls} /></td>
      <td className="px-3 py-2"><input value={draft.marketRentDollars} onChange={(e) => setDraft({ ...draft, marketRentDollars: e.target.value })} inputMode="decimal" placeholder="$" className={inputCls} /></td>
      <td className="px-3 py-2" />
      <td className="px-3 py-2 text-right whitespace-nowrap">
        <button onClick={save} disabled={busy || draft.unitNumber.trim() === ""} className={buttonCls("primary", "sm")}>
          {busy ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setEditingId(null)} className="ml-2 text-xs text-stone-500 hover:text-stone-700">Cancel</button>
      </td>
    </tr>
  );

  return (
    <div className="mt-6 rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-900">Units ({units.length})</h2>
        <button onClick={() => startEdit()} className={buttonCls("secondary", "sm")}>
          + Add unit
        </button>
      </div>
      {error && <p className="px-4 pt-3 text-sm text-red-600">{error}</p>}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-stone-400">
            <th className="px-3 py-2 font-medium">Unit</th>
            <th className="px-3 py-2 font-medium">Beds</th>
            <th className="px-3 py-2 font-medium">Baths</th>
            <th className="px-3 py-2 font-medium">Sq ft</th>
            <th className="px-3 py-2 font-medium">Market rent</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {units.map((u) =>
            editingId === u.id ? (
              <UnitEditorKeyed key={u.id}>{editorRow}</UnitEditorKeyed>
            ) : (
              <tr key={u.id}>
                <td className="px-3 py-2.5 font-medium text-stone-900">{u.unitNumber}</td>
                <td className="px-3 py-2.5 text-stone-600">{u.bedrooms ?? "-"}</td>
                <td className="px-3 py-2.5 text-stone-600">{u.bathrooms ?? "-"}</td>
                <td className="px-3 py-2.5 text-stone-600">{u.squareFeet?.toLocaleString() ?? "-"}</td>
                <td className="px-3 py-2.5 tabular-nums text-stone-600">{u.marketRentCents != null ? formatCents(u.marketRentCents) : "-"}</td>
                <td className="px-3 py-2.5">
                  <UnitStatusSelect unitId={u.id} status={u.status} />
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">
                  <button onClick={() => startEdit(u)} className="text-xs font-medium text-copper-deep hover:underline">Edit</button>
                  <button onClick={() => remove(u.id)} className="ml-3 text-xs text-stone-400 hover:text-red-600">Delete</button>
                </td>
              </tr>
            ),
          )}
          {editingId === "new" && editorRow}
          {units.length === 0 && editingId !== "new" && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-sm text-stone-400">No units yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// Table rows can't be fragments with keys inline; tiny wrapper keeps types happy.
function UnitEditorKeyed({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
