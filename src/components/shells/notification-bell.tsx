"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconBell } from "@/components/icons";

export type BellItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Header notification bell shared by every portal. Hydrates from server-passed
 * initial data (no loading flash), refreshes on open and on a light interval,
 * and reads the same Notification rows the worker also emails.
 */
export function NotificationBell({
  initialItems,
  initialUnread,
}: {
  initialItems: BellItem[];
  initialUnread: number;
}) {
  const [items, setItems] = useState<BellItem[]>(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function refresh() {
    const res = await fetch("/api/v1/notifications", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { items: BellItem[]; unread: number };
    setItems(data.items ?? []);
    setUnread(data.unread ?? 0);
  }

  useEffect(() => {
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void refresh();
  }

  async function markAll() {
    setUnread(0);
    setItems((xs) => xs.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    await fetch("/api/v1/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  }

  async function markOne(id: string) {
    let wasUnread = false;
    setItems((xs) =>
      xs.map((x) => {
        if (x.id === id && !x.readAt) wasUnread = true;
        return x.id === id ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x;
      }),
    );
    if (wasUnread) setUnread((n) => Math.max(0, n - 1));
    await fetch("/api/v1/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-stone-300 transition hover:bg-white/10 hover:text-white"
      >
        <IconBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-copper px-1 text-[10px] font-semibold tabular-nums text-iron-deep">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-14 z-50 overflow-hidden rounded-xl border border-stone-300 bg-white text-left sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-stone-900">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="text-xs font-medium text-patina hover:text-patina-bright"
              >
                Mark all read
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-500">You&apos;re all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const isUnread = !n.readAt;
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 ${isUnread ? "bg-patina-tint/40" : ""}`}>
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        isUnread ? "bg-patina" : "bg-transparent"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-900">{n.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{n.body}</p>
                      <p className="mt-1 text-[11px] text-stone-400">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id} className="border-b border-stone-50 last:border-0">
                    {n.linkUrl ? (
                      <Link
                        href={n.linkUrl}
                        onClick={() => {
                          void markOne(n.id);
                          setOpen(false);
                        }}
                        className="block hover:bg-stone-50"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void markOne(n.id)}
                        className="block w-full text-left hover:bg-stone-50"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
