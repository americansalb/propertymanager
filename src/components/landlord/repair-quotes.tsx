"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatQuotePrice, phoneHref, quoteCeilingCents } from "@/lib/quotes";
import { Badge, buttonCls } from "@/components/ui";
import { useToast } from "@/components/ui-feedback";

export type QuoteView = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  emailed: boolean;
  viewed: boolean;
  priceLowCents: number | null;
  priceHighCents: number | null;
  availability: string | null;
  note: string | null;
  autoApproved: boolean;
};

type Issued = { quoteId: string; link: string; text: string; name: string; phone: string | null };

const ORDER: Record<string, number> = {
  APPROVED: 0,
  QUOTED: 1,
  SENT: 2,
  DECLINED: 3,
  NOT_CHOSEN: 4,
};

function names(list: Array<{ name: string }>): string {
  const n = list.map((p) => p.name);
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} and ${n.at(-1)}`;
}

/**
 * Prices from the owner's own repair people, lined up to compare. One tap
 * says yes to one of them. Saying yes is "go ahead at this price": no money
 * moves here.
 */
export function RepairQuotes({
  requestId,
  quotes,
  canAsk,
  peopleOnFile,
  open,
}: {
  requestId: string;
  quotes: QuoteView[];
  canAsk: Array<{ id: string; name: string }>;
  peopleOnFile: number;
  open: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);

  async function post(url: string, key: string, body?: unknown) {
    setBusy(key);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    setBusy(null);
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      setError((data.error as string) ?? "Something went wrong. Try again.");
      return null;
    }
    return data;
  }

  async function ask() {
    const data = await post(`/api/v1/landlord/maintenance/${requestId}/quotes`, "ask");
    if (!data) return;
    const asked = (data.asked as Array<{ name: string; emailed: boolean }>) ?? [];
    const emailed = asked.filter((a) => a.emailed);
    toast(
      asked.length === 0
        ? "Everyone who fits was already asked."
        : emailed.length === asked.length
          ? `Asked ${names(asked)}.`
          : `Added ${names(asked)}. Text the link to anyone marked "not sent yet".`,
    );
    router.refresh();
  }

  async function approve(q: QuoteView) {
    const data = await post(`/api/v1/landlord/quotes/${q.id}/approve`, `approve:${q.id}`);
    if (!data) return;
    toast(`${q.name} has the job.`);
    router.refresh();
  }

  async function getLink(q: QuoteView) {
    const data = await post(`/api/v1/landlord/quotes/${q.id}/link`, `link:${q.id}`);
    if (!data) return;
    setIssued({
      quoteId: q.id,
      link: data.link as string,
      text: data.text as string,
      name: q.name,
      phone: q.phone,
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied.");
    } catch {
      toast("Couldn't copy. Select the text and copy it by hand.", "bad");
    }
  }

  // Nobody on file yet: say what this is and where to start.
  if (peopleOnFile === 0) {
    return (
      <div className="flex flex-col gap-4 py-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-stone-600">
          Add your plumber, locksmith or handyman once. After that, every repair asks them for a
          price and lines the answers up here.
        </p>
        <Link href="/landlord/maintenance/people" className={`${buttonCls("secondary")} shrink-0`}>
          Add your repair people
        </Link>
      </div>
    );
  }

  const sorted = [...quotes].sort(
    (a, b) =>
      (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) ||
      quoteCeilingCents(a.priceLowCents ?? 0, a.priceHighCents) -
        quoteCeilingCents(b.priceLowCents ?? 0, b.priceHighCents),
  );
  const priced = sorted.filter((q) => q.status === "QUOTED");
  const lowestId = priced.length > 1 ? priced[0]!.id : null;

  return (
    <div>
      {quotes.length === 0 &&
        (canAsk.length > 0 ? (
          <div className="flex flex-col gap-4 py-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-stone-600">
              {names(canAsk)} {canAsk.length === 1 ? "does" : "do"} this kind of work. They get a
              link, name a price and a time, and the answers show up here.
            </p>
            <button
              onClick={() => void ask()}
              disabled={busy !== null}
              className={`${buttonCls("accent")} shrink-0`}
            >
              {busy === "ask" ? "Asking…" : "Ask for a price"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-stone-600">
              {open
                ? "Nobody on your list does this kind of work."
                : "Nobody was asked for a price on this one."}
            </p>
            {open && (
              <Link
                href="/landlord/maintenance/people"
                className={`${buttonCls("secondary")} shrink-0`}
              >
                Add someone who does
              </Link>
            )}
          </div>
        ))}

      {sorted.length > 0 && (
        <ul className="divide-y divide-stone-100">
          {sorted.map((q) => {
            const hasPrice = q.priceLowCents != null;
            const price = hasPrice ? formatQuotePrice(q.priceLowCents!, q.priceHighCents) : null;
            const tel = q.phone ? phoneHref(q.phone) : null;
            const muted = q.status === "DECLINED" || q.status === "NOT_CHOSEN";
            return (
              <li key={q.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <p
                    className={`min-w-0 text-base font-semibold ${muted ? "text-stone-500" : "text-stone-900"}`}
                  >
                    {q.name}
                    {q.status === "APPROVED" && (
                      <span className="ml-2 align-middle">
                        <Badge tone="patina">Has the job</Badge>
                      </span>
                    )}
                    {q.id === lowestId && (
                      <span className="ml-2 align-middle">
                        <Badge tone="patina">Lowest</Badge>
                      </span>
                    )}
                  </p>
                  {price && (
                    <p
                      className={`shrink-0 text-lg font-semibold tabular-nums tracking-tight ${muted ? "text-stone-500" : "text-stone-900"}`}
                    >
                      {price}
                    </p>
                  )}
                </div>

                {q.status === "SENT" && (
                  <p className="mt-0.5 flex items-center gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${q.emailed ? "bg-stone-300" : "bg-copper"}`}
                    />
                    <span className={q.emailed ? "text-stone-600" : "font-medium text-copper-deep"}>
                      {q.viewed
                        ? "They opened it. No price yet."
                        : q.emailed
                          ? "Emailed. Waiting for their price."
                          : "Not sent yet. Text them the link."}
                    </span>
                  </p>
                )}
                {q.status === "DECLINED" && (
                  <p className="mt-0.5 text-sm text-stone-500">Cannot take this one.</p>
                )}
                {q.status === "NOT_CHOSEN" && (
                  <p className="mt-0.5 text-sm text-stone-500">
                    {hasPrice ? "Not chosen." : "Did not answer in time."}
                  </p>
                )}
                {hasPrice && q.availability && !muted && (
                  <p className="mt-0.5 text-stone-700">Can come: {q.availability}</p>
                )}
                {hasPrice && q.note && !muted && (
                  <p className="mt-0.5 whitespace-pre-wrap text-stone-600">{q.note}</p>
                )}
                {q.status === "APPROVED" && (
                  <p className="mt-1 text-sm text-stone-600">
                    {q.autoApproved
                      ? "Approved by the limit you set for them."
                      : "You said yes to this price."}
                    {(tel || q.email) && (
                      <>
                        {" To set the time, "}
                        {tel && (
                          <a href={`tel:${tel}`} className="font-medium text-patina underline">
                            call {q.phone}
                          </a>
                        )}
                        {tel && q.email ? " or " : ""}
                        {q.email && (
                          <a href={`mailto:${q.email}`} className="font-medium text-patina underline">
                            email them
                          </a>
                        )}
                        .
                      </>
                    )}
                  </p>
                )}

                {open && (q.status === "QUOTED" || q.status === "SENT") && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {q.status === "QUOTED" && (
                      <button
                        onClick={() => void approve(q)}
                        disabled={busy !== null}
                        className={buttonCls(
                          q.id === lowestId || priced.length === 1 ? "accent" : "secondary",
                          "sm",
                        )}
                      >
                        {busy === `approve:${q.id}` ? "Saying yes…" : `Say yes to ${price}`}
                      </button>
                    )}
                    {q.status === "SENT" && issued?.quoteId !== q.id && (
                      <button
                        onClick={() => void getLink(q)}
                        disabled={busy !== null}
                        className={buttonCls(q.emailed ? "ghost" : "secondary", "sm")}
                      >
                        {busy === `link:${q.id}`
                          ? "Getting the link…"
                          : q.emailed
                            ? "Text them the link too"
                            : "Text them the link"}
                      </button>
                    )}
                  </div>
                )}

                {issued?.quoteId === q.id && (
                  <div className="mt-3 rounded-xl border border-patina bg-patina-tint/50 p-4">
                    <p className="font-medium text-stone-900">A message for {issued.name}</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-700">
                      {issued.text}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {issued.phone && phoneHref(issued.phone) && (
                        <a
                          href={`sms:${phoneHref(issued.phone)}?&body=${encodeURIComponent(issued.text)}`}
                          className={buttonCls("primary", "sm")}
                        >
                          Open in my messages
                        </a>
                      )}
                      <button
                        onClick={() => void copy(issued.text)}
                        className={buttonCls("secondary", "sm")}
                      >
                        Copy the message
                      </button>
                      <button onClick={() => setIssued(null)} className={buttonCls("ghost", "sm")}>
                        Done
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-stone-500">
                      It goes from your own number, so they know it is you. This link replaces any
                      earlier one.
                    </p>
                  </div>
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

      {quotes.length > 0 && open && canAsk.length > 0 && (
        <div className="mt-1 border-t border-stone-100 pt-4">
          <button
            onClick={() => void ask()}
            disabled={busy !== null}
            className={buttonCls("secondary", "sm")}
          >
            {busy === "ask" ? "Asking…" : `Ask ${names(canAsk)} too`}
          </button>
        </div>
      )}

      {priced.length > 0 && open && (
        <p className="mt-3 text-sm text-stone-500">
          Saying yes tells them to go ahead at that price. You pay them the way you always do.
        </p>
      )}
    </div>
  );
}
