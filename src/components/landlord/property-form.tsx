"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IconClose } from "@/components/icons";
import { buttonCls } from "@/components/ui";

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";
const labelCls = "mb-1 block text-sm font-medium text-stone-700";

type UnitRow = {
  unitNumber: string;
  bedrooms: string;
  bathrooms: string;
  squareFeet: string;
  marketRentDollars: string;
};

const emptyUnit = (): UnitRow => ({
  unitNumber: "",
  bedrooms: "",
  bathrooms: "",
  squareFeet: "",
  marketRentDollars: "",
});

export type PropertyFormInitial = {
  name: string;
  type: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
};

export function PropertyForm({
  mode,
  propertyId,
  initial,
}: {
  mode: "create" | "edit";
  propertyId?: string;
  initial?: PropertyFormInitial;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [units, setUnits] = useState<UnitRow[]>([]);

  function setUnit(i: number, patch: Partial<UnitRow>) {
    setUnits((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: form.get("name"),
      type: form.get("type"),
      address1: form.get("address1"),
      address2: form.get("address2") || "",
      city: form.get("city"),
      state: form.get("state"),
      zipCode: form.get("zipCode"),
    };
    if (mode === "create") {
      payload.units = units
        .filter((u) => u.unitNumber.trim() !== "")
        .map((u) => ({
          unitNumber: u.unitNumber,
          ...(u.bedrooms !== "" ? { bedrooms: u.bedrooms } : {}),
          ...(u.bathrooms !== "" ? { bathrooms: u.bathrooms } : {}),
          ...(u.squareFeet !== "" ? { squareFeet: u.squareFeet } : {}),
          ...(u.marketRentDollars !== "" ? { marketRentDollars: u.marketRentDollars } : {}),
        }));
    }

    const res = await fetch(
      mode === "create" ? "/api/v1/landlord/properties" : `/api/v1/landlord/properties/${propertyId}`,
      {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = (await res.json().catch(() => ({}))) as {
      property?: { id: string };
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      setBusy(false);
      return;
    }
    router.push(`/landlord/properties/${data.property?.id ?? propertyId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className={labelCls}>Property name</label>
          <input id="name" name="name" required defaultValue={initial?.name} placeholder="e.g. Oakdale Duplex" className={inputCls} />
        </div>
        <div>
          <label htmlFor="type" className={labelCls}>Type</label>
          <select id="type" name="type" defaultValue={initial?.type ?? "SINGLE_FAMILY"} className={inputCls}>
            <option value="SINGLE_FAMILY">Single family</option>
            <option value="MULTIFAMILY">Multifamily</option>
            <option value="CONDO">Condo</option>
            <option value="TOWNHOUSE">Townhouse</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="address1" className={labelCls}>Street address</label>
        <input id="address1" name="address1" required defaultValue={initial?.address1} className={inputCls} />
      </div>
      <div>
        <label htmlFor="address2" className={labelCls}>Address line 2 <span className="text-stone-400">(optional)</span></label>
        <input id="address2" name="address2" defaultValue={initial?.address2} className={inputCls} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="city" className={labelCls}>City</label>
          <input id="city" name="city" required defaultValue={initial?.city} className={inputCls} />
        </div>
        <div>
          <label htmlFor="state" className={labelCls}>State</label>
          <input id="state" name="state" required maxLength={2} placeholder="IL" defaultValue={initial?.state} className={inputCls} />
        </div>
        <div>
          <label htmlFor="zipCode" className={labelCls}>ZIP</label>
          <input id="zipCode" name="zipCode" required placeholder="60657" defaultValue={initial?.zipCode} className={inputCls} />
        </div>
      </div>

      {mode === "create" && (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-stone-900">Units</h3>
              <p className="text-xs text-stone-500">
                Leave empty for a single-family home (a &quot;Main&quot; unit is created automatically).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setUnits((r) => [...r, emptyUnit()])}
              className={buttonCls("secondary", "sm")}
            >
              + Add unit
            </button>
          </div>
          {units.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-[1fr_64px_64px_72px_88px_28px] gap-2 text-[11px] font-medium uppercase tracking-wide text-stone-400">
                <span>Unit #</span><span>Beds</span><span>Baths</span><span>Sq ft</span><span>Rent $</span><span />
              </div>
              {units.map((u, i) => (
                <div key={i} className="grid grid-cols-[1fr_64px_64px_72px_88px_28px] items-center gap-2">
                  <input value={u.unitNumber} onChange={(e) => setUnit(i, { unitNumber: e.target.value })} placeholder={`${i + 1}F`} className={inputCls} />
                  <input value={u.bedrooms} onChange={(e) => setUnit(i, { bedrooms: e.target.value })} inputMode="numeric" className={inputCls} />
                  <input value={u.bathrooms} onChange={(e) => setUnit(i, { bathrooms: e.target.value })} inputMode="decimal" className={inputCls} />
                  <input value={u.squareFeet} onChange={(e) => setUnit(i, { squareFeet: e.target.value })} inputMode="numeric" className={inputCls} />
                  <input value={u.marketRentDollars} onChange={(e) => setUnit(i, { marketRentDollars: e.target.value })} inputMode="decimal" className={inputCls} />
                  <button type="button" onClick={() => setUnits((r) => r.filter((_, idx) => idx !== i))} aria-label="Remove unit" className="text-stone-400 hover:text-red-600"><IconClose className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className={`${buttonCls("primary")} px-5 py-2.5`}>
          {busy ? "Saving…" : mode === "create" ? "Create property" : "Save changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className={`${buttonCls("secondary")} px-5 py-2.5`}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
