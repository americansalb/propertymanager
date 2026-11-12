import { IconHome, IconKeep, IconMail, IconProperty, IconRent, IconWrench } from "@/components/icons";

/**
 * Frames for the product pictures on the landing page. This file is safe
 * to use from browser code: it must never import the brand settings (the
 * wordmark does, so the wordmark is passed in from the page instead).
 */

export const SHADOW = "shadow-[0_40px_90px_-40px_rgba(27,59,49,0.45)]";

/** A browser window around a screen. */
export function BrowserFrame({
  url,
  label,
  children,
}: {
  url: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`overflow-hidden rounded-2xl border border-stone-200 bg-white ${SHADOW}`}
    >
      <div className="flex items-center gap-3 border-b border-stone-200 bg-stone-50 px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
        </span>
        <span className="mx-auto rounded-md border border-stone-200 bg-white px-4 py-0.5 text-xs text-stone-500">
          {url}
        </span>
        <span className="w-12" />
      </div>
      {children}
    </div>
  );
}

/** A phone around a screen. Pass `label` unless a parent already describes it. */
export function PhoneFrame({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label}
      className={`w-[272px] shrink-0 overflow-hidden rounded-[2.3rem] border-[7px] border-white bg-white ring-1 ring-stone-300 ${SHADOW} ${className ?? ""}`}
    >
      <div className="flex justify-center bg-white pt-2">
        <span className="h-1.5 w-14 rounded-full bg-stone-200" />
      </div>
      {children}
    </div>
  );
}

/** The bar at the bottom of a phone screen. */
export function PhoneTabs({ on, tenant = false }: { on: string; tenant?: boolean }) {
  const places = tenant
    ? [
        { label: "Home", icon: <IconHome className="h-4 w-4" /> },
        { label: "Rent", icon: <IconRent className="h-4 w-4" /> },
        { label: "Repairs", icon: <IconWrench className="h-4 w-4" /> },
        { label: "Messages", icon: <IconMail className="h-4 w-4" /> },
      ]
    : [
        { label: "Home", icon: <IconKeep className="h-4 w-4" /> },
        { label: "Properties", icon: <IconProperty className="h-4 w-4" /> },
        { label: "Repairs", icon: <IconWrench className="h-4 w-4" /> },
        { label: "Messages", icon: <IconMail className="h-4 w-4" /> },
      ];
  return (
    <div className="grid grid-cols-4 border-t border-stone-200 bg-white">
      {places.map((p) => {
        const active = p.label === on;
        return (
          <span
            key={p.label}
            className={`relative flex flex-col items-center gap-0.5 pb-2 pt-2 text-[10px] ${
              active ? "font-semibold text-stone-900" : "font-medium text-stone-500"
            }`}
          >
            {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-copper" />}
            {p.icon}
            {p.label}
          </span>
        );
      })}
    </div>
  );
}
