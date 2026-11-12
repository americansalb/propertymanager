import Link from "next/link";
import type { AttentionItem, SetupState } from "@/lib/attention";
import type { Pulse } from "@/lib/services/dashboard";
import { formatCents } from "@/lib/money";
import { Button, Stat, StepMark } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";
import { CreateSampleButton, RemoveSampleButton } from "./sample-buttons";

// ── The three numbers ───────────────────────────────────────────────────────

export function PulseBar({ pulse }: { pulse: Pulse }) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <dl className="grid gap-5 sm:grid-cols-3">
        <Stat label="Rent each month" value={formatCents(pulse.leaseRentTotalCents)} />
        <Stat
          label="Lived in"
          value={`${pulse.occupiedCount} of ${pulse.unitCount}`}
          unit={pulse.unitCount === 1 ? "unit" : "units"}
        />
        <Stat
          label="Open repairs"
          value={pulse.openMaintenance === 0 ? "None" : pulse.openMaintenance}
          note={
            pulse.openMaintenance > 0 ? (
              <Link href="/landlord/maintenance" className="font-medium text-patina underline">
                See them
              </Link>
            ) : undefined
          }
        />
      </dl>
    </section>
  );
}

// ── What needs you ──────────────────────────────────────────────────────────

/** One thing that needs the owner: a copper dot, a sentence, a way in. */
function AttentionRow({ item }: { item: AttentionItem }) {
  const text = (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2.5">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-copper" />
        <span className="text-base font-semibold text-stone-900">{item.title}</span>
      </span>
      {item.meta && <span className="mt-0.5 block pl-[18px] text-sm text-stone-600">{item.meta}</span>}
    </span>
  );

  // The sample row carries a second button, so it cannot be one big link.
  if (item.kind === "sample") {
    return (
      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
        {text}
        <span className="flex shrink-0 items-center gap-2 pl-[18px] sm:pl-0">
          <Button href={item.action.href} size="sm" variant="secondary">
            {item.action.label}
          </Button>
          {item.refId && <RemoveSampleButton propertyId={item.refId} />}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.action.href}
      className="group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-50 focus-visible:bg-stone-50"
    >
      {text}
      <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
    </Link>
  );
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-2 sm:px-6">
      <ul className="divide-y divide-stone-100">
        {items.map((item) => (
          <li key={item.id}>
            <AttentionRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Getting set up ──────────────────────────────────────────────────────────

const STEP_HELP: Record<string, string> = {
  property: "Only the address. It takes about a minute.",
  rents: "Open a unit and enter what it rents for.",
  invite: "They get a link to see their lease and report problems.",
};

export function SetupChain({ setup, showSample }: { setup: SetupState; showSample: boolean }) {
  // Steps that are not built yet are not shown: nothing here is a promise.
  const steps = setup.steps.filter((s) => !s.soon);
  const current = steps.find((s) => !s.done);

  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <ol className="space-y-4">
        {steps.map((step) => {
          const isCurrent = step.key === current?.key;
          return (
            <li key={step.key} className="flex gap-3">
              <StepMark done={step.done} />
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium ${
                    step.done || isCurrent ? "text-stone-900" : "text-stone-500"
                  }`}
                >
                  {step.label}
                </p>
                {!step.done && <p className="text-sm text-stone-500">{STEP_HELP[step.key]}</p>}
                {isCurrent && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button href={step.href ?? "/landlord/properties"} variant="accent">
                      {step.label}
                    </Button>
                    {showSample && step.key === "property" && <CreateSampleButton />}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
