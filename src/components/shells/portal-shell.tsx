import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { ToastProvider } from "@/components/ui-feedback";
import { LogoutButton } from "./logout-button";
import { NavLinks, type NavItem } from "./nav-links";

/** Fortress header: iron band, patina nav, battlement edge. */
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
    <div className="min-h-screen">
      <header className="bg-iron">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#faf8f4]">
                <LogoMark className="h-6 w-6" />
              </span>
              <span className="font-display text-lg font-semibold tracking-tight text-white">
                {brand.name}
              </span>
            </Link>
            <span className="rounded-full bg-patina px-2.5 py-0.5 text-xs font-medium text-white">
              {portalLabel}
            </span>
            {contextName && (
              <span className="hidden text-sm text-stone-400 sm:inline">· {contextName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-stone-300 sm:inline">{userName}</span>
            <LogoutButton />
          </div>
        </div>
        {nav && nav.length > 0 && (
          <nav className="mx-auto flex max-w-6xl gap-1 px-4 pb-2.5">
            <NavLinks items={nav} />
          </nav>
        )}
      </header>
      <div className="crenel" />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
