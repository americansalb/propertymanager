"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OptionCards, WizardShell } from "@/components/wizard/wizard-shell";
import { IconHome, IconProperty } from "@/components/icons";
import { buttonCls, inputCls } from "@/components/ui";
import { parseUnitPattern } from "@/lib/unit-pattern";

/**
 * Add-property as it should be: one decision per screen, the name derived
 * from the address (never asked), units created from a typed pattern
 * ("101-112" makes 12), rent optional and skippable. About 30 seconds for
 * a single-family home, under two minutes for a building.
 */

type StepId = "address" | "type" | "units" | "rent";

type Draft = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  type: "SINGLE_FAMILY" | "MULTIFAMILY" | "CONDO" | "TOWNHOUSE" | "COMMERCIAL" | "OTHER" | null;
  unitPattern: string;
  rentDollars: string;
};

const EMPTY: Draft = {
  address1: "",
  address2: "",
  city: "",
  state: "",
  zipCode: "",
  type: null,
  unitPattern: "",
  rentDollars: "",
};

const MULTI_UNIT = new Set(["MULTIFAMILY", "COMMERCIAL", "OTHER"]);

function stepsFor(d: Draft): StepId[] {
  if (d.type && MULTI_UNIT.has(d.type)) return ["address", "type", "units"];
  return ["address", "type", "rent"];
}

function validate(id: StepId, d: Draft): string | null {
  switch (id) {
    case "address":
      if (!d.address1.trim()) return "Enter the street address.";
      if (!d.city.trim()) return "Enter the city.";
      if (!/^[A-Za-z]{2}$/.test(d.state.trim())) return "Use the two-letter state, like IL.";
      if (!/^\d{5}(-\d{4})?$/.test(d.zipCode.trim())) return "Enter the 5-digit ZIP code.";
      return null;
    case "units":
      return parseUnitPattern(d.unitPattern).length > 0
        ? null
        : "Add at least one unit, like 1F, 2F or 101-112.";
    case "rent": {
      if (d.rentDollars.trim() === "") return null; // skippable
      const n = Number(d.rentDollars.replace(/,/g, ""));
      return Number.isFinite(n) && n >= 0 ? null : "Enter a dollar amount, or leave it empty.";
    }
    default:
      return null;
  }
}

export function PropertyWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [duplicateBlocked, setDuplicateBlocked] = useState(false);

  const steps = stepsFor(draft);
  const id = steps[step]!;
  const isLast = step === steps.length - 1;
  const units = id === "units" ? parseUnitPattern(draft.unitPattern) : [];

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
    setDuplicateBlocked(false);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit(allowDuplicate = false) {
    setBusy(true);
    setError(null);
    const rent = draft.rentDollars.replace(/,/g, "").trim();
    const unitNumbers = MULTI_UNIT.has(draft.type ?? "")
      ? parseUnitPattern(draft.unitPattern).map((u) => ({ unitNumber: u }))
      : rent !== ""
        ? [{ unitNumber: "Main", marketRentDollars: rent }]
        : [];

    const res = await fetch("/api/v1/landlord/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // Derived, never asked: the address is the name. Rename anytime in Edit.
        name: draft.address1.trim(),
        type: draft.type,
        address1: draft.address1.trim(),
        address2: draft.address2.trim(),
        city: draft.city.trim(),
        state: draft.state.trim().toUpperCase(),
        zipCode: draft.zipCode.trim(),
        units: unitNumbers,
        allowDuplicate,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      property?: { id: string };
      error?: string;
    };
    if (!res.ok) {
      setBusy(false);
      if (res.status === 409) {
        // Duplicate address: back to the address step, with an override,
        // because two condos in one building is reality, not a mistake.
        setStep(steps.indexOf("address"));
        setDuplicateBlocked(true);
      }
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push(`/landlord/properties/${data.property!.id}`);
    router.refresh();
  }

  async function next(e?: React.FormEvent) {
    e?.preventDefault();
    const problem = validate(id, draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (!isLast) {
      setError(null);
      setStep((s) => s + 1);
      return;
    }
    await submit();
  }

  const meta: Record<StepId, { title: string; subtitle?: string }> = {
    address: {
      title: "Where is the property?",
      subtitle: "We name it after the address. You can rename it later.",
    },
    type: { title: "What kind of place is it?" },
    units: {
      title: "Name the units",
      subtitle: "Type them with commas, or as a range. 1F, 2F works. So does 101-112.",
    },
    rent: {
      title: "What is the monthly rent?",
      subtitle: "You can skip this and add it later.",
    },
  };

  return (
    <WizardShell
      step={step}
      total={steps.length}
      onBack={back}
      title={meta[id].title}
      subtitle={meta[id].subtitle}
    >
      {id === "type" ? (
        <div>
          <OptionCards
            options={[
              {
                value: "SINGLE_FAMILY",
                label: "Single-family home",
                description: "One home. We set it up for you.",
                icon: <IconHome className="h-7 w-7" duo />,
              },
              {
                value: "MULTIFAMILY",
                label: "Building with units",
                description: "Two or more units. You name them next.",
                icon: <IconProperty className="h-7 w-7" duo />,
              },
              {
                value: "CONDO",
                label: "Condo",
                description: "One unit you own inside a building.",
              },
              {
                value: "TOWNHOUSE",
                label: "Townhouse",
                description: "An attached home for one household.",
              },
            ]}
            onSelect={(v) => {
              set("type", v as Draft["type"]);
              setStep((s) => s + 1);
            }}
          />
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <span>Something else?</span>
            {(["COMMERCIAL", "OTHER"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  set("type", t);
                  setStep((s) => s + 1);
                }}
                className="inline-flex min-h-9 items-center rounded-full border border-stone-300 bg-white px-3.5 font-medium text-stone-700 transition hover:border-patina hover:text-patina"
              >
                {t === "COMMERCIAL" ? "Commercial" : "Other"}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <form onSubmit={next} className="flex flex-1 flex-col">
          {id === "address" && (
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Street address
                </span>
                <input
                  autoFocus
                  value={draft.address1}
                  onChange={(e) => set("address1", e.target.value)}
                  placeholder="1247 W Oakdale Ave"
                  autoComplete="address-line1"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Apartment, suite or floor <span className="font-normal text-stone-500">(if any)</span>
                </span>
                <input
                  value={draft.address2}
                  onChange={(e) => set("address2", e.target.value)}
                  autoComplete="address-line2"
                  className={inputCls}
                />
              </label>
              <div className="grid grid-cols-[1fr_5rem_7rem] gap-3">
                <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  City
                </span>
                  <input
                    value={draft.city}
                    onChange={(e) => set("city", e.target.value)}
                    autoComplete="address-level2"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  State
                </span>
                  <input
                    value={draft.state}
                    onChange={(e) => set("state", e.target.value)}
                    placeholder="IL"
                    maxLength={2}
                    autoComplete="address-level1"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  ZIP
                </span>
                  <input
                    value={draft.zipCode}
                    onChange={(e) => set("zipCode", e.target.value)}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className={inputCls}
                  />
                </label>
              </div>
            </div>
          )}

          {id === "units" && (
            <div>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Unit names or numbers
                </span>
                <input
                  autoFocus
                  value={draft.unitPattern}
                  onChange={(e) => set("unitPattern", e.target.value)}
                  placeholder="1F, 2F"
                  className={inputCls}
                />
              </label>
              {units.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {units.slice(0, 24).map((u) => (
                    <span
                      key={u}
                      className="rounded-full bg-patina-tint px-2.5 py-1 text-sm font-medium text-patina"
                    >
                      {u}
                    </span>
                  ))}
                  {units.length > 24 && (
                    <span className="px-1 py-1 text-sm text-stone-500">
                      +{units.length - 24} more
                    </span>
                  )}
                </div>
              )}
              {units.length > 0 && (
                <p className="mt-2 text-sm text-stone-500">
                  {units.length} unit{units.length === 1 ? "" : "s"}. You set the rent for each
                  one on the next page.
                </p>
              )}
            </div>
          )}

          {id === "rent" && (
            <label className="block">
                <span className="mb-1 block text-sm font-medium text-stone-700">
                  Rent each month
                </span>
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">
                  $
                </span>
                <input
                  autoFocus
                  value={draft.rentDollars}
                  onChange={(e) => set("rentDollars", e.target.value)}
                  placeholder="1,850"
                  inputMode="decimal"
                  className={`${inputCls} pl-8`}
                />
              </span>
            </label>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          {duplicateBlocked && (
            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={busy}
              className={`${buttonCls("secondary")} mt-3 w-full`}
            >
              This is a different property at the same address. Add it anyway
            </button>
          )}

          <button type="submit" disabled={busy} className={`${buttonCls("primary")} mt-6 w-full py-3`}>
            {busy ? "Adding…" : isLast ? "Add this property" : "Continue"}
          </button>
          {id === "rent" && draft.rentDollars.trim() === "" && (
            <button
              type="button"
              onClick={() => void submit()}
              disabled={busy}
              className={`${buttonCls("ghost")} mt-2 w-full`}
            >
              Skip for now
            </button>
          )}
        </form>
      )}
    </WizardShell>
  );
}
