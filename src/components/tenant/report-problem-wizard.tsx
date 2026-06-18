"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OptionCards, WizardShell } from "@/components/wizard/wizard-shell";
import { Badge, Card, buttonCls } from "@/components/ui";
import { IconCheck } from "@/components/icons";
import {
  CATEGORY_LABEL,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_URGENCIES,
  MAINT_STATUS_LABEL,
  URGENCY_LABEL,
} from "@/lib/validation/maintenance";

const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2.5 text-base text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";
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
};

const CATEGORY_HINT: Record<Cat, string> = {
  PLUMBING: "Leaks, clogs, no hot water",
  ELECTRICAL: "Outlets, lights, breakers",
  HVAC: "Heat, A/C, thermostat",
  APPLIANCE: "Fridge, stove, dishwasher, laundry",
  DOORS_LOCKS: "Locks, keys, doors, windows",
  PEST: "Insects or rodents",
  FLOORING_WALLS: "Floors, walls, ceilings, paint",
  OTHER: "Anything else",
};

const URGENCY_HINT: Record<Urg, string> = {
  EMERGENCY: "No heat, flooding, no power, or a safety risk",
  URGENT: "Should be handled in a day or two",
  NORMAL: "Schedule it whenever works",
  LOW: "Minor, no rush",
};

const TIME_OPTIONS = ["Weekday mornings", "Weekday afternoons", "Evenings", "Weekends"];

const STATUS_TONE: Record<string, "patina" | "copper" | "amber" | "stone" | "red"> = {
  SUBMITTED: "copper",
  ACKNOWLEDGED: "copper",
  SCHEDULED: "patina",
  IN_PROGRESS: "patina",
  RESOLVED: "patina",
  CLOSED: "stone",
  CANCELLED: "stone",
  SENT_TO_MARKETPLACE: "amber",
};

const STEPS = ["category", "describe", "urgency", "access", "review"] as const;
type Step = (typeof STEPS)[number];

const STEP_META: Record<Step, { title: string; subtitle?: string }> = {
  category: { title: "What needs fixing?", subtitle: "Pick the closest category." },
  describe: { title: "Tell us what's happening", subtitle: "A short title and a few details." },
  urgency: { title: "How urgent is it?" },
  access: { title: "Getting in", subtitle: "How a pro can reach the problem." },
  review: { title: "Review and send", subtitle: "Your landlord gets this right away." },
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
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-stone-400">{label}</dt>
      <dd className="text-right text-stone-800">{value}</dd>
    </div>
  );
}

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
      <Card className="mt-4 p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-patina-tint text-patina">
          <IconCheck className="h-6 w-6" />
        </span>
        <h2 className="mt-3 font-display text-lg font-semibold text-stone-900">Request sent</h2>
        <p className="mt-1 text-sm text-stone-500">
          Your landlord has been notified. Track it below anytime.
        </p>
        <button onClick={() => setMode("list")} className={`${primaryCls} mt-5`}>
          Back to requests
        </button>
      </Card>
    );
  }

  if (mode === "wizard") {
    return (
      <Card className="mt-4 p-5 sm:p-6">
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
                if (draft.title.trim().length < 3) return setError("Give it a short title.");
                if (draft.description.trim().length < 5)
                  return setError("Add a few words about the problem.");
                advance();
              }}
              className="flex flex-1 flex-col gap-3"
            >
              <input
                autoFocus
                value={draft.title}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, title: e.target.value }));
                  setError(null);
                }}
                placeholder="Short title, e.g. Kitchen sink leaks"
                aria-label="Title"
                className={inputCls}
              />
              <textarea
                value={draft.description}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, description: e.target.value }));
                  setError(null);
                }}
                placeholder="What's happening? When did it start? Anything that helps."
                aria-label="Description"
                rows={5}
                className={`${inputCls} resize-none`}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
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
                <p className="text-sm font-medium text-stone-900">Can a pro enter if you&apos;re out?</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {[
                    { v: true, label: "Yes, enter if I'm out" },
                    { v: false, label: "Only when I'm home" },
                  ].map((o) => (
                    <button
                      key={String(o.v)}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, permissionToEnter: o.v }))}
                      aria-pressed={draft.permissionToEnter === o.v}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                        draft.permissionToEnter === o.v
                          ? "border-patina bg-patina-tint text-patina"
                          : "border-stone-200 text-stone-600 hover:border-stone-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">Best times</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((t) => {
                    const on = draft.preferredTimes.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTime(t)}
                        aria-pressed={on}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          on
                            ? "border-patina bg-patina-tint text-patina"
                            : "border-stone-200 text-stone-500 hover:border-stone-300"
                        }`}
                      >
                        {on ? "✓ " : ""}
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <textarea
                value={draft.accessNotes}
                onChange={(e) => setDraft((d) => ({ ...d, accessNotes: e.target.value }))}
                placeholder="Anything the pro should know? Gate code, pets, where to find things."
                aria-label="Access notes"
                rows={3}
                className={`${inputCls} resize-none`}
              />
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
              <dl className="space-y-2.5 text-sm">
                <ReviewRow
                  label="Issue"
                  value={`${draft.category ? CATEGORY_LABEL[draft.category] : ""} · ${draft.title}`}
                />
                <ReviewRow label="Details" value={draft.description} />
                <ReviewRow label="Urgency" value={draft.urgency ? URGENCY_LABEL[draft.urgency] : ""} />
                <ReviewRow
                  label="Entry"
                  value={draft.permissionToEnter ? "Enter if I'm out" : "Only when I'm home"}
                />
                {draft.preferredTimes.length > 0 && (
                  <ReviewRow label="Best times" value={draft.preferredTimes.join(", ")} />
                )}
                {draft.accessNotes.trim() && (
                  <ReviewRow label="Notes" value={draft.accessNotes.trim()} />
                )}
              </dl>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className={`${primaryCls} mt-6 w-full py-3 disabled:opacity-60`}
              >
                {busy ? "Sending…" : "Send to landlord"}
              </button>
            </div>
          )}
        </WizardShell>
      </Card>
    );
  }

  // list mode
  return (
    <div className="mt-4">
      <button onClick={start} className={`${primaryCls} w-full py-3 sm:w-auto sm:px-6`}>
        Report a problem
      </button>
      {requests.length === 0 ? (
        <Card className="mt-4 p-6 text-center text-sm text-stone-500">
          No requests yet. When something needs fixing, report it here and your landlord is notified
          right away.
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {requests.map((r) => (
            <li key={r.id}>
              <Card className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900">{r.title}</p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {CATEGORY_LABEL[r.category as Cat] ?? r.category} · {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status] ?? "stone"}>
                    {MAINT_STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-stone-600">{r.description}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
