"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCents } from "@/lib/money";

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

function draftPayload(d: Draft) {
  return {
    unitNumber: d.unitNumber,
    ...(d.bedrooms !== "" ? { bedrooms: d.bedrooms } : {}),
    ...(d.bathrooms !== "" ? { bathrooms: d.bathrooms } : {}),
    ...(d.squareFeet !== "" ? { squareFeet: d.squareFeet } : {}),
    ...(d.marketRentDollars !== "" ? { marketRentDollars: d.marketRentDollars } : {}),
  };
}

const STATUS_BADGE: Record<string, string> = {
  VACANT: "bg-amber-50 text-amber-800",
  OCCUPIED: "bg-patina-tint text-patina",
  NOTICE: "bg-stone-100 text-stone-600",
};

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
        body: JSON.stringify(draftPayload(draft)),
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
        <button onClick={save} disabled={busy || draft.unitNumber.trim() === ""} className="rounded-lg bg-iron px-3 py-1.5 text-xs font-semibold text-white hover:bg-iron-deep disabled:opacity-50">
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
        <button onClick={() => startEdit()} className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:border-stone-400">
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
                <td className="px-3 py-2.5 text-stone-600">{u.bedrooms ?? "—"}</td>
                <td className="px-3 py-2.5 text-stone-600">{u.bathrooms ?? "—"}</td>
                <td className="px-3 py-2.5 text-stone-600">{u.squareFeet?.toLocaleString() ?? "—"}</td>
                <td className="px-3 py-2.5 text-stone-600">{u.marketRentCents != null ? formatCents(u.marketRentCents) : "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[u.status] ?? "bg-stone-100 text-stone-600"}`}>
                    {u.status.toLowerCase()}
                  </span>
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
