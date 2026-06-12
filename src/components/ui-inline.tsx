"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { inputCls } from "@/components/ui";
import { useToast } from "@/components/ui-feedback";
import { IconCheck, IconPencil } from "@/components/icons";

/**
 * Row-level in-place editing: the row IS the form. Click a value, edit just
 * that value, it saves itself. No edit modes, no Save-everything ceremony.
 *
 * Keyboard contract: Enter commits, Escape reverts, blur commits.
 * Textarea rows: Enter newlines, Cmd/Ctrl+Enter commits.
 * Selects commit on change. Chips: Enter/comma adds, Backspace on empty
 * removes the last chip, suggestions add on mousedown (beats the blur race),
 * the check button commits (the touch path).
 */

export type RowKind =
  | { kind: "text"; placeholder?: string; rows?: number }
  | { kind: "money"; placeholder?: string; suffix?: string }
  | { kind: "number"; placeholder?: string; decimal?: boolean }
  | { kind: "select"; options: Array<{ value: string; label: string }> }
  | { kind: "chips"; suggestions?: string[]; placeholder?: string };

export type EditableRowProps = {
  label: string;
  /** Raw editable value; null/[] means empty. */
  value: string | string[] | null;
  /** Optional view-mode override (Money, masked secrets, Badge chips). */
  display?: React.ReactNode;
  /** Progressive-profiling pitch shown when empty, behind a copper +. */
  emptyPrompt: string;
  kind: RowKind;
  onSave: (next: string | string[] | null) => Promise<boolean>;
  savedToast?: string;
  /** Required rows revert silently on empty commit (NameEditor precedent). */
  required?: boolean;
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

const labelCls = "text-xs font-semibold uppercase tracking-wide text-stone-400";

export function EditableRow({
  label,
  value,
  display,
  emptyPrompt,
  kind,
  onSave,
  savedToast,
  required,
}: EditableRowProps) {
  const { push: toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  // Local copy survives until the server refresh lands (no flash).
  const [local, setLocal] = useState<string | string[] | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [chips, setChips] = useState<string[]>([]);
  const rowButton = useRef<HTMLButtonElement>(null);

  const current = local !== undefined ? local : value;
  const isEmpty =
    current === null || current === "" || (Array.isArray(current) && current.length === 0);

  function open() {
    if (kind.kind === "chips") {
      setChips(Array.isArray(current) ? current : []);
      setDraft("");
    } else {
      setDraft(typeof current === "string" ? current : "");
    }
    setEditing(true);
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
      setEditing(false);
      return;
    }
    const unchanged =
      JSON.stringify(next ?? null) === JSON.stringify(current ?? null) ||
      (next === null && isEmpty);
    if (unchanged) {
      setEditing(false);
      return;
    }

    setBusy(true);
    const ok = await onSave(next);
    setBusy(false);
    if (ok) {
      setLocal(next);
      setEditing(false);
      if (savedToast) toast(savedToast);
      rowButton.current?.focus();
    }
    // On failure stay open with the draft; onSave already toasted.
  }

  function cancel() {
    setEditing(false);
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

  return (
    <div className="grid min-h-11 grid-cols-[7.5rem_1fr] items-baseline gap-x-4 py-1">
      <dt className={`${labelCls} leading-5`}>{label}</dt>
      <dd className="min-w-0 text-sm leading-5">
        {!editing ? (
          <button
            ref={rowButton}
            onClick={open}
            className="group flex w-full items-start justify-between gap-2 rounded-lg text-left transition hover:bg-stone-50"
          >
            {isEmpty ? (
              <span className="text-stone-400 transition group-hover:text-copper-deep">
                <span className="mr-1 font-semibold text-copper">+</span>
                {emptyPrompt}
              </span>
            ) : (
              <span className="min-w-0 text-stone-800">{display ?? formatPlain(current)}</span>
            )}
            <IconPencil className="mt-0.5 h-3 w-3 shrink-0 text-stone-300 opacity-0 transition group-hover:opacity-100" />
          </button>
        ) : kind.kind === "select" ? (
          <select
            autoFocus
            defaultValue={typeof current === "string" ? current : ""}
            disabled={busy}
            onChange={(e) => void commit(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && cancel()}
            onBlur={cancel}
            className={inputCls}
          >
            {kind.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : kind.kind === "chips" ? (
          <div className="rounded-lg border border-patina bg-white p-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full bg-patina-tint px-2 py-0.5 text-xs font-medium text-patina"
                >
                  {c}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setChips((all) => all.filter((x) => x !== c))}
                    aria-label={`Remove ${c}`}
                    className="text-patina/60 hover:text-patina"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <input
                autoFocus
                value={draft}
                disabled={busy}
                placeholder={kind.placeholder ?? "Type and press Enter"}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addChip(draft);
                  } else if (e.key === "Backspace" && draft === "") {
                    setChips((c) => c.slice(0, -1));
                  } else if (e.key === "Escape") {
                    cancel();
                  }
                }}
                onBlur={() => void commit()}
                className="min-w-24 flex-1 border-0 p-0.5 text-sm focus:outline-none"
              />
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void commit()}
                disabled={busy}
                aria-label="Save"
                className="cut-sm bg-iron p-1.5 text-white hover:bg-iron-deep disabled:opacity-50"
              >
                <IconCheck className="h-3 w-3" />
              </button>
            </div>
            {kind.suggestions && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {kind.suggestions
                  .filter((s) => !chips.some((c) => c.toLowerCase() === s.toLowerCase()))
                  .map((s) => (
                    <button
                      key={s}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addChip(s);
                      }}
                      className="rounded-full border border-stone-200 px-2 py-0.5 text-xs text-stone-500 hover:border-patina hover:text-patina"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            )}
          </div>
        ) : kind.kind === "text" && (kind.rows ?? 1) > 1 ? (
          <textarea
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
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-400">
                $
              </span>
            )}
            <input
              autoFocus
              value={draft}
              disabled={busy}
              placeholder={kind.kind === "text" ? kind.placeholder : (kind.placeholder ?? "")}
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
              className={`${inputCls} ${kind.kind === "money" ? "pl-7" : ""}`}
            />
          </div>
        )}
      </dd>
    </div>
  );
}

function formatPlain(v: string | string[] | null): string {
  if (v === null) return "";
  return Array.isArray(v) ? v.join(", ") : v;
}
