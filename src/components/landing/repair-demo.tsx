"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { buttonCls } from "@/components/ui";
import {
  MAINT_STAGE_HELP,
  MAINT_STATUS_LABEL,
  MAINT_STATUS_LABEL_LANDLORD,
  MAINT_TENANT_UPDATE_VERB,
} from "@/lib/validation/maintenance";
import { PhoneFrame, PhoneTabs } from "./frames";

/**
 * A working piece of the product on the landing page: answer a repair on
 * the left, and the tenant's phone on the right shows what they would see.
 * Nothing is saved; it uses the product's real words for every stage.
 */

const STAGES = ["ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS", "RESOLVED"] as const;
type Stage = (typeof STAGES)[number];

const NOTE: Record<Stage, string> = {
  ACKNOWLEDGED: "Thanks Tom, I am on it.",
  SCHEDULED: "The plumber is coming Tuesday between 9 and 11.",
  IN_PROGRESS: "The plumber is there now.",
  RESOLVED: "All fixed. Tell me if it drips again.",
};

type Update = { id: number; stage: Stage; note: string };

export function RepairDemo({ tenantBar }: { tenantBar: React.ReactNode }) {
  const group = useId();
  const noteId = useId();
  const phone = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Stage>("SCHEDULED");
  const [note, setNote] = useState(NOTE.SCHEDULED);
  const [updates, setUpdates] = useState<Update[]>([]);

  const latest = updates.at(0);
  const current: Stage | "SUBMITTED" = latest ? latest.stage : "SUBMITTED";
  const done = current === "RESOLVED";
  const canSend = picked !== current;

  function pick(stage: Stage) {
    setPicked(stage);
    setNote(NOTE[stage]);
  }

  function send() {
    if (!canSend) return;
    setUpdates((u) => [{ id: u.length + 1, stage: picked, note: note.trim() }, ...u]);
    // Line up the next step, so pressing again walks the repair forward.
    const next = STAGES[STAGES.indexOf(picked) + 1];
    if (next) pick(next);
    // On a narrow screen the phone sits below: bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      phone.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function reset() {
    setUpdates([]);
    pick("SCHEDULED");
  }

  return (
    <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-[1fr_auto] lg:gap-16">
      {/* The owner's side */}
      <div>
        <p className="mb-3 text-sm font-medium text-stone-300">You</p>
        <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <p className="text-xl font-semibold tracking-tight text-stone-900">
              Kitchen sink leaks
            </p>
            <span
              className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                current === "SUBMITTED"
                  ? "bg-copper-tint text-copper-deep"
                  : "bg-patina-tint text-patina"
              }`}
            >
              {MAINT_STATUS_LABEL_LANDLORD[current]}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-stone-600">
            Unit 1F at Oakdale Duplex · Tom Tenant
          </p>

          {done ? (
            <div className="mt-5 border-t border-stone-100 pt-5">
              <p className="text-lg font-semibold tracking-tight text-stone-900">
                That is the whole repair.
              </p>
              <p className="mt-1 text-stone-600">
                A few taps from you. Tom saw every step, and nobody had to call anybody.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/signup" className={buttonCls("accent")}>
                  Start free
                </Link>
                <button onClick={reset} className={buttonCls("secondary")}>
                  Start over
                </button>
              </div>
            </div>
          ) : (
            <>
              <fieldset className="mt-5 border-t border-stone-100 pt-4">
                <legend className="sr-only">Where does this stand?</legend>
                <p aria-hidden="true" className="text-sm text-stone-500">
                  Where does this stand?
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {STAGES.map((s) => {
                    const on = picked === s;
                    return (
                      <label
                        key={s}
                        className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                          on
                            ? "border-patina bg-patina-tint/50"
                            : "border-stone-200 bg-white hover:border-stone-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name={group}
                          checked={on}
                          onChange={() => pick(s)}
                          className="mt-1 h-4 w-4 shrink-0 accent-[#2f6353]"
                        />
                        <span className="min-w-0">
                          <span className="block text-base font-medium text-stone-900">
                            {MAINT_STATUS_LABEL_LANDLORD[s]}
                            {s === current && (
                              <span className="ml-2 text-sm font-normal text-stone-500">now</span>
                            )}
                          </span>
                          <span className="block text-sm text-stone-500">
                            {MAINT_STAGE_HELP[s]}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <label htmlFor={noteId} className="mt-4 block text-sm font-medium text-stone-700">
                Note for Tom
              </label>
              <input
                id={noteId}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base text-stone-900 focus:border-patina focus:outline-none focus:ring-2 focus:ring-patina/25"
              />

              <button onClick={send} disabled={!canSend} className={`${buttonCls("accent")} mt-4`}>
                Send update
              </button>
            </>
          )}
        </div>
      </div>

      {/* The tenant's side */}
      <div ref={phone} className="mx-auto">
        <p className="mb-3 text-sm font-medium text-stone-300">Tom&apos;s phone</p>
        <PhoneFrame>
          <div className="bg-[#f6f4ef]">
            {tenantBar}
            <div className="min-h-[330px] px-3.5 pb-4 pt-3.5">
              <p className="text-lg font-semibold tracking-tight text-stone-900">Repairs</p>
              <div className="mt-2.5 rounded-xl border border-stone-200 bg-white p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                  <p className="text-[15px] font-semibold tracking-tight text-stone-900">
                    Kitchen sink leaks
                  </p>
                  <span
                    key={current}
                    className={`animate-rise inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      current === "SUBMITTED"
                        ? "bg-stone-100 text-stone-600"
                        : "bg-patina-tint text-patina"
                    }`}
                  >
                    {MAINT_STATUS_LABEL[current]}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-500">Plumbing · sent Nov 8</p>
                <p className="mt-1.5 text-[13px] leading-5 text-stone-700">
                  Water pools under the sink after running it.
                </p>

                <ul
                  aria-live="polite"
                  className={updates.length > 0 ? "mt-3 space-y-2.5 border-t border-stone-100 pt-3" : ""}
                >
                  {updates.map((u, i) => (
                    <li key={u.id} className={`flex gap-2.5 ${i === 0 ? "animate-rise" : ""}`}>
                      <span
                        aria-hidden="true"
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-patina"
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] leading-5 text-stone-900">
                          <span className="font-semibold">Your landlord</span>{" "}
                          {MAINT_TENANT_UPDATE_VERB[u.stage]}
                        </p>
                        {u.note && (
                          <p className="text-[13px] leading-5 text-stone-700">{u.note}</p>
                        )}
                        <p className="text-[11px] text-stone-500">
                          {i === 0 ? "Just now" : "Earlier"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {updates.length === 0 && (
                <p className="mt-3 px-1 text-xs leading-5 text-stone-500">
                  Tom reported this from his phone. He is waiting to hear back.
                </p>
              )}
            </div>
            <PhoneTabs on="Repairs" tenant />
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}
