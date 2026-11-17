"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { formatCents } from "@/lib/money";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/payments";
import { buttonCls, inputCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";

export type RentView = {
  leaseId: string;
  balanceCents: number;
  pastDueCents: number;
  charges: Array<{ id: string; description: string; openCents: number; dueDate: string; overdue: boolean }>;
  payments: Array<{
    id: string;
    amountCents: number;
    method: string;
    paidAt: string | null;
    note: string | null;
    voided: boolean;
    recordedOffline: boolean;
  }>;
};

const DAY_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const day = (iso: string) => DAY_FMT.format(new Date(iso));

/** Today on the owner's own calendar, as YYYY-MM-DD. */
function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * What a tenant owes and what has come in. Rent paid by Zelle, cash or
 * check is written down here, so the late list and the tenant's page tell
 * the truth.
 */
export function RentPanel({ rent, tenantFirstName }: { rent: RentView; tenantFirstName: string | null }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("zelle");
  const [receivedOn, setReceivedOn] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const who = tenantFirstName ?? "They";
  const owes = rent.balanceCents > 0;

  function start() {
    setAmount(owes ? (rent.balanceCents / 100).toFixed(2) : "");
    setMethod("zelle");
    setReceivedOn(todayLocal());
    setNote("");
    setError(null);
    setOpen(true);
  }

  async function save() {
    if (amount.trim() === "") return setError("Enter the amount.");
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/landlord/leases/${rent.leaseId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountDollars: amount, method, receivedOn, note }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; lateFeesWaived?: number };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Nothing was recorded.");
      return;
    }
    setOpen(false);
    toast(
      data.lateFeesWaived
        ? `Recorded. The late fee is gone, since it arrived on time.`
        : `Recorded ${formatCents(Math.round(Number(amount.replace(/[$,\s]/g, "")) * 100))}.`,
    );
    router.refresh();
  }

  async function undo(paymentId: string) {
    const res = await fetch(`/api/v1/landlord/payments/${paymentId}/void`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      toast(data.error ?? "Couldn't undo it. Try again.", "bad");
      return;
    }
    toast("Undone. The charge is open again.");
    router.refresh();
  }

  return (
    <div>
      {/* The answer: what they owe right now */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{owes ? `${who} owe${who === "They" ? "" : "s"}` : "Owed right now"}</p>
          <p className="text-3xl font-semibold tabular-nums tracking-tight text-stone-900">
            {formatCents(rent.balanceCents)}
          </p>
          {rent.pastDueCents > 0 ? (
            <p className="mt-0.5 text-sm font-medium text-copper-deep">
              {formatCents(rent.pastDueCents)} of it is past due
            </p>
          ) : (
            !owes && (
              <p className="mt-0.5 flex items-center gap-2 text-sm text-stone-600">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-patina" />
                All paid up
              </p>
            )
          )}
        </div>
        {!open && owes && (
          <button
            onClick={start}
            className={buttonCls(rent.pastDueCents > 0 ? "accent" : "secondary")}
          >
            Record a payment
          </button>
        )}
      </div>

      {open && (
        <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
          <p className="font-semibold text-stone-900">Record a payment you received</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-amt`} className="mb-1 block text-sm font-medium text-stone-700">
                Amount
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">
                  $
                </span>
                <input
                  id={`${id}-amt`}
                  autoFocus
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError(null);
                  }}
                  inputMode="decimal"
                  className={`${inputCls} pl-8`}
                />
              </div>
            </div>
            <div>
              <label htmlFor={`${id}-day`} className="mb-1 block text-sm font-medium text-stone-700">
                Day it arrived
              </label>
              <input
                id={`${id}-day`}
                type="date"
                value={receivedOn}
                max={todayLocal()}
                onChange={(e) => {
                  setReceivedOn(e.target.value);
                  setError(null);
                }}
                className={inputCls}
              />
            </div>
          </div>
          <fieldset className="mt-4">
            <legend className="mb-1 text-sm font-medium text-stone-700">How it was paid</legend>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((m) => {
                const on = method === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    aria-pressed={on}
                    className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition ${
                      on
                        ? "border-patina bg-patina-tint text-stone-900"
                        : "border-stone-300 bg-white text-stone-700 hover:border-patina"
                    }`}
                  >
                    {on ? "✓ " : ""}
                    {PAYMENT_METHODS[m]}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label htmlFor={`${id}-note`} className="mb-1 mt-4 block text-sm font-medium text-stone-700">
            Note <span className="font-normal text-stone-500">(only you see this)</span>
          </label>
          <input
            id={`${id}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Check #1042"
            className={inputCls}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm font-medium text-red-700">
              {error}
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button onClick={() => void save()} disabled={busy} className={buttonCls("primary")}>
              {busy ? "Saving…" : "Record it"}
            </button>
            <button onClick={() => setOpen(false)} disabled={busy} className={buttonCls("ghost")}>
              Cancel
            </button>
          </div>
          <p className="mt-3 text-sm text-stone-500">
            It pays the oldest rent first. {tenantFirstName ?? "Your tenant"} sees it on their rent page.
          </p>
        </div>
      )}

      {rent.charges.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100 border-t border-stone-100">
          {rent.charges.map((c) => (
            <li key={c.id} className="flex min-h-14 items-center justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="block text-base font-medium text-stone-900">{c.description}</span>
                <span className={`block text-sm ${c.overdue ? "font-medium text-copper-deep" : "text-stone-500"}`}>
                  {c.overdue ? "Was due " : "Due "}
                  {day(c.dueDate)}
                </span>
              </span>
              <span className="shrink-0 text-base font-semibold tabular-nums text-stone-900">
                {formatCents(c.openCents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {rent.payments.length > 0 && (
        <div className="mt-5">
          <p className="text-sm text-stone-500">Payments</p>
          <ul className="mt-1 divide-y divide-stone-100">
            {rent.payments.map((p) => (
              <li key={p.id} className="flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <span className={`min-w-0 ${p.voided ? "text-stone-400 line-through" : "text-stone-800"}`}>
                  <span className="font-medium tabular-nums">{formatCents(p.amountCents)}</span>
                  {" · "}
                  {p.method}
                  {p.paidAt ? ` · ${day(p.paidAt)}` : ""}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                {p.voided ? (
                  <span className="text-sm text-stone-500">Undone</span>
                ) : (
                  p.recordedOffline && (
                    <ConfirmButton
                      onConfirm={() => undo(p.id)}
                      confirmLabel="Yes, undo it"
                      className="min-h-9 rounded-lg px-3 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-700"
                    >
                      Undo
                    </ConfirmButton>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
