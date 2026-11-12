"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";
import { useToast } from "@/components/ui-feedback";
import { IconPencil } from "@/components/icons";

/**
 * Row-level in-place editing: the row IS the form. Tap a value, edit just
 * that value, save it. No edit modes, no Save-everything ceremony.
 *
 * A row reads as a sentence: a plain label, then the value in ink. While
 * editing, Save and Cancel are always visible, so nothing is saved by magic.
 *
 * Keyboard contract: Enter saves, Escape cancels, leaving the field saves.
 * Textarea rows: Enter newlines, Cmd/Ctrl+Enter saves.
 * Selects save on change. Chips: Enter/comma adds, Backspace on empty
 * removes the last chip, suggestions add on mousedown (beats the blur race).
 */

export type RowKind =
  | { kind: "text"; placeholder?: string; rows?: number }
  | { kind: "money"; placeholder?: string; suffix?: string }
  | { kind: "number"; placeholder?: string; decimal?: boolean }
  | { kind: "date" }
  | { kind: "select"; options: Array<{ value: string; label: string }> }
  | { kind: "chips"; suggestions?: string[]; placeholder?: string };

export type EditableRowProps = {
  label: string;
  /** Raw editable value; null/[] means empty. */
  value: string | string[] | null;
  /** Optional view-mode override (Money, masked secrets, Badge chips). */
  display?: React.ReactNode;
  /** What to say when the row is empty, behind a copper +. */
  emptyPrompt: string;
  kind: RowKind;
  onSave: (next: string | string[] | null) => Promise<boolean>;
  savedToast?: string;
  /** Required rows revert silently on empty commit (NameEditor precedent). */
  required?: boolean;
  /** Start in edit mode: used when an "Add" chip reveals the row. */
  autoOpen?: boolean;
  /** Called when editing closes and the row is still empty. */
  onDismissEmpty?: () => void;
};

/** Shared single-field PATCH: toast on failure, refresh on success. */
export function useRowPatch(url: string) {
  const router = useRouter();
  const { push: toast } = useToast();
  return useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast(data.error ?? "Something went wrong.", "bad");
        return false;
      }
      router.refresh();
      return true;
    },
    [url, router, toast],
  );
}

const isEmptyValue = (v: string | string[] | null | undefined) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

export function EditableRow({
  label,
  value,
  display,
  emptyPrompt,
  kind,
  onSave,
  savedToast,
  required,
  autoOpen,
  onDismissEmpty,
}: EditableRowProps) {
  const { push: toast } = useToast();
  const fieldId = useId();
  const [editing, setEditing] = useState(Boolean(autoOpen));
  const [busy, setBusy] = useState(false);
  // Local copy survives until the server refresh lands (no flash).
  const [local, setLocal] = useState<string | string[] | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const rowButton = useRef<HTMLButtonElement>(null);

  const current = local !== undefined ? local : value;
  const isEmpty = isEmptyValue(current);

  function open() {
    if (kind.kind === "chips") {
      setChips(Array.isArray(current) ? current : []);
      setDraft("");
    } else {
      setDraft(typeof current === "string" ? current : "");
    }
    setEditing(true);
  }

  function close(stillEmpty: boolean) {
    setEditing(false);
    if (stillEmpty) onDismissEmpty?.();
  }

  async function commit(rawNext?: string | string[] | null) {
    let next: string | string[] | null;
    if (rawNext !== undefined) {
      next = rawNext;
    } else if (kind.kind === "chips") {
      const pending = draft.trim();
      next = pending ? [...chips, pending] : chips;
    } else {
      next = draft.trim();
      if (kind.kind === "money") next = next.replace(/[$,\s]/g, "");
      if (next === "") next = null;
    }

    if (required && (next === null || next === "")) {
      close(isEmpty);
      return;
    }
    const unchanged =
      JSON.stringify(next ?? null) === JSON.stringify(current ?? null) ||
      (isEmptyValue(next) && isEmpty);
    if (unchanged) {
      close(isEmpty);
      return;
    }

    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    if (ok) {
      setLocal(next);
      close(isEmptyValue(next));
      if (savedToast) toast(savedToast);
      rowButton.current?.focus();
    }
    // On failure stay open with the draft; onSave already toasted.
  }

  function cancel() {
    close(isEmpty);
  }

  function onKeys(e: React.KeyboardEvent, isTextarea = false) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    if (e.key === "Enter") {
      if (isTextarea && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      void commit();
    }
  }

  function addChip(raw: string) {
    const chip = raw.trim();
    if (!chip) return;
    if (chips.some((c) => c.toLowerCase() === chip.toLowerCase())) {
      setDraft("");
      return;
    }
    setChips((c) => [...c, chip]);
    setDraft("");
  }

  // The WHOLE row is the button: label included, a full touch target. On a
  // phone the label sits above the value; from tablet up they sit side by side.
  if (!editing) {
    return (
      <button
        ref={rowButton}
        onClick={open}
        className="group -mx-3 flex min-h-12 w-[calc(100%+1.5rem)] flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition hover:bg-stone-50 focus-visible:bg-stone-50 sm:grid sm:grid-cols-[10rem_1fr] sm:items-baseline sm:gap-x-4 sm:gap-y-0"
      >
        <span className="text-sm leading-6 text-stone-500">{label}</span>
        <span className="flex min-w-0 items-start justify-between gap-3 text-base leading-6">
          {isEmpty ? (
            <span className="text-stone-500 transition group-hover:text-copper-deep">
              <span className="mr-1.5 font-semibold text-copper-deep">+</span>
              {emptyPrompt}
            </span>
          ) : (
            <span className="min-w-0 font-medium text-stone-900">
              {display ?? formatPlain(current)}
            </span>
          )}
          <IconPencil className="mt-1 h-3.5 w-3.5 shrink-0 text-stone-400 transition group-hover:text-stone-600" />
        </span>
      </button>
    );
  }

  // Buttons keep the field focused (mousedown) so leaving-saves cannot race them.
  const actions = (
    <div className="mt-2.5 flex flex-wrap gap-2">
      {kind.kind !== "select" && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void commit()}
          disabled={busy}
          className={buttonCls("primary", "sm")}
        >
          {busy ? "Saving…" : "Save"}
        </button>
      )}
      <button
        onMouseDown={(e) => e.preventDefault()}
        onClick={cancel}
        disabled={busy}
        className={buttonCls("ghost", "sm")}
      >
        Cancel
      </button>
    </div>
  );

  return (
    <div className="-mx-3 rounded-lg bg-stone-50 px-3 py-3 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-x-4">
      <label
        htmlFor={fieldId}
        className="block pb-1.5 text-sm font-medium leading-6 text-stone-700 sm:pb-0 sm:pt-3"
      >
        {label}
      </label>
      <div className="min-w-0">
        {kind.kind === "select" ? (
          <select
            id={fieldId}
            autoFocus
            defaultValue={typeof current === "string" ? current : ""}
            disabled={busy}
            onChange={(e) => void commit(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && cancel()}
            className={inputCls}
          >
            {kind.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : kind.kind === "chips" ? (
          <div className="rounded-xl border border-patina bg-white p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full bg-patina-tint py-1 pl-3 pr-2 text-sm font-medium text-patina"
                >
                  {c}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setChips((all) => all.filter((x) => x !== c))}
                    aria-label={`Remove ${c}`}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-patina/70 hover:bg-patina/10 hover:text-patina"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                id={fieldId}
                autoFocus
                value={draft}
                disabled={busy}
                placeholder={kind.placeholder ?? "Type and press Enter"}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    if (draft.trim() === "" && e.key === "Enter") void commit();
                    else addChip(draft);
                  } else if (e.key === "Backspace" && draft === "") {
                    setChips((c) => c.slice(0, -1));
                  } else if (e.key === "Escape") {
                    cancel();
                  }
                }}
                className="min-w-28 flex-1 border-0 bg-transparent p-1 text-base focus:outline-none"
              />
            </div>
            {kind.suggestions && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kind.suggestions
                  .filter((s) => !chips.some((c) => c.toLowerCase() === s.toLowerCase()))
                  .map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addChip(s);
                      }}
                      className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-600 hover:border-patina hover:text-patina"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ) : kind.kind === "text" && (kind.rows ?? 1) > 1 ? (
          <textarea
            id={fieldId}
            autoFocus
            rows={kind.rows}
            value={draft}
            disabled={busy}
            placeholder={kind.placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => onKeys(e, true)}
            onBlur={() => void commit()}
            className={inputCls}
          />
        ) : (
          <div className="relative">
            {kind.kind === "money" && (
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">
                $
              </span>
            )}
            <input
              id={fieldId}
              autoFocus
              value={draft}
              disabled={busy}
              type={kind.kind === "date" ? "date" : "text"}
              placeholder={"placeholder" in kind ? kind.placeholder : undefined}
              inputMode={
                kind.kind === "money"
                  ? "decimal"
                  : kind.kind === "number"
                    ? kind.decimal
                      ? "decimal"
                      : "numeric"
                    : undefined
              }
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => onKeys(e)}
              onBlur={() => void commit()}
              className={`${inputCls} ${kind.kind === "money" ? "pl-8" : ""}`}
            />
          </div>
        )}
        {actions}
      </div>
    </div>
  );
}

function formatPlain(v: string | string[] | null): string {
  if (v === null) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}

/**
 * Optional details stay out of the way until someone wants them: each one
 * is a chip here, and tapping it opens that row for editing.
 */
export function AddChips({
  title,
  items,
  onPick,
}: {
  title: string;
  items: Array<{ key: string; label: string }>;
  onPick: (key: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3 border-t border-stone-100 pt-4">
      <p className="text-sm text-stone-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <button
            key={item.key}
            // Keep focus where it is until the click lands: an open empty row
            // closes on blur, which would shift this chip from under the tap.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(item.key)}
            className="inline-flex min-h-9 items-center rounded-full border border-stone-300 bg-white px-3.5 text-sm font-medium text-stone-700 transition hover:border-patina hover:text-patina"
          >
            <span className="mr-1.5 font-semibold text-copper-deep">+</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Which optional rows are showing: the ones with a value, plus any the
 * person just asked to add. Returns helpers for a list of optional fields.
 */
export function useOptionalRows<K extends string>(filled: Record<K, boolean>) {
  const [revealed, setRevealed] = useState<K[]>([]);
  const keys = Object.keys(filled) as K[];
  return {
    /** Show this row? */
    shows: (key: K) => filled[key] || revealed.includes(key),
    /** Was it just revealed by a chip (so it should open for editing)? */
    fresh: (key: K) => !filled[key] && revealed.includes(key),
    reveal: (key: K) => setRevealed((r) => (r.includes(key) ? r : [...r, key])),
    hide: (key: K) => setRevealed((r) => r.filter((k) => k !== key)),
    /** Keys still waiting behind a chip. */
    pending: keys.filter((k) => !filled[k] && !revealed.includes(k)),
  };
}
