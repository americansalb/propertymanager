"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";

/** A pro's bid: a price (or a range), when they can come, a note. */
export function BidForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: { price: string; high: string; availability: string; note: string } | null;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const id = useId();
  const [price, setPrice] = useState(initial?.price ?? "");
  const [high, setHigh] = useState(initial?.high ?? "");
  const [range, setRange] = useState(Boolean(initial?.high));
  const [availability, setAvailability] = useState(initial?.availability ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const label = "mb-1 block text-sm font-medium text-stone-700";

  async function send() {
    if (price.trim() === "") return setError("Enter your price.");
    if (availability.trim().length < 2) return setError("Say when you can come.");
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/pro/projects/${projectId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceDollars: price, priceHighDollars: range ? high : null, availability, note }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "That did not send. Try again.");
      return;
    }
    toast(initial ? "Bid changed." : "Bid sent. The owner sees it now.");
    router.refresh();
  }

  async function takeBack() {
    const res = await fetch(`/api/v1/pro/projects/${projectId}/bid`, { method: "DELETE" });
    if (!res.ok) return toast("Couldn't take it back. Try again.", "bad");
    toast("Bid taken back.");
    router.refresh();
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={range ? "" : "sm:col-span-2"}>
          <label htmlFor={`${id}-p`} className={label}>{range ? "Your price, at least" : "Your price"}</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">$</span>
            <input id={`${id}-p`} value={price} onChange={(e) => { setPrice(e.target.value); setError(null); }} inputMode="decimal" placeholder="450" className={`${inputCls} pl-8`} />
          </div>
        </div>
        {range && (
          <div>
            <label htmlFor={`${id}-h`} className={label}>At most</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">$</span>
              <input id={`${id}-h`} value={high} onChange={(e) => setHigh(e.target.value)} inputMode="decimal" placeholder="650" className={`${inputCls} pl-8`} />
            </div>
          </div>
        )}
      </div>
      <button type="button" onClick={() => { setRange((r) => !r); setHigh(""); }} className="mt-2 text-sm font-medium text-patina underline">
        {range ? "Give one price instead" : "Not sure until you see it? Give a range"}
      </button>
      <label htmlFor={`${id}-w`} className={`${label} mt-4`}>When can you come?</label>
      <input id={`${id}-w`} value={availability} onChange={(e) => { setAvailability(e.target.value); setError(null); }} placeholder="Saturday morning" className={inputCls} />
      <label htmlFor={`${id}-n`} className={`${label} mt-4`}>
        Note for the owner <span className="font-normal text-stone-500">(if you like)</span>
      </label>
      <textarea id={`${id}-n`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Includes paint and patching compound." className={`${inputCls} resize-none`} />
      {error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{error}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => void send()} disabled={busy} className={`${buttonCls("primary")} min-h-12`}>
          {busy ? "Sending…" : initial ? "Change my bid" : "Send my bid"}
        </button>
        {initial && (
          <ConfirmButton onConfirm={takeBack} confirmLabel="Yes, take it back" className="min-h-9 rounded-lg px-3 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-700">
            Take my bid back
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
