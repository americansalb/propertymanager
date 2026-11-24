"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OptionCards, WizardShell } from "@/components/wizard/wizard-shell";
import { InfoRow, buttonCls, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui-feedback";
import {
  CATEGORY_HINT,
  CATEGORY_LABEL,
  MAINTENANCE_CATEGORIES,
} from "@/lib/validation/maintenance";

type Place = { unitId: string; label: string };
type Cat = (typeof MAINTENANCE_CATEGORIES)[number];
type Urgency = "NORMAL" | "URGENT" | "EMERGENCY";

const URGENCY: Array<{ value: Urgency; label: string; description: string }> = [
  { value: "EMERGENCY", label: "Now", description: "Flooding, no power, no heat, or a safety risk" },
  { value: "URGENT", label: "In a day or two", description: "It should not wait for the weekend" },
  { value: "NORMAL", label: "It can wait", description: "Any time in the next week or two" },
];

const ALL_STEPS = ["home", "kind", "words", "soon", "check"] as const;
type Step = (typeof ALL_STEPS)[number];

const TITLE: Record<Step, { title: string; subtitle?: string }> = {
  home: { title: "Which home is it in?" },
  kind: { title: "What kind of problem?", subtitle: "Pick the closest one." },
  words: { title: "What is wrong?", subtitle: "A few words are enough." },
  soon: { title: "How soon does it need someone?" },
  check: { title: "Check it and save" },
};

const fieldLabel = "mb-1 block text-sm font-medium text-stone-700";

/**
 * The owner writes a repair down: a call, a text, something they saw. One
 * question at a time, mostly taps, the same way a tenant reports one. It
 * becomes the same repair, so their own repair people are asked the same way.
 */
export function NewRepairForm({
  places,
  autoAsk,
  peopleOnFile,
}: {
  places: Place[];
  autoAsk: boolean;
  peopleOnFile: number;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  // With one home there is nothing to pick.
  const steps: Step[] = places.length === 1 ? ALL_STEPS.filter((s) => s !== "home") : [...ALL_STEPS];
  const [step, setStep] = useState(0);
  const [unitId, setUnitId] = useState(places.length === 1 ? places[0]!.unitId : "");
  const [category, setCategory] = useState<Cat | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("NORMAL");
  const [mayEnter, setMayEnter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const id: Step = steps[step]!;
  const next = () => {
    setError(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/landlord/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId,
        category,
        title,
        description,
        urgency,
        permissionToEnter: mayEnter,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      id?: string;
      asked?: number;
    };
    if (!res.ok || !data.id) {
      setBusy(false);
      setError(data.error ?? "Something went wrong. Nothing was saved.");
      return;
    }
    const asked = data.asked ?? 0;
    toast(
      asked === 0
        ? "Repair saved."
        : asked === 1
          ? "Repair saved. 1 of your repair people was asked."
          : `Repair saved. ${asked} of your repair people were asked.`,
    );
    router.push(`/landlord/maintenance/${data.id}`);
    router.refresh();
  }

  const who =
    peopleOnFile === 0
      ? "You have no repair people on your list yet, so nobody is asked."
      : !autoAsk
        ? "Asking automatically is off. You ask your repair people from the repair's page."
        : urgency === "EMERGENCY"
          ? "Your repair people who fit are asked to come right away."
          : "Your repair people who fit are asked for a price right away.";

  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-8">
      <WizardShell
        step={step}
        total={steps.length}
        onBack={back}
        title={TITLE[id].title}
        subtitle={TITLE[id].subtitle}
      >
        {id === "home" && (
          <OptionCards
            options={places.map((p) => ({ value: p.unitId, label: p.label }))}
            onSelect={(v) => {
              setUnitId(v);
              next();
            }}
          />
        )}

        {id === "kind" && (
          <OptionCards
            options={MAINTENANCE_CATEGORIES.map((c) => ({
              value: c,
              label: CATEGORY_LABEL[c],
              description: CATEGORY_HINT[c],
            }))}
            onSelect={(v) => {
              setCategory(v as Cat);
              next();
            }}
          />
        )}

        {id === "words" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim().length < 3) return setError("Say what is wrong in a few words.");
              next();
            }}
            className="flex flex-1 flex-col gap-3"
          >
            <label className="block">
              <span className={fieldLabel}>In a few words</span>
              <input
                autoFocus
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError(null);
                }}
                placeholder="Kitchen sink leaks"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={fieldLabel}>
                More for the repair person{" "}
                <span className="font-normal text-stone-500">(if you like)</span>
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is happening, and since when."
                className={`${inputCls} resize-none`}
              />
            </label>
            {error && (
              <p role="alert" className="text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <button type="submit" className={`${buttonCls("primary")} mt-2 w-full py-3`}>
              Continue
            </button>
          </form>
        )}

        {id === "soon" && (
          <OptionCards
            options={URGENCY}
            onSelect={(v) => {
              setUrgency(v as Urgency);
              next();
            }}
          />
        )}

        {id === "check" && (
          <div className="flex flex-1 flex-col">
            <dl>
              <InfoRow label="Home">{places.find((p) => p.unitId === unitId)?.label ?? ""}</InfoRow>
              <InfoRow label="Problem">{title.trim()}</InfoRow>
              <InfoRow label="Kind">{category ? CATEGORY_LABEL[category] : ""}</InfoRow>
              {description.trim() && <InfoRow label="Details">{description.trim()}</InfoRow>}
              <InfoRow label="How soon">
                {URGENCY.find((u) => u.value === urgency)?.label ?? ""}
              </InfoRow>
            </dl>

            <p className="mt-4 text-sm font-medium text-stone-700">
              Can the repair person go in if nobody is home?
            </p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {[
                { v: false, label: "Only when someone is home" },
                { v: true, label: "Yes, go in" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => setMayEnter(o.v)}
                  aria-pressed={mayEnter === o.v}
                  className={`min-h-12 rounded-xl border px-3 py-3 text-base font-medium transition ${
                    mayEnter === o.v
                      ? "border-patina bg-patina-tint text-stone-900"
                      : "border-stone-300 bg-white text-stone-700 hover:border-patina"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className={`${buttonCls("primary")} mt-6 w-full py-3 disabled:opacity-60`}
            >
              {busy ? "Saving…" : "Save this repair"}
            </button>
            <p className="mt-3 text-center text-sm text-stone-500">{who}</p>
          </div>
        )}
      </WizardShell>
    </section>
  );
}
