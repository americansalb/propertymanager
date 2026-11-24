"use client";

import Link from "next/link";
import { useState } from "react";
import { OptionCards } from "@/components/wizard/wizard-shell";
import { StepMark, buttonCls, inputCls } from "@/components/ui";
import { SpotList } from "@/components/spots";
import { IconChevronLeft } from "@/components/icons";
import {
  DANGER_LINE,
  EMERGENCY,
  EMERGENCY_KINDS,
  type EmergencyKind,
  type SpotView,
} from "@/lib/urgent";

const card = "rounded-2xl border border-stone-200 bg-white p-5 sm:p-8";

/**
 * An emergency in two screens. Pick what is happening, and what to do right
 * now is on the screen before anything is sent: the steps, and the owner's
 * photo of the shutoff. Then one button tells the landlord.
 */
export function EmergencyFlow({ spots }: { spots: SpotView[] }) {
  const [kind, setKind] = useState<EmergencyKind | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ asked: number } | null>(null);

  if (kind === null) {
    return (
      <div className={card}>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">What is happening?</h1>
        <p className="mt-1 font-medium text-red-700">{DANGER_LINE}</p>
        <div className="mt-6">
          <OptionCards
            options={EMERGENCY_KINDS.map((k) => ({
              value: k,
              label: EMERGENCY[k].label,
              description: EMERGENCY[k].hint,
            }))}
            onSelect={(v) => {
              setKind(v as EmergencyKind);
              setError(null);
            }}
          />
        </div>
        <p className="mt-5 text-sm text-stone-500">
          Not an emergency?{" "}
          <Link href="/tenant/maintenance" className="font-medium text-patina underline">
            Report a problem
          </Link>{" "}
          the usual way.
        </p>
      </div>
    );
  }

  const plan = EMERGENCY[kind];
  const spot = plan.spot ? spots.filter((s) => s.spot === plan.spot) : [];

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/tenant/emergency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, details }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; asked?: number };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "That did not send. Try again, or call your landlord.");
      return;
    }
    setSent({ asked: data.asked ?? 0 });
  }

  return (
    <div className={card}>
      {!sent && (
        <button
          type="button"
          onClick={() => setKind(null)}
          className="-ml-2 mb-4 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
        >
          <IconChevronLeft className="h-3 w-3" /> Back
        </button>
      )}

      {sent && (
        <div className="mb-6 flex gap-3 rounded-xl border border-patina bg-patina-tint/50 p-4">
          <StepMark done />
          <div>
            <p className="font-semibold text-stone-900">Your landlord has been told</p>
            <p className="mt-0.5 text-stone-700">
              {!plan.askPeople
                ? "Stay outside until 911 or the gas company says it is safe."
                : sent.asked === 0
                  ? "Every update from them shows up on your Repairs page."
                  : sent.asked === 1
                    ? "Their repair person has been asked to come. Updates show up on your Repairs page."
                    : `${sent.asked} of their repair people have been asked to come. Updates show up on your Repairs page.`}
            </p>
          </div>
        </div>
      )}

      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Do this now</h1>
      <p className="mt-1 font-medium text-red-700">{DANGER_LINE}</p>
      <ol className="mt-4 space-y-3">
        {plan.steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-keep-deep text-xs font-bold text-white"
            >
              {i + 1}
            </span>
            <span className="text-lg leading-7 text-stone-900">{step}</span>
          </li>
        ))}
      </ol>

      {spot.length > 0 && (
        <div className="mt-5 rounded-xl border border-stone-200 px-4">
          <SpotList spots={spot} />
        </div>
      )}

      {sent ? (
        <Link href="/tenant/maintenance" className={`${buttonCls("primary")} mt-6 w-full`}>
          See updates
        </Link>
      ) : (
        <div className="mt-6 border-t border-stone-100 pt-5">
          <label htmlFor="emergency-details" className="mb-1 block text-sm font-medium text-stone-700">
            Anything to add? <span className="font-normal text-stone-500">(if you like)</span>
          </label>
          <textarea
            id="emergency-details"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            placeholder="Where it is, and how bad."
            className={`${inputCls} resize-none`}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void send()}
            disabled={busy}
            className={`${buttonCls("accent")} mt-4 min-h-12 w-full`}
          >
            {busy ? "Sending…" : "Tell my landlord now"}
          </button>
        </div>
      )}
    </div>
  );
}
