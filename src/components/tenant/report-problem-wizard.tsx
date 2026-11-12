"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OptionCards, WizardShell } from "@/components/wizard/wizard-shell";
import { Badge, InfoRow, StepMark, buttonCls, inputCls } from "@/components/ui";
import {
  CATEGORY_LABEL,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_URGENCIES,
  MAINT_STATUS_LABEL,
  MAINT_TENANT_UPDATE_VERB,
  URGENCY_LABEL,
} from "@/lib/validation/maintenance";

const primaryCls = buttonCls("primary");

type Cat = (typeof MAINTENANCE_CATEGORIES)[number];
type Urg = (typeof MAINTENANCE_URGENCIES)[number];

export type TenantRequest = {
  id: string;
  category: string;
  title: string;
  description: string;
  urgency: string;
  status: string;
  createdAt: Date;
  updates: Array<{
    id: string;
    status: string;
    note: string | null;
    at: Date;
    fromLandlord: boolean;
    changed: boolean;
  }>;
};

const CATEGORY_HINT: Record<Cat, string> = {
  PLUMBING: "Leaks, clogs, no hot water",
  ELECTRICAL: "Outlets, lights, breakers",
  HVAC: "Heat, air conditioning, thermostat",
  APPLIANCE: "Fridge, stove, dishwasher, laundry",
  DOORS_LOCKS: "Locks, keys, doors, windows",
  PEST: "Insects or rodents",
  FLOORING_WALLS: "Floors, walls, ceilings, paint",
  OTHER: "Anything else",
};

const URGENCY_HINT: Record<Urg, string> = {
  EMERGENCY: "No heat, flooding, no power, or a safety risk",
  URGENT: "Needs attention in a day or two",
  NORMAL: "Any time in the next week or two",
  LOW: "Small, no rush",
};

const TIME_OPTIONS = ["Weekday mornings", "Weekday afternoons", "Evenings", "Weekends"];

const STATUS_TONE: Record<string, "patina" | "copper" | "amber" | "stone" | "red"> = {
  SUBMITTED: "stone",
  ACKNOWLEDGED: "patina",
  SCHEDULED: "patina",
  IN_PROGRESS: "patina",
  RESOLVED: "patina",
  CLOSED: "stone",
  CANCELLED: "stone",
  SENT_TO_MARKETPLACE: "patina",
};

const STEPS = ["category", "describe", "urgency", "access", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<Step, { title: string; subtitle?: string }> = {
  category: { title: "What needs fixing?", subtitle: "Pick the closest one." },
  describe: { title: "What is wrong?", subtitle: "A few words are enough." },
  urgency: { title: "How urgent is it?" },
  access: { title: "Getting in", subtitle: "So the repair person can reach the problem." },
  review: { title: "Check it and send", subtitle: "Your landlord is told right away." },
};

const EMPTY = {
  category: null as Cat | null,
  title: "",
  description: "",
  urgency: null as Urg | null,
  permissionToEnter: null as boolean | null,
  preferredTimes: [] as string[],
  accessNotes: "",
};

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return <InfoRow label={label}>{value}</InfoRow>;
}

const card = "rounded-2xl border border-stone-200 bg-white";
const fieldLabel = "mb-1 block text-sm font-medium text-stone-700";

export function MaintenanceClient({ requests }: { requests: TenantRequest[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<"list" | "wizard" | "done">("list");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const id: Step = STEPS[step]!;

  function start() {
    setDraft(EMPTY);
    setStep(0);
    setError(null);
    setMode("wizard");
  }
  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }
  function advance() {
    setError(null);
    setStep((s) => s + 1);
  }
  function toggleTime(t: string) {
    setDraft((d) => ({
      ...d,
      preferredTimes: d.preferredTimes.includes(t)
        ? d.preferredTimes.filter((x) => x !== t)
        : [...d.preferredTimes, t],
    }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/tenant/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: draft.category,
        title: draft.title.trim(),
        description: draft.description.trim(),
        urgency: draft.urgency,
        permissionToEnter: draft.permissionToEnter ?? false,
        accessNotes: draft.accessNotes.trim() || undefined,
        preferredTimes: draft.preferredTimes,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setMode("done");
    router.refresh();
  }

  if (mode === "done") {
    return (
      <div className={`${card} p-5 sm:p-8`}>
        <div className="flex gap-3">
          <StepMark done />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              Sent to your landlord
            </h1>
            <p className="mt-1 text-stone-600">
              They have been told. Every update from them shows up on this page.
            </p>
          </div>
        </div>
        <button onClick={() => setMode("list")} className={`${primaryCls} mt-6`}>
          Done
        </button>
      </div>
    );
  }

  if (mode === "wizard") {
    return (
      <div className={`${card} p-5 sm:p-8`}>
        <WizardShell
          step={step}
          total={STEPS.length}
          onBack={back}
          title={STEP_META[id].title}
          subtitle={STEP_META[id].subtitle}
        >
          {id === "category" && (
            <OptionCards
              options={MAINTENANCE_CATEGORIES.map((c) => ({
                value: c,
                label: CATEGORY_LABEL[c],
                description: CATEGORY_HINT[c],
              }))}
              onSelect={(v) => {
                setDraft((d) => ({ ...d, category: v as Cat }));
                advance();
              }}
            />
          )}

          {id === "describe" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.title.trim().length < 3) return setError("Say what is wrong in a few words.");
                if (draft.description.trim().length < 5)
                  return setError("Add a little more about the problem.");
                advance();
              }}
              className="flex flex-1 flex-col gap-3"
            >
              <label className="block">
                <span className={fieldLabel}>In a few words</span>
                <input
                  autoFocus
                  value={draft.title}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, title: e.target.value }));
                    setError(null);
                  }}
                  placeholder="Kitchen sink leaks"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={fieldLabel}>Tell us more</span>
                <textarea
                  value={draft.description}
                  onChange={(e) => {
                    setDraft((d) => ({ ...d, description: e.target.value }));
                    setError(null);
                  }}
                  placeholder="What is happening, and when did it start?"
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
              </label>
              {error && (
                <p role="alert" className="text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <button type="submit" className={`${primaryCls} mt-2 w-full py-3`}>
                Continue
              </button>
            </form>
          )}

          {id === "urgency" && (
            <OptionCards
              options={MAINTENANCE_URGENCIES.map((u) => ({
                value: u,
                label: URGENCY_LABEL[u],
                description: URGENCY_HINT[u],
              }))}
              onSelect={(v) => {
                setDraft((d) => ({ ...d, urgency: v as Urg }));
                advance();
              }}
            />
          )}

          {id === "access" && (
            <div className="flex flex-1 flex-col gap-5">
              <div>
                <p className="text-sm font-medium text-stone-700">
                  Can the repair person go in if you are out?
                </p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { v: true, label: "Yes, go in" },
                    { v: false, label: "Only when I am home" },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, permissionToEnter: o.v }))}
                      aria-pressed={draft.permissionToEnter === o.v}
                      className={`min-h-12 rounded-xl border px-3 py-3 text-base font-medium transition ${
                        draft.permissionToEnter === o.v
                          ? "border-patina bg-patina-tint text-stone-900"
                          : "border-stone-300 bg-white text-stone-700 hover:border-patina"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-700">
                  Best times <span className="font-normal text-stone-500">(pick any)</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((t) => {
                    const on = draft.preferredTimes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTime(t)}
                        aria-pressed={on}
                        className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition ${
                          on
                            ? "border-patina bg-patina-tint text-stone-900"
                            : "border-stone-300 bg-white text-stone-700 hover:border-patina"
                        }`}
                      >
                        {on ? "✓ " : ""}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block">
                <span className={fieldLabel}>
                  Anything they should know?{" "}
                  <span className="font-normal text-stone-500">(if you like)</span>
                </span>
                <textarea
                  value={draft.accessNotes}
                  onChange={(e) => setDraft((d) => ({ ...d, accessNotes: e.target.value }))}
                  placeholder="Gate code, a dog in the yard, where to find things."
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
              </label>
              <button
                type="button"
                disabled={draft.permissionToEnter === null}
                onClick={advance}
                className={`${primaryCls} w-full py-3 disabled:opacity-50`}
              >
                Continue
              </button>
            </div>
          )}

          {id === "review" && (
            <div className="flex flex-1 flex-col">
              <dl>
                <ReviewRow label="Problem" value={draft.title} />
                <ReviewRow
                  label="Kind"
                  value={draft.category ? CATEGORY_LABEL[draft.category] : ""}
                />
                <ReviewRow label="Details" value={draft.description} />
                <ReviewRow label="How urgent" value={draft.urgency ? URGENCY_LABEL[draft.urgency] : ""} />
                <ReviewRow
                  label="Going in"
                  value={draft.permissionToEnter ? "Yes, even if I am out" : "Only when I am home"}
                />
                {draft.preferredTimes.length > 0 && (
                  <ReviewRow label="Best times" value={draft.preferredTimes.join(", ")} />
                )}
                {draft.accessNotes.trim() && (
                  <ReviewRow label="Notes" value={draft.accessNotes.trim()} />
                )}
              </dl>
              {error && (
                <p role="alert" className="mt-3 text-sm font-medium text-red-700">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className={`${primaryCls} mt-6 w-full py-3 disabled:opacity-60`}
              >
                {busy ? "Sending…" : "Send to my landlord"}
              </button>
            </div>
          )}
        </WizardShell>
        {step === 0 && (
          <button onClick={() => setMode("list")} className={`${buttonCls("ghost")} mt-4 w-full`}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  // list mode
  const shown = (r: TenantRequest) =>
    r.updates.filter((u) => u.note || (u.changed && u.status !== "SUBMITTED"));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">Repairs</h1>
        {requests.length > 0 && (
          <button onClick={start} className={primaryCls}>
            Report a problem
          </button>
        )}
      </div>

      {requests.length === 0 ? (
        <section className={`${card} mt-5 p-6 sm:p-8`}>
          <p className="text-xl font-semibold tracking-tight text-stone-900">
            Is something broken?
          </p>
          <p className="mt-1 text-stone-600">
            Tell your landlord here. They are told right away, and every update shows up on this
            page.
          </p>
          <button onClick={start} className={`${buttonCls("accent")} mt-5`}>
            Report a problem
          </button>
        </section>
      ) : (
        <ul className="mt-5 space-y-4">
          {requests.map((r) => (
            <li key={r.id} className={`${card} p-5 sm:p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <p className="min-w-0 text-lg font-semibold tracking-tight text-stone-900">
                  {r.title}
                </p>
                <Badge tone={STATUS_TONE[r.status] ?? "stone"}>
                  {MAINT_STATUS_LABEL[r.status] ?? r.status}
                </Badge>
              </div>
              <p className="mt-0.5 text-sm text-stone-500">
                {CATEGORY_LABEL[r.category as Cat] ?? r.category} · sent {fmtDate(r.createdAt)}
              </p>
              <p className="mt-2 line-clamp-3 text-stone-700">{r.description}</p>
              {shown(r).length > 0 && (
                <ul className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                  {shown(r).map((u) => (
                    <li key={u.id} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-patina"
                      />
                      <div className="min-w-0">
                        <p className="text-base text-stone-900">
                          <span className="font-semibold">
                            {u.fromLandlord ? "Your landlord" : "You"}
                          </span>
                          {u.changed && u.status !== "SUBMITTED"
                            ? ` ${MAINT_TENANT_UPDATE_VERB[u.status] ?? "sent an update"}`
                            : " sent a note"}
                        </p>
                        {u.note && <p className="mt-0.5 whitespace-pre-wrap text-stone-700">{u.note}</p>}
                        <p className="mt-0.5 text-sm text-stone-500">{fmtDate(u.at)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
