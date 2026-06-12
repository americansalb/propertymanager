import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { Badge } from "@/components/ui";
import { LogoutButton } from "./logout-button";
import { NavLinks, type NavItem } from "./nav-links";

export function PortalShell({
  portalLabel,
  userName,
  contextName,
  nav,
  children,
}: {
  portalLabel: string;
  userName: string;
  contextName?: string | null;
  nav?: NavItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-stone-900"
            >
              <LogoMark className="h-7 w-7" />
              {brand.name}
            </Link>
            <Badge tone="patina">{portalLabel}</Badge>
            {contextName && <span className="text-sm text-stone-500">· {contextName}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-stone-600 sm:inline">{userName}</span>
            <LogoutButton />
          </div>
        </div>
        {nav && nav.length > 0 && (
          <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2">
            <NavLinks items={nav} />
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
