"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon?: React.ReactNode };

/** Portal nav with an active state: you always know where you are. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-patina text-white"
                : "text-stone-300 hover:bg-white/10 hover:text-white"
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
