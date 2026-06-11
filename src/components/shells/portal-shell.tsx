import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoutButton } from "./logout-button";

export function PortalShell({
  portalLabel,
  userName,
  contextName,
  children,
}: {
  portalLabel: string;
  userName: string;
  contextName?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
              {brand.name}
            </Link>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              {portalLabel}
            </span>
            {contextName && <span className="text-sm text-stone-500">· {contextName}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-600">{userName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
