"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatQuotePrice, phoneHref, quoteCeilingCents } from "@/lib/quotes";
import { Badge, buttonCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";

export type BidView = {
  id: string;
  status: string;
  amountCents: number;
  amountHighCents: number | null;
  availability: string | null;
  message: string | null;
  pro: { businessName: string; slug: string | null; phone: string | null; email: string; listedBy: number; jobsApproved: number };
};

/** Bids side by side, lowest first. One tap says yes. No money moves. */
export function BidList({ projectId, bids, open }: { projectId: string; bids: BidView[]; open: boolean }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...bids].sort(
    (a, b) =>
      Number(b.status === "ACCEPTED") - Number(a.status === "ACCEPTED") ||
      quoteCeilingCents(a.amountCents, a.amountHighCents) - quoteCeilingCents(b.amountCents, b.amountHighCents),
  );
  const pending = sorted.filter((b) => b.status === "PENDING");
  const lowestId = pending.length > 1 ? pending[0]!.id : null;

  async function accept(b: BidView) {
    setBusy(b.id);
    setError(null);
    const res = await fetch(`/api/v1/landlord/projects/${projectId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bidId: b.id }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong. Try again.");
      return;
    }
    toast(`${b.pro.businessName} has the job. They are on your repair people now.`);
    router.refresh();
  }

  async function takeDown() {
    const res = await fetch(`/api/v1/landlord/projects/${projectId}/cancel`, { method: "POST" });
    if (!res.ok) return toast("Couldn't take it down. Try again.", "bad");
    toast("Taken down. Bidders were told.");
    router.refresh();
  }

  return (
    <div>
      {sorted.length === 0 ? (
        <p className="py-1 text-stone-600">
          {open ? "No bids yet. Pros nearby were told when you posted it." : "Nobody bid on this one."}
        </p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {sorted.map((b) => {
            const price = formatQuotePrice(b.amountCents, b.amountHighCents);
            const won = b.status === "ACCEPTED";
            const muted = b.status === "DECLINED" || b.status === "EXPIRED";
            const tel = b.pro.phone ? phoneHref(b.pro.phone) : null;
            const facts = [
              b.pro.listedBy > 0 ? (b.pro.listedBy === 1 ? "On 1 owner's list" : `On ${b.pro.listedBy} owners' lists`) : null,
              b.pro.jobsApproved > 0 ? (b.pro.jobsApproved === 1 ? "1 job here" : `${b.pro.jobsApproved} jobs here`) : null,
            ].filter(Boolean);
            return (
              <li key={b.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <p className={`min-w-0 text-base font-semibold ${muted ? "text-stone-500" : "text-stone-900"}`}>
                    {b.pro.slug ? (
                      <Link href={`/pros/${b.pro.slug}`} target="_blank" className="underline decoration-stone-300 underline-offset-4 hover:decoration-patina">
                        {b.pro.businessName}
                      </Link>
                    ) : (
                      b.pro.businessName
                    )}
                    {won && <span className="ml-2 align-middle"><Badge tone="patina">Has the job</Badge></span>}
                    {b.id === lowestId && <span className="ml-2 align-middle"><Badge tone="patina">Lowest</Badge></span>}
                  </p>
                  <p className={`shrink-0 text-lg font-semibold tabular-nums tracking-tight ${muted ? "text-stone-500" : "text-stone-900"}`}>
                    {price}
                  </p>
                </div>
                {b.availability && !muted && <p className="mt-0.5 text-stone-700">Can come: {b.availability}</p>}
                {b.message && !muted && <p className="mt-0.5 whitespace-pre-wrap text-stone-600">{b.message}</p>}
                {facts.length > 0 && !muted && <p className="mt-1 text-sm text-stone-500">{facts.join(" · ")}</p>}
                {muted && <p className="mt-0.5 text-sm text-stone-500">Not chosen.</p>}
                {won && (
                  <p className="mt-1 text-sm text-stone-600">
                    To set the time,{" "}
                    {tel && (
                      <a href={`tel:${tel}`} className="font-medium text-patina underline">
                        call {b.pro.phone}
                      </a>
                    )}
                    {tel && b.pro.email ? " or " : ""}
                    {b.pro.email && (
                      <a href={`mailto:${b.pro.email}`} className="font-medium text-patina underline">
                        email {b.pro.email}
                      </a>
                    )}
                    .
                  </p>
                )}
                {open && b.status === "PENDING" && (
                  <button
                    onClick={() => void accept(b)}
                    disabled={busy !== null}
                    className={`${buttonCls(b.id === lowestId || pending.length === 1 ? "accent" : "secondary", "sm")} mt-3`}
                  >
                    {busy === b.id ? "Saying yes…" : `Say yes to ${price}`}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      {open && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <p className="text-sm text-stone-500">Saying yes tells them to go ahead at that price. You pay them directly.</p>
          <ConfirmButton
            onConfirm={takeDown}
            confirmLabel="Yes, take it down"
            className="min-h-9 rounded-lg px-3 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-700"
          >
            Take this project down
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
