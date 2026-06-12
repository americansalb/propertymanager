"use client";

import { IconChevronLeft, IconChevronRight } from "@/components/icons";

/**
 * One-decision-per-page wizard machinery (signup now; maintenance and job
 * posting wizards reuse this later). Progress dots, ghost back button,
 * animated step entrance, Enter advances.
 */
export function WizardShell({
  step,
  total,
  onBack,
  title,
  subtitle,
  children,
}: {
  step: number;
  total: number;
  onBack?: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[340px] flex-col">
      <div className="mb-6 flex items-center justify-between">
        {step > 0 && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <IconChevronLeft className="h-3 w-3" /> Back
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-1.5">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-patina" : i < step ? "w-1.5 bg-patina" : "w-1.5 bg-stone-200"
              }`}
            />
          ))}
        </div>
      </div>

      <div key={step} className="animate-step flex flex-1 flex-col">
        <h1 className="font-display text-xl font-semibold text-stone-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
        <div className="mt-6 flex flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}

export function OptionCards({
  options,
  onSelect,
}: {
  options: Array<{ value: string; label: string; description?: string; icon?: React.ReactNode }>;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-patina hover:bg-patina-tint/40"
        >
          {o.icon && <span className="shrink-0 text-iron">{o.icon}</span>}
          <span>
            <span className="block font-medium text-stone-900 group-hover:text-stone-950">
              {o.label}
            </span>
            {o.description && (
              <span className="mt-0.5 block text-sm text-stone-500">{o.description}</span>
            )}
          </span>
          <span className="ml-auto text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-patina">
            <IconChevronRight className="h-4 w-4" />
          </span>
        </button>
      ))}
    </div>
  );
}
