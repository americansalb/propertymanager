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
      if (!/^[A-Za-z]{2}$/.test(d.state.trim())) return "Use the 2-letter state code.";
      if (!/^\d{5}(-\d{4})?$/.test(d.zipCode.trim())) return "Enter a valid ZIP code.";
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

  const steps = stepsFor(draft);
  const id = steps[step]!;
  const isLast = step === steps.length - 1;
  const units = id === "units" ? parseUnitPattern(draft.unitPattern) : [];

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setError(null);
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
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
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      property?: { id: string };
      error?: string;
    };
    if (!res.ok) {
      setBusy(false);
      if (res.status === 409) {
        // Duplicate address: send them back to the address step with context.
        setStep(steps.indexOf("address"));
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
      title: "Where's the property?",
      subtitle: "The address becomes the property's name; rename it anytime.",
    },
    type: { title: "What kind of place is it?" },
    units: {
      title: "Name the units",
      subtitle: "Type a list or a range. 1F, 2F works; so does 101-112 or A-D.",
    },
    rent: {
      title: "What's the monthly rent?",
      subtitle: "Optional. Setting it now powers the vacancy math on your dashboard.",
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
                description: "One front door; we set up the unit for you",
                icon: <IconHome className="h-7 w-7" duo />,
              },
              {
                value: "MULTIFAMILY",
                label: "Building with units",
                description: "Two-flat to high-rise; name the units next",
                icon: <IconProperty className="h-7 w-7" duo />,
              },
              {
                value: "CONDO",
                label: "Condo",
                description: "A single unit you own inside a building",
              },
              {
                value: "TOWNHOUSE",
                label: "Townhouse",
                description: "Attached home, one household",
              },
            ]}
            onSelect={(v) => {
              set("type", v as Draft["type"]);
              setStep((s) => s + 1);
            }}
          />
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-stone-400">
            <span>Something else?</span>
            {(["COMMERCIAL", "OTHER"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  set("type", t);
                  setStep((s) => s + 1);
                }}
                className="rounded px-1.5 py-0.5 font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
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
              <input
                autoFocus
                value={draft.address1}
                onChange={(e) => set("address1", e.target.value)}
                placeholder="Street address"
                aria-label="Street address"
                className={inputCls}
              />
              <input
                value={draft.address2}
                onChange={(e) => set("address2", e.target.value)}
                placeholder="Unit, suite, floor (optional)"
                aria-label="Address line 2"
                className={inputCls}
              />
              <div className="grid grid-cols-[1fr_72px_110px] gap-3">
                <input
                  value={draft.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="City"
                  aria-label="City"
                  className={inputCls}
                />
                <input
                  value={draft.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="IL"
                  maxLength={2}
                  aria-label="State"
                  className={inputCls}
                />
                <input
                  value={draft.zipCode}
                  onChange={(e) => set("zipCode", e.target.value)}
                  placeholder="ZIP"
                  inputMode="numeric"
                  aria-label="ZIP"
                  className={inputCls}
                />
              </div>
            </div>
          )}

          {id === "units" && (
            <div>
              <input
                autoFocus
                value={draft.unitPattern}
                onChange={(e) => set("unitPattern", e.target.value)}
                placeholder="1F, 2F  or  101-112"
                aria-label="Units"
                className={inputCls}
              />
              {units.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {units.slice(0, 24).map((u) => (
                    <span
                      key={u}
                      className="cut-sm bg-patina-tint px-2 py-0.5 text-xs font-medium text-patina"
                    >
                      {u}
                    </span>
                  ))}
                  {units.length > 24 && (
                    <span className="px-1 text-xs text-stone-400">
                      +{units.length - 24} more
                    </span>
                  )}
                </div>
              )}
              {units.length > 0 && (
                <p className="mt-2 text-xs text-stone-400">
                  {units.length} unit{units.length === 1 ? "" : "s"} ready. Rents come next on
                  the property page.
                </p>
              )}
            </div>
          )}

          {id === "rent" && (
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                $
              </span>
              <input
                autoFocus
                value={draft.rentDollars}
                onChange={(e) => set("rentDollars", e.target.value)}
                placeholder="1,850"
                inputMode="decimal"
                aria-label="Monthly rent in dollars"
                className={`${inputCls} pl-7`}
              />
            </div>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={busy} className={`${buttonCls("primary")} mt-6 w-full py-3`}>
            {busy ? "Creating…" : isLast ? "Create property" : "Continue"}
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
