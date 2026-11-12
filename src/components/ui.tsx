import Link from "next/link";
import { formatCents } from "@/lib/money";
import { IconChevronLeft } from "@/components/icons";

/**
 * The UI kit. Small, dependency-free primitives that carry the design
 * language (docs/product/design-language.md): dark green for text and the
 * main action, copper for what needs you, flat depth (borders + background
 * steps), green focus rings, tabular money. Server-safe; usable from
 * client components too.
 */

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-semibold transition " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  // The main action: dark green, white lettering.
  primary: "rounded-xl bg-keep-deep text-white hover:bg-patina",
  // Something that needs you: copper, dark green lettering (white on
  // copper fails contrast).
  accent: "rounded-xl bg-copper text-iron-deep hover:bg-copper-bright",
  secondary:
    "rounded-lg border border-stone-300 text-stone-700 hover:border-patina hover:text-stone-900",
  ghost: "rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700",
  danger: "rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600",
};

// md is a full 44px touch target; sm (36px) is for buttons inside a row.
const BTN_SIZE: Record<ButtonSize, string> = {
  md: "min-h-11 px-5 py-2 text-[15px]",
  sm: "min-h-9 px-3.5 py-1.5 text-sm",
};

export function buttonCls(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `${BTN_BASE} ${BTN_VARIANT[variant]} ${BTN_SIZE[size]}`;
}

type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

/** Renders a Link when href is given, a button otherwise. */
export function Button({ variant = "primary", size = "md", href, className, children, ...rest }: ButtonProps) {
  const cls = `${buttonCls(variant, size)} ${className ?? ""}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white ${className ?? ""}`}>
      {children}
    </div>
  );
}

type BadgeTone = "patina" | "copper" | "amber" | "stone" | "red";

const BADGE_TONE: Record<BadgeTone, string> = {
  patina: "bg-patina-tint text-patina",
  copper: "bg-copper-tint text-copper-deep",
  amber: "bg-amber-50 text-amber-800",
  stone: "bg-stone-100 text-stone-600",
  red: "bg-red-50 text-red-700",
};

export function Badge({ tone = "stone", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_TONE[tone]}`}
    >
      {children}
    </span>
  );
}

/** A titled white card: every section of every page looks the same. */
export function Section({
  title,
  hint,
  aside,
  children,
}: {
  title: string;
  hint?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <div className="mb-2 flex min-h-9 items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-stone-900">{title}</h2>
        {aside}
      </div>
      {hint && <p className="-mt-1 mb-2 text-sm text-stone-500">{hint}</p>}
      {children}
    </section>
  );
}

/** The way back up one level, always in the same place. */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-stone-500 transition hover:text-stone-800"
    >
      <IconChevronLeft className="h-3 w-3" /> {children}
    </Link>
  );
}

/** One fact in a summary card: a plain label over the answer. */
export function Stat({
  label,
  value,
  unit,
  note,
  noteTone = "stone",
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  noteTone?: "stone" | "copper";
}) {
  return (
    <div>
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-stone-900">
        {value}
        {unit && <span className="ml-1.5 text-sm font-normal text-stone-500">{unit}</span>}
      </dd>
      {note && (
        <p
          className={`text-sm ${noteTone === "copper" ? "font-medium text-copper-deep" : "text-stone-500"}`}
        >
          {note}
        </p>
      )}
    </div>
  );
}

/** A fact that is read, not edited. Lines up with the editable rows. */
export function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:grid sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-x-4">
      <dt className="text-sm leading-6 text-stone-500">{label}</dt>
      <dd className="min-w-0 break-words text-base font-medium leading-6 text-stone-900">
        {children}
      </dd>
    </div>
  );
}

/** A step's tick: green when done, an empty ring while waiting. */
export function StepMark({ done = false }: { done?: boolean }) {
  return done ? (
    <span
      aria-hidden="true"
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-patina text-xs font-bold text-white"
    >
      ✓
    </span>
  ) : (
    <span
      aria-hidden="true"
      className="mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 border-stone-300"
    />
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold tracking-tight text-stone-900">{children}</h2>;
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
      {children}
    </h1>
  );
}

/** Money is always tabular so columns of numbers align. */
export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={`tabular-nums ${className ?? ""}`}>{formatCents(cents)}</span>;
}

// 16px text so phones do not zoom in on focus; 48px tall.
export const inputCls =
  "w-full rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-2 focus:ring-patina/25";

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-stone-700">
        {label}
        {hint && <span className="ml-1 font-normal text-stone-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
