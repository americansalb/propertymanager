"use client";

import { useId, useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";
import { EditableRow, useRowPatch } from "@/components/ui-inline";
import { IconPencil } from "@/components/icons";
import { PROPERTY_TYPE_LABEL, addressLine } from "@/lib/property-types";

/**
 * The property's own facts: what it is called, where it is, what kind of
 * building it is. Each row edits in place, like every other row in the app.
 */

export type PropertyCore = {
  id: string;
  name: string;
  type: string;
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zipCode: string;
};

export function PropertyFacts({ property }: { property: PropertyCore }) {
  const patch = useRowPatch(`/api/v1/landlord/properties/${property.id}`);

  return (
    <div>
      <EditableRow
        label="Name"
        value={property.name}
        emptyPrompt="What do you call this property?"
        kind={{ kind: "text", placeholder: "Oakdale Duplex" }}
        onSave={(v) => patch({ name: v })}
        savedToast="Renamed."
        required
      />
      <AddressRow property={property} onSave={patch} />
      <EditableRow
        label="Kind of property"
        value={property.type}
        display={PROPERTY_TYPE_LABEL[property.type] ?? property.type}
        emptyPrompt="What kind of property is it?"
        kind={{
          kind: "select",
          options: Object.entries(PROPERTY_TYPE_LABEL).map(([value, label]) => ({ value, label })),
        }}
        onSave={(v) => patch({ type: v })}
        savedToast="Saved."
        required
      />
    </div>
  );
}

/** The address is five fields, so it gets its own small form in the row. */
function AddressRow({
  property,
  onSave,
}: {
  property: PropertyCore;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const fresh = () => ({
    address1: property.address1,
    address2: property.address2 ?? "",
    city: property.city,
    state: property.state,
    zipCode: property.zipCode,
  });
  const [addr, setAddr] = useState(fresh);

  if (!editing) {
    return (
      <button
        onClick={() => {
          setAddr(fresh());
          setEditing(true);
        }}
        className="group -mx-3 flex min-h-12 w-[calc(100%+1.5rem)] flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition hover:bg-stone-50 focus-visible:bg-stone-50 sm:grid sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-x-4 sm:gap-y-0"
      >
        <span className="text-sm leading-6 text-stone-500">Address</span>
        <span className="flex min-w-0 items-start justify-between gap-3 text-base leading-6">
          <span className="min-w-0 font-medium text-stone-900">{addressLine(property)}</span>
          <IconPencil className="mt-1 h-3.5 w-3.5 shrink-0 text-stone-400 transition group-hover:text-stone-600" />
        </span>
      </button>
    );
  }

  const set = (k: keyof typeof addr) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));
  const label = "mb-1 block text-sm font-medium text-stone-700";

  async function save() {
    setBusy(true);
    const ok = await onSave({ ...addr, state: addr.state.toUpperCase() });
    setBusy(false);
    if (ok) setEditing(false);
  }

  return (
    <div className="my-2 rounded-xl border border-stone-200 bg-stone-50 p-4">
      <p className="font-semibold text-stone-900">Address</p>
      <div className="mt-3 space-y-3">
        <div>
          <label htmlFor={`${id}-a1`} className={label}>
            Street address
          </label>
          <input id={`${id}-a1`} autoFocus value={addr.address1} onChange={set("address1")} className={inputCls} />
        </div>
        <div>
          <label htmlFor={`${id}-a2`} className={label}>
            Apartment, suite or floor{" "}
            <span className="font-normal text-stone-500">(if any)</span>
          </label>
          <input id={`${id}-a2`} value={addr.address2} onChange={set("address2")} className={inputCls} />
        </div>
        <div className="grid grid-cols-[1fr_5rem_7rem] gap-3">
          <div>
            <label htmlFor={`${id}-c`} className={label}>
              City
            </label>
            <input id={`${id}-c`} value={addr.city} onChange={set("city")} className={inputCls} />
          </div>
          <div>
            <label htmlFor={`${id}-s`} className={label}>
              State
            </label>
            <input id={`${id}-s`} value={addr.state} onChange={set("state")} maxLength={2} className={inputCls} />
          </div>
          <div>
            <label htmlFor={`${id}-z`} className={label}>
              ZIP
            </label>
            <input id={`${id}-z`} value={addr.zipCode} onChange={set("zipCode")} inputMode="numeric" className={inputCls} />
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => void save()} disabled={busy} className={buttonCls("primary")}>
          {busy ? "Saving…" : "Save address"}
        </button>
        <button onClick={() => setEditing(false)} disabled={busy} className={buttonCls("ghost")}>
          Cancel
        </button>
      </div>
    </div>
  );
}
