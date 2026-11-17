"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { formatCents } from "@/lib/money";
import { LICENSED_TRADES, priceLine, tasksForTrades } from "@/lib/pro-catalog";
import { TRADES, TRADE_LABEL, type Trade } from "@/lib/quotes";
import { STATE_CODES } from "@/lib/validation/property";
import { Section, StepMark, buttonCls } from "@/components/ui";
import { useToast } from "@/components/ui-feedback";
import { EditableRow, useRowPatch } from "@/components/ui-inline";

export type ProPageData = {
  businessName: string;
  firstName: string;
  email: string;
  emailConfirmed: boolean;
  bio: string | null;
  trades: string[];
  hourlyRateCents: number | null;
  tripChargeCents: number | null;
  licenseNumber: string | null;
  licenseState: string | null;
  zips: string[];
  prices: Array<{ taskKey: string; fromCents: number }>;
  published: boolean;
  publicUrl: string | null;
  missing: string[];
  listedBy: number;
  jobsApproved: number;
};

const dollars = (c: number | null) => (c != null ? (c / 100).toString() : null);

/** The order a new pro sets things up in, with what each step needs. */
const STEPS: Array<{ need: string; done: (d: ProPageData) => boolean }> = [
  { need: "Confirm your email", done: (d) => d.emailConfirmed },
  { need: "Pick what you do", done: (d) => d.trades.length > 0 },
  { need: "Add at least one price", done: (d) => d.prices.length > 0 || d.hourlyRateCents != null },
  { need: "Add the ZIP codes you work in", done: (d) => d.zips.length > 0 },
];

export function ProPageEditor({ data }: { data: ProPageData }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const patch = useRowPatch("/api/v1/pro/page");
  const [trades, setTrades] = useState<string[]>(data.trades);
  const [busy, setBusy] = useState<string | null>(null);

  const savePrice = useCallback(
    async (taskKey: string, v: string | string[] | null): Promise<boolean> => {
      const res = await fetch("/api/v1/pro/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskKey, fromDollars: typeof v === "string" ? v : null }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        toast(body.error ?? "That price did not save.", "bad");
        return false;
      }
      router.refresh();
      return true;
    },
    [router, toast],
  );

  async function toggleTrade(t: string) {
    const next = trades.includes(t) ? trades.filter((x) => x !== t) : [...trades, t];
    setTrades(next);
    const ok = await patch({ trades: next });
    if (!ok) setTrades(trades);
  }

  async function resend() {
    setBusy("email");
    const res = await fetch("/api/v1/auth/confirm-email", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { error?: string; already?: boolean };
    setBusy(null);
    if (!res.ok) return toast(body.error ?? "Couldn't send it. Try again.", "bad");
    toast(body.already ? "Your email is already confirmed." : `Sent to ${data.email}.`);
    router.refresh();
  }

  async function publish(on: boolean) {
    setBusy("publish");
    const res = await fetch("/api/v1/pro/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish: on }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!res.ok) return toast(body.error ?? "Something went wrong.", "bad");
    toast(on ? "Your page is live." : "Your page is hidden.");
    router.refresh();
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied.");
    } catch {
      toast("Couldn't copy. Select the link and copy it by hand.", "bad");
    }
  }

  const priced = new Map(data.prices.map((p) => [p.taskKey, p.fromCents]));
  const tasks = tasksForTrades(trades);
  const licensed = trades.some((t) => LICENSED_TRADES.has(t));
  const left = data.missing.length;

  return (
    <div>
      <p className="text-sm text-stone-500">Hello, {data.firstName}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
        {data.published
          ? "Your page is live"
          : left === 0
            ? "Your page is ready to go live"
            : left === 1
              ? "1 step until your page goes live"
              : `${left} steps until your page goes live`}
      </h1>
      <p className="mt-1 text-stone-600">
        Owners see what you do, what you charge and where you work, before they ask.
      </p>

      {/* The answer: where the page stands, and the one next step */}
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        {data.published && data.publicUrl ? (
          <div>
            <p className="text-sm text-stone-500">Your page</p>
            <p className="mt-0.5 break-all text-lg font-semibold text-stone-900">{data.publicUrl}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href={data.publicUrl} target="_blank" rel="noreferrer" className={buttonCls("primary")}>
                See it as owners do
              </a>
              <button onClick={() => void copy(data.publicUrl!)} className={buttonCls("secondary")}>
                Copy the link
              </button>
              <button
                onClick={() => void publish(false)}
                disabled={busy !== null}
                className={buttonCls("ghost")}
              >
                Hide my page
              </button>
            </div>
            <p className="mt-3 text-sm text-stone-500">
              Put the link on your truck, your cards and your texts. Owners who add you see your
              phone and email.
            </p>
          </div>
        ) : (
          <div>
            <ol className="space-y-3">
              {STEPS.map((s) => (
                <li key={s.need} className="flex items-center gap-3">
                  <StepMark done={s.done({ ...data, trades })} />
                  <span className={s.done({ ...data, trades }) ? "text-stone-500" : "font-medium text-stone-900"}>
                    {s.need}
                  </span>
                </li>
              ))}
            </ol>
            <button
              onClick={() => void publish(true)}
              disabled={left > 0 || busy !== null}
              className={`${buttonCls("accent")} mt-5`}
            >
              {busy === "publish" ? "Going live…" : "Make my page public"}
            </button>
            {left === 0 && (
              <p className="mt-3 text-sm text-stone-500">
                Owners who add you to their repair people will see your phone and email.
              </p>
            )}
          </div>
        )}
      </section>

      {!data.emailConfirmed && (
        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-copper/40 bg-copper-tint p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="font-semibold text-stone-900">Confirm your email</p>
            <p className="mt-0.5 break-words text-stone-700">
              We sent a link to {data.email}. Open it and this step is done.
            </p>
          </div>
          <button
            onClick={() => void resend()}
            disabled={busy !== null}
            className={`${buttonCls("secondary")} shrink-0 bg-white`}
          >
            {busy === "email" ? "Sending…" : "Send it again"}
          </button>
        </section>
      )}

      <Section title="What you do" hint="Pick every kind of work you take.">
        <div className="flex flex-wrap gap-2 pt-1">
          {TRADES.filter((t) => t !== "OTHER").map((t) => {
            const on = trades.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => void toggleTrade(t)}
                aria-pressed={on}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-[15px] font-medium transition ${
                  on
                    ? "border-patina bg-patina-tint text-stone-900"
                    : "border-stone-300 bg-white text-stone-700 hover:border-patina"
                }`}
              >
                {on ? "✓ " : ""}
                {TRADE_LABEL[t as Trade]}
              </button>
            );
          })}
        </div>
      </Section>

      <Section
        title="Your prices"
        hint="Starting prices. Owners see them on your page before they ask you."
      >
        <EditableRow
          label="Hourly rate"
          value={dollars(data.hourlyRateCents)}
          display={data.hourlyRateCents != null ? `${formatCents(data.hourlyRateCents)} an hour` : null}
          emptyPrompt="What you charge an hour"
          kind={{ kind: "money", placeholder: "65" }}
          onSave={(v) => patch({ hourlyRateDollars: v })}
          savedToast="Saved."
        />
        <EditableRow
          label="Trip charge"
          value={dollars(data.tripChargeCents)}
          display={
            data.tripChargeCents === 0
              ? "None"
              : data.tripChargeCents != null
                ? formatCents(data.tripChargeCents)
                : null
          }
          emptyPrompt="Charge for coming out. Enter 0 if none."
          kind={{ kind: "money", placeholder: "40" }}
          onSave={(v) => patch({ tripChargeDollars: v })}
          savedToast="Saved."
        />
        {tasks.length === 0 ? (
          <p className="pt-3 text-stone-600">Pick what you do above, and the jobs to price show up here.</p>
        ) : (
          tasks.map((t) => (
            <EditableRow
              key={t.key}
              label={t.label}
              value={dollars(priced.get(t.key) ?? null)}
              display={priced.has(t.key) ? priceLine(priced.get(t.key)!, t.unit) : null}
              emptyPrompt="Add your starting price"
              kind={{ kind: "money", placeholder: "120" }}
              onSave={(v) => savePrice(t.key, v)}
              savedToast="Price saved."
            />
          ))
        )}
      </Section>

      <Section title="Where you work">
        <EditableRow
          label="ZIP codes"
          value={data.zips.length > 0 ? data.zips.join(", ") : null}
          emptyPrompt="The ZIP codes you take jobs in"
          kind={{ kind: "text", placeholder: "60657, 60614, 60613" }}
          onSave={(v) => patch({ zips: typeof v === "string" ? v : "" })}
          savedToast="Saved."
        />
      </Section>

      <Section title="About you">
        <EditableRow
          label="Business name"
          value={data.businessName}
          emptyPrompt="Your business name"
          kind={{ kind: "text", placeholder: "Sam's Repairs" }}
          onSave={(v) => patch({ businessName: v })}
          savedToast="Saved."
          required
        />
        <EditableRow
          label="About"
          value={data.bio}
          emptyPrompt="A line or two owners read first"
          kind={{ kind: "text", rows: 3, placeholder: "Fifteen years fixing rentals on the North Side. Same-week turnovers." }}
          onSave={(v) => patch({ bio: v })}
          savedToast="Saved."
        />
        {licensed && (
          <>
            <EditableRow
              label="License number"
              value={data.licenseNumber}
              emptyPrompt="Your state license number"
              kind={{ kind: "text", placeholder: "055-123456" }}
              onSave={(v) => patch({ licenseNumber: v })}
              savedToast="Saved."
            />
            <EditableRow
              label="License state"
              value={data.licenseState}
              emptyPrompt="The state that issued it"
              kind={{
                kind: "select",
                options: [{ value: "", label: "Pick a state" }, ...STATE_CODES.map((s) => ({ value: s, label: s }))],
              }}
              onSave={(v) => patch({ licenseState: v })}
              savedToast="Saved."
            />
          </>
        )}
      </Section>

      <Section title="What owners see about you" hint="Facts the system keeps by itself. You cannot edit them.">
        <dl className="divide-y divide-stone-100">
          <Fact label="Email" value={data.emailConfirmed ? "Confirmed" : "Not confirmed yet"} />
          <Fact
            label="On owners' lists"
            value={
              data.listedBy === 0
                ? "No owner has added you yet"
                : data.listedBy === 1
                  ? "1 owner keeps you on their repair list"
                  : `${data.listedBy} owners keep you on their repair lists`
            }
          />
          <Fact
            label="Jobs here"
            value={data.jobsApproved === 1 ? "1 job approved" : `${data.jobsApproved} jobs approved`}
          />
        </dl>
      </Section>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-x-4">
      <dt className="text-sm leading-6 text-stone-500">{label}</dt>
      <dd className="text-base font-medium leading-6 text-stone-900">{value}</dd>
    </div>
  );
}
