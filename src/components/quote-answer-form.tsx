"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { buttonCls, inputCls } from "@/components/ui";

/**
 * The repair person's whole job here: a price, when they can come, send.
 * Or one tap to pass. No account, no password.
 */
export function QuoteAnswerForm({
  token,
  ownerName,
  initial,
}: {
  token: string;
  ownerName: string;
  initial?: { price: string; high: string; availability: string; note: string };
}) {
  const router = useRouter();
  const id = useId();
  const [price, setPrice] = useState(initial?.price ?? "");
  const [high, setHigh] = useState(initial?.high ?? "");
  const [range, setRange] = useState(Boolean(initial?.high));
  const [availability, setAvailability] = useState(initial?.availability ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [busy, setBusy] = useState<"price" | "pass" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const label = "mb-1 block text-sm font-medium text-stone-700";

  async function send(answer: "price" | "pass") {
    if (answer === "price") {
      if (price.trim() === "") return setError("Enter your price.");
      if (availability.trim().length < 2) return setError("Say when you can come.");
    }
    setBusy(answer);
    setError(null);
    const res = await fetch("/api/v1/quotes/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        answer === "pass"
          ? { answer, token }
          : {
              answer,
              token,
              priceDollars: price,
              priceHighDollars: range && high.trim() !== "" ? high : null,
              availability,
              note,
            },
      ),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "That did not send. Try again.");
      setBusy(null);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={range ? "" : "sm:col-span-2"}>
          <label htmlFor={`${id}-price`} className={label}>
            {range ? "Your price, at least" : "Your price"}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">
              $
            </span>
            <input
              id={`${id}-price`}
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setError(null);
              }}
              inputMode="decimal"
              placeholder="180"
              className={`${inputCls} pl-8`}
            />
          </div>
        </div>
        {range && (
          <div>
            <label htmlFor={`${id}-high`} className={label}>
              At most
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">
                $
              </span>
              <input
                id={`${id}-high`}
                value={high}
                onChange={(e) => setHigh(e.target.value)}
                inputMode="decimal"
                placeholder="300"
                className={`${inputCls} pl-8`}
              />
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setRange((r) => !r);
          setHigh("");
        }}
        className="mt-2 text-sm font-medium text-patina underline"
      >
        {range ? "Give one price instead" : "Not sure until you see it? Give a range"}
      </button>

      <label htmlFor={`${id}-when`} className={`${label} mt-4`}>
        When can you come?
      </label>
      <input
        id={`${id}-when`}
        value={availability}
        onChange={(e) => {
          setAvailability(e.target.value);
          setError(null);
        }}
        placeholder="Tomorrow morning"
        className={inputCls}
      />

      <label htmlFor={`${id}-note`} className={`${label} mt-4`}>
        Anything to add? <span className="font-normal text-stone-500">(if you like)</span>
      </label>
      <textarea
        id={`${id}-note`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Price includes the part."
        className={`${inputCls} resize-none`}
      />

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        onClick={() => void send("price")}
        disabled={busy !== null}
        className={`${buttonCls("primary")} mt-5 min-h-12 w-full`}
      >
        {busy === "price" ? "Sending…" : "Send my price"}
      </button>
      <button
        onClick={() => void send("pass")}
        disabled={busy !== null}
        className={`${buttonCls("ghost")} mt-2 w-full`}
      >
        {busy === "pass" ? "Sending…" : "I cannot take this one"}
      </button>
      <p className="mt-3 text-center text-sm text-stone-500">
        No account needed. {ownerName} sees your answer right away.
      </p>
    </div>
  );
}
