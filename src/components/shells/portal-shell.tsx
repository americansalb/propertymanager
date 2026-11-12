import Link from "next/link";
import { getSession } from "@/lib/authz";
import { listNotifications, unreadCount } from "@/lib/services/notification";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { ToastProvider } from "@/components/ui-feedback";
import { LogoutButton } from "./logout-button";
import { NavLinks, TabBar, type NavItem } from "./nav-links";
import { NotificationBell } from "./notification-bell";

/**
 * The frame around every signed-in page: a white header, then one column.
 * Header and page share the same width, so their edges line up. On a phone
 * the places move to a bar at the bottom, under the thumb.
 */
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
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <LogoMark small className="h-8 w-8" />
              <Wordmark className="text-lg" />
            </Link>
            <span className="rounded-full bg-patina-tint px-2.5 py-0.5 text-xs font-medium text-patina">
              {portalLabel}
            </span>
            {contextName && (
              <span className="hidden text-sm text-stone-500 sm:inline">· {contextName}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell initialItems={initialItems} initialUnread={initialUnread} />
            <span className="hidden text-sm text-stone-600 sm:inline">{userName}</span>
            <LogoutButton />
          </div>
        </div>
        {nav && nav.length > 0 && (
          <nav aria-label="Main" className="mx-auto hidden max-w-3xl gap-1 px-1 sm:flex">
            <NavLinks items={nav} />
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:pb-16 sm:pt-8">
        <ToastProvider>{children}</ToastProvider>
      </main>
      {nav && nav.length > 0 && <TabBar items={nav} />}
    </div>
  );
}
