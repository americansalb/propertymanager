"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon?: React.ReactNode };

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop: tabs under the header, a copper underline on the one you are in. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <>
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[15px] font-medium transition ${
              active
                ? "border-copper font-semibold text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-900"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

/** Phone: the same places as a bar under the thumb. */
export function TabBar({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs transition [&>svg]:h-5 [&>svg]:w-5 ${
                active ? "font-semibold text-stone-900" : "font-medium text-stone-500"
              }`}
            >
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-copper"
                />
              )}
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
