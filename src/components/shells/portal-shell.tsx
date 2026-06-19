import Link from "next/link";
import { brand } from "@/lib/brand";
import { getSession } from "@/lib/authz";
import { listNotifications, unreadCount } from "@/lib/services/notification";
import { LogoMark } from "@/components/brand/logo-mark";
import { ToastProvider } from "@/components/ui-feedback";
import { LogoutButton } from "./logout-button";
import { NavLinks, type NavItem } from "./nav-links";
import { NotificationBell } from "./notification-bell";

/** Fortress header: iron band, patina nav, battlement edge. */
export async function PortalShell({
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
  const session = await getSession();
  const notes = session ? await listNotifications(session.userId, 12) : [];
  const initialUnread = session ? await unreadCount(session.userId) : 0;
  const initialItems = notes.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    linkUrl: n.linkUrl,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));
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
            <NotificationBell initialItems={initialItems} initialUnread={initialUnread} />
            <span className="hidden text-sm text-stone-300 sm:inline">{userName}</span>
            <LogoutButton />
          </div>
        </div>
        {nav && nav.length > 0 && (
          <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2.5">
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
