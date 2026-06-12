import Link from "next/link";
import { formatCents } from "@/lib/money";

/**
 * The forge UI kit. Small, dependency-free primitives that carry the design
 * language (docs/product/design-language.md): chamfered pressables, flat
 * metal depth (borders + background steps, no shadows), patina focus rings,
 * tabular money. Server-safe; usable from client components too.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-semibold transition " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  // The forged signature: chamfer + solid iron + the shimmer facet.
  primary: "cut-sm facet bg-iron text-white hover:bg-iron-deep",
  secondary:
    "rounded-lg border border-stone-300 text-stone-700 hover:border-patina hover:text-stone-900",
  ghost: "rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-700",
  danger: "rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600",
};

const BTN_SIZE: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
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

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400">{children}</h2>
  );
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

export const inputCls =
  "w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";

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
