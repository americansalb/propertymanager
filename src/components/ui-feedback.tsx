"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

/**
 * The app talks back: every action confirms or explains, quietly.
 * Toasts are forged chips (iron for done, red for failed), bottom-center,
 * self-dismissing. ConfirmButton replaces native window.confirm with an
 * in-place two-step that disarms itself.
 */

type Toast = { id: number; message: string; tone: "good" | "bad" };

const ToastCtx = createContext<{ push: (message: string, tone?: Toast["tone"]) => void } | null>(
  null,
);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: Toast["tone"] = "good") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`cut-sm animate-step px-4 py-2 text-sm font-medium text-white ${
              t.tone === "bad" ? "bg-red-700" : "bg-iron"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/** Safe anywhere: outside a provider it simply does nothing. */
export function useToast() {
  const ctx = useContext(ToastCtx);
  return ctx ?? { push: () => undefined };
}

/**
 * Two-step destructive action, in place: first tap arms it ("Sure?"),
 * second confirms, and it disarms itself after a beat. No browser dialogs.
 */
export function ConfirmButton({
  onConfirm,
  children,
  confirmLabel = "Yes, delete",
  className,
  title,
}: {
  onConfirm: () => void | Promise<void>;
  children: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  title?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function arm() {
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 4000);
  }

  async function confirm() {
    if (timer.current) clearTimeout(timer.current);
    setBusy(true);
    await onConfirm();
    setBusy(false);
    setArmed(false);
  }

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <button
          onClick={() => void confirm()}
          disabled={busy}
          className="cut-sm bg-red-700 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
        >
          {busy ? "…" : confirmLabel}
        </button>
        <button
          onClick={() => {
            if (timer.current) clearTimeout(timer.current);
            setArmed(false);
          }}
          disabled={busy}
          className="rounded-lg px-2 py-1 text-xs font-medium text-stone-500 hover:bg-stone-100"
        >
          Keep
        </button>
      </span>
    );
  }

  return (
    <button onClick={arm} title={title} className={className}>
      {children}
    </button>
  );
}
