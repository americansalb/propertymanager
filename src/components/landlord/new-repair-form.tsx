"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui-feedback";
import { CATEGORY_LABEL, MAINTENANCE_CATEGORIES } from "@/lib/validation/maintenance";

type Place = { unitId: string; label: string };
type Urgency = "NORMAL" | "URGENT" | "EMERGENCY";

const URGENCY: Array<{ value: Urgency; label: string; hint: string }> = [
  { value: "NORMAL", label: "It can wait", hint: "Any time in the next week or two" },
  { value: "URGENT", label: "Soon", hint: "In a day or two" },
  { value: "EMERGENCY", label: "Emergency", hint: "Someone is needed now" },
];

const label = "mb-1 block text-sm font-medium text-stone-700";
const chip = (on: boolean) =>
  `inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition ${
    on
      ? "border-patina bg-patina-tint text-stone-900"
      : "border-stone-300 bg-white text-stone-700 hover:border-patina"
  }`;

/**
 * The owner writes a repair down: a call, a text, something they saw. It
 * becomes the same repair a tenant would have reported, so their own
 * repair people are asked the same way.
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
  const id = useId();
  const [unitId, setUnitId] = useState(places.length === 1 ? places[0]!.unitId : "");
  const [category, setCategory] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency>("NORMAL");
  const [mayEnter, setMayEnter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (unitId === "") return setError("Pick the home it is in.");
    if (category === null) return setError("Pick the kind of problem.");
    if (title.trim().length < 3) return setError("Say what is wrong in a few words.");
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
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="space-y-5">
        <div>
          <label htmlFor={`${id}-unit`} className={label}>
            Which home?
          </label>
          <select
            id={`${id}-unit`}
            value={unitId}
            onChange={(e) => {
              setUnitId(e.target.value);
              setError(null);
            }}
            className={inputCls}
          >
            {places.length !== 1 && <option value="">Pick one</option>}
            {places.map((p) => (
              <option key={p.unitId} value={p.unitId}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className={label}>What kind of problem?</legend>
          <div className="flex flex-wrap gap-2">
            {MAINTENANCE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setError(null);
                }}
                aria-pressed={category === c}
                className={chip(category === c)}
              >
                {category === c ? "✓ " : ""}
                {CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor={`${id}-title`} className={label}>
            In a few words
          </label>
          <input
            id={`${id}-title`}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            placeholder="Kitchen sink leaks"
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor={`${id}-more`} className={label}>
            More for the repair person <span className="font-normal text-stone-500">(if you like)</span>
          </label>
          <textarea
            id={`${id}-more`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is happening, and since when."
            className={`${inputCls} resize-none`}
          />
        </div>

        <fieldset>
          <legend className={label}>How soon?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {URGENCY.map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => setUrgency(u.value)}
                aria-pressed={urgency === u.value}
                className={`min-h-16 rounded-xl border px-3 py-2 text-left transition ${
                  urgency === u.value
                    ? "border-patina bg-patina-tint"
                    : "border-stone-300 bg-white hover:border-patina"
                }`}
              >
                <span className="block text-base font-semibold text-stone-900">{u.label}</span>
                <span className="block text-sm text-stone-600">{u.hint}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={label}>Can the repair person go in if nobody is home?</legend>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMayEnter(false)}
              aria-pressed={!mayEnter}
              className={chip(!mayEnter)}
            >
              {!mayEnter ? "✓ " : ""}Only when someone is home
            </button>
            <button
              type="button"
              onClick={() => setMayEnter(true)}
              aria-pressed={mayEnter}
              className={chip(mayEnter)}
            >
              {mayEnter ? "✓ " : ""}Yes, go in
            </button>
          </div>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        className={`${buttonCls("primary")} mt-6 w-full`}
      >
        {busy ? "Saving…" : "Save this repair"}
      </button>
      <p className="mt-3 text-center text-sm text-stone-500">{who}</p>
    </section>
  );
}
