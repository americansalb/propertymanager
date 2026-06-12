import Link from "next/link";
import type { AttentionItem, SetupState } from "@/lib/attention";
import type { PortfolioProperty, Pulse } from "@/lib/services/dashboard";
import { formatCents } from "@/lib/money";
import {
  IconCheck,
  IconDoor,
  IconKeep,
  IconRent,
  IconWrench,
} from "@/components/icons";
import { CreateSampleButton, RemoveSampleButton } from "./sample-buttons";

// ── Pulse bar ───────────────────────────────────────────────────────────────

export function PulseBar({ pulse }: { pulse: Pulse }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-stone-200 bg-white px-5 py-4">
      <span className="flex items-center gap-2 text-sm">
        <IconRent className="h-4 w-4 text-copper-deep" />
        <span className="font-semibold text-stone-900">
          {formatCents(pulse.marketRentTotalCents)}/mo
        </span>
        <span className="text-stone-500">market rent</span>
      </span>
      <span className="flex items-center gap-2 text-sm">
        <IconDoor className="h-4 w-4 text-patina" />
        <span className="font-semibold text-stone-900">
          {pulse.occupiedCount} of {pulse.unitCount}
        </span>
        <span className="text-stone-500">occupied</span>
      </span>
      <span className="flex items-center gap-2 text-sm">
        <IconWrench className="h-4 w-4 text-stone-400" />
        <span className="font-semibold text-stone-900">{pulse.openMaintenance}</span>
        <span className="text-stone-500">open maintenance</span>
      </span>
    </div>
  );
}

// ── Attention queue ─────────────────────────────────────────────────────────

const KIND_ICON: Record<AttentionItem["kind"], React.ReactNode> = {
  vacancy: <IconDoor className="h-4.5 w-4.5" />,
  sample: <IconKeep className="h-4.5 w-4.5" />,
};

const CLS_CHIP: Record<AttentionItem["cls"], string> = {
  EMERGENCY: "bg-red-50 text-red-700",
  MONEY_ON_YOU: "bg-copper-tint text-copper-deep",
  MONEY_TO_YOU: "bg-amber-50 text-amber-800",
  EXPIRING: "bg-stone-100 text-stone-600",
  OPTIMIZATION: "bg-amber-50 text-amber-800",
  SETUP: "bg-stone-100 text-stone-500",
};

export function AttentionCard({ item }: { item: AttentionItem }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${CLS_CHIP[item.cls]}`}
      >
        {KIND_ICON[item.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900">{item.title}</p>
        {item.meta && <p className="mt-0.5 text-xs text-stone-500">{item.meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {item.kind === "sample" && item.refId && <RemoveSampleButton propertyId={item.refId} />}
        <Link
          href={item.action.href}
          className="rounded-lg bg-iron px-3 py-1.5 text-xs font-semibold text-white hover:bg-iron-deep"
        >
          {item.action.label}
        </Link>
      </div>
    </div>
  );
}

export function AllQuiet({ unitCount }: { unitCount: number }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-patina-tint text-patina">
        <IconCheck className="h-5 w-5" />
      </span>
      <div>
        <p className="text-sm font-semibold text-stone-900">All quiet.</p>
        <p className="text-sm text-stone-500">
          {unitCount} unit{unitCount === 1 ? "" : "s"}, nothing needs you.
        </p>
      </div>
    </div>
  );
}

// ── Setup chain (day-0 attention) ───────────────────────────────────────────

export function SetupChain({ setup, showSample }: { setup: SetupState; showSample: boolean }) {
  const current = setup.steps.find((s) => !s.done && !s.soon);
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-stone-900">
        Let&apos;s get your first rent flowing
      </h2>
      <p className="mt-1 text-sm text-stone-500">
        A single-family home takes about 30 seconds. Tenants and rent come right after.
      </p>

      <ol className="mt-5 grid gap-3 sm:grid-cols-4">
        {setup.steps.map((step, i) => (
          <li
            key={step.key}
            className={`rounded-lg border p-3 ${
              step.done
                ? "border-patina-tint bg-patina-tint/40"
                : step.soon
                  ? "border-stone-100 bg-stone-50"
                  : "border-stone-200 bg-white"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                step.done
                  ? "bg-patina text-white"
                  : step.soon
                    ? "bg-stone-200 text-stone-400"
                    : "bg-iron text-white"
              }`}
            >
              {step.done ? <IconCheck className="h-3 w-3" /> : i + 1}
            </span>
            <p
              className={`mt-2 text-xs font-medium ${
                step.soon ? "text-stone-400" : "text-stone-800"
              }`}
            >
              {step.label}
              {step.soon && (
                <span className="ml-1 rounded-full bg-stone-200 px-1.5 py-0.5 text-[10px] text-stone-500">
                  soon
                </span>
              )}
            </p>
          </li>
        ))}
      </ol>

      {current && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={current.href ?? "/landlord/properties"}
            className="rounded-lg bg-iron px-4 py-2 text-sm font-semibold text-white hover:bg-iron-deep"
          >
            {current.label}
          </Link>
          {showSample && current.key === "property" && <CreateSampleButton />}
        </div>
      )}
    </div>
  );
}

// ── Portfolio strip ─────────────────────────────────────────────────────────

const DOT: Record<string, string> = {
  OCCUPIED: "bg-patina",
  VACANT: "bg-amber-400",
  NOTICE: "bg-stone-300",
};

export function PortfolioStrip({ portfolio }: { portfolio: PortfolioProperty[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {portfolio.map((p) => (
        <Link
          key={p.id}
          href={`/landlord/properties/${p.id}`}
          className="rounded-xl border border-stone-200 bg-white p-4 transition hover:border-patina"
        >
          <p className="truncate text-sm font-semibold text-stone-900">{p.name}</p>
          <div className="mt-2 flex items-center gap-1.5">
            {p.units.map((u) => (
              <span
                key={u.id}
                className={`h-2 w-2 rounded-full ${DOT[u.status] ?? "bg-stone-300"}`}
              />
            ))}
            <span className="ml-1 text-xs text-stone-500">
              {p.units.length} unit{p.units.length === 1 ? "" : "s"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
