"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";
import { IconPencil } from "@/components/icons";

/**
 * The page is the form: name, type, and address edit in place, same
 * philosophy as the unit-status badge. No separate edit screen.
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
  alternateAddress: string | null;
};

const TYPE_LABEL: Record<string, string> = {
  SINGLE_FAMILY: "Single family",
  MULTIFAMILY: "Multifamily",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

export function PropertyHeaderEditor({
  property,
  chips,
}: {
  property: PropertyCore;
  chips?: React.ReactNode;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function patch(body: Record<string, unknown>): Promise<boolean> {
    setError(null);
    const res = await fetch(`/api/v1/landlord/properties/${property.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  return (
    <div className="min-w-0 flex-1">
      <NameEditor name={property.name} onSave={(name) => patch({ name })} />
      <AddressEditor property={property} onSave={patch} />
      {property.alternateAddress && (
        <p className="mt-0.5 text-xs text-stone-400">also {property.alternateAddress}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TypeSelect type={property.type} onSave={(type) => patch({ type })} />
        {chips}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function NameEditor({
  name,
  onSave,
}: {
  name: string;
  onSave: (name: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  async function commit() {
    const next = value.trim();
    if (!next || next === name) {
      setValue(name);
      setEditing(false);
      return;
    }
    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        disabled={busy}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") {
            setValue(name);
            setEditing(false);
          }
        }}
        aria-label="Property name"
        className="w-full max-w-md rounded-lg border border-patina px-2 py-1 font-display text-2xl font-semibold tracking-tight text-stone-900 focus:outline-none focus:ring-1 focus:ring-patina"
      />
    );
  }
  return (
    <button
      onClick={() => {
        setValue(name);
        setEditing(true);
      }}
      className="group -mx-2 flex max-w-full items-center gap-2 rounded-lg px-2 py-0.5 text-left transition hover:bg-stone-100"
      title="Rename"
    >
      <span className="truncate font-display text-2xl font-semibold tracking-tight text-stone-900">
        {name}
      </span>
      <IconPencil className="h-4 w-4 shrink-0 text-stone-300 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

function TypeSelect({
  type,
  onSave,
}: {
  type: string;
  onSave: (type: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <select
      value={type}
      disabled={busy}
      onChange={async (e) => {
        setBusy(true);
        await onSave(e.target.value);
        setBusy(false);
      }}
      aria-label="Property type"
      className="cursor-pointer appearance-none rounded-full bg-stone-100 py-0.5 pl-2.5 pr-6 text-xs font-medium text-stone-600 focus:outline-none focus:ring-1 focus:ring-patina disabled:opacity-50"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 6'%3E%3Cpath d='M0 0h8L4 6z' fill='%2378716c'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 8px center",
        backgroundSize: "7px",
      }}
    >
      {Object.entries(TYPE_LABEL).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function AddressEditor({
  property,
  onSave,
}: {
  property: PropertyCore;
  onSave: (body: Record<string, unknown>) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addr, setAddr] = useState({
    address1: property.address1,
    address2: property.address2 ?? "",
    city: property.city,
    state: property.state,
    zipCode: property.zipCode,
  });

  const line = `${property.address1}${property.address2 ? `, ${property.address2}` : ""} · ${property.city}, ${property.state} ${property.zipCode}`;

  if (!editing) {
    return (
      <button
        onClick={() => {
          setAddr({
            address1: property.address1,
            address2: property.address2 ?? "",
            city: property.city,
            state: property.state,
            zipCode: property.zipCode,
          });
          setEditing(true);
        }}
        className="group mt-0.5 flex max-w-full items-center gap-1.5 text-left text-sm text-stone-500 transition hover:text-stone-700"
        title="Edit address"
      >
        <span className="truncate">{line}</span>
        <IconPencil className="h-3 w-3 shrink-0 text-stone-300 opacity-0 transition group-hover:opacity-100" />
      </button>
    );
  }

  const set = (k: keyof typeof addr) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setAddr((a) => ({ ...a, [k]: e.target.value }));

  return (
    <div className="mt-2 max-w-md space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
      <input value={addr.address1} onChange={set("address1")} aria-label="Street address" placeholder="Street address" className={inputCls} />
      <input value={addr.address2} onChange={set("address2")} aria-label="Address line 2" placeholder="Unit, suite, floor (optional)" className={inputCls} />
      <div className="grid grid-cols-[1fr_64px_96px] gap-2">
        <input value={addr.city} onChange={set("city")} aria-label="City" placeholder="City" className={inputCls} />
        <input value={addr.state} onChange={set("state")} aria-label="State" placeholder="IL" maxLength={2} className={inputCls} />
        <input value={addr.zipCode} onChange={set("zipCode")} aria-label="ZIP" placeholder="ZIP" className={inputCls} />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={async () => {
            setBusy(true);
            const ok = await onSave({ ...addr, state: addr.state.toUpperCase() });
            setBusy(false);
            if (ok) setEditing(false);
          }}
          disabled={busy}
          className={buttonCls("primary", "sm")}
        >
          {busy ? "Saving…" : "Save address"}
        </button>
        <button onClick={() => setEditing(false)} disabled={busy} className={buttonCls("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </div>
  );
}
