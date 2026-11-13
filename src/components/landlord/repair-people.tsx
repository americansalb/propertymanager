"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { formatCents } from "@/lib/money";
import { TRADES, TRADE_LABEL, type Trade } from "@/lib/quotes";
import { Section, buttonCls, inputCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import { IconPlus } from "@/components/icons";

export type PersonView = {
  id: string;
  name: string;
  trades: string[];
  phone: string | null;
  email: string | null;
  notes: string | null;
  autoApproveCents: number | null;
  jobsWon: number;
};

const label = "mb-1 block text-sm font-medium text-stone-700";
const hint = "font-normal text-stone-500";

function tradeLine(trades: string[]): string {
  return trades.map((t) => TRADE_LABEL[t as Trade] ?? t).join(", ");
}

/** One form for adding a person and for changing one. */
function PersonForm({
  person,
  onDone,
}: {
  person?: PersonView;
  onDone: () => void;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const id = useId();
  const [name, setName] = useState(person?.name ?? "");
  const [trades, setTrades] = useState<string[]>(person?.trades ?? []);
  const [phone, setPhone] = useState(person?.phone ?? "");
  const [email, setEmail] = useState(person?.email ?? "");
  const [limit, setLimit] = useState(
    person?.autoApproveCents != null ? (person.autoApproveCents / 100).toString() : "",
  );
  const [notes, setNotes] = useState(person?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(t: string) {
    setError(null);
    setTrades((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  }

  async function save() {
    if (name.trim() === "") return setError("Enter their name or their business name.");
    if (trades.length === 0) return setError("Pick what they do.");
    if (phone.trim() === "" && email.trim() === "") {
      return setError("Add a phone number or an email, so they can be reached.");
    }
    setBusy(true);
    setError(null);
    const res = await fetch(
      person ? `/api/v1/landlord/contractors/${person.id}` : "/api/v1/landlord/contractors",
      {
        method: person ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          trades,
          phone,
          email,
          notes,
          autoApproveDollars: limit.trim() === "" ? null : limit,
        }),
      },
    );
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong. Nothing was saved.");
      return;
    }
    toast(person ? "Saved." : `${name.trim()} is on your list.`);
    onDone();
    router.refresh();
  }

  async function remove() {
    if (!person) return;
    const res = await fetch(`/api/v1/landlord/contractors/${person.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Couldn't remove them. Try again.", "bad");
      return;
    }
    toast(`${person.name} is off your list.`);
    onDone();
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
      <p className="font-semibold text-stone-900">
        {person ? `Change ${person.name}` : "Add a repair person"}
      </p>

      <div className="mt-3 space-y-4">
        <div>
          <label htmlFor={`${id}-name`} className={label}>
            Name or business
          </label>
          <input
            id={`${id}-name`}
            autoFocus={!person}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
            placeholder="Mike's Plumbing"
            className={inputCls}
          />
        </div>

        <fieldset>
          <legend className={label}>
            What do they do? <span className={hint}>(pick any)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {TRADES.map((t) => {
              const on = trades.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggle(t)}
                  aria-pressed={on}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-medium transition ${
                    on
                      ? "border-patina bg-patina-tint text-stone-900"
                      : "border-stone-300 bg-white text-stone-700 hover:border-patina"
                  }`}
                >
                  {on ? "✓ " : ""}
                  {TRADE_LABEL[t]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-phone`} className={label}>
              Phone
            </label>
            <input
              id={`${id}-phone`}
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              placeholder="(312) 555-0142"
              autoComplete="off"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor={`${id}-email`} className={label}>
              Email
            </label>
            <input
              id={`${id}-email`}
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="mike@example.com"
              autoComplete="off"
              className={inputCls}
            />
          </div>
        </div>
        <p className="-mt-2 text-sm text-stone-500">
          With an email, they are asked for a price by themselves. With only a phone number, you
          text them the link.
        </p>

        <div>
          <label htmlFor={`${id}-limit`} className={label}>
            Say yes without asking me, up to <span className={hint}>(if you like)</span>
          </label>
          <div className="relative max-w-[14rem]">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-stone-500">
              $
            </span>
            <input
              id={`${id}-limit`}
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              inputMode="decimal"
              placeholder="300"
              className={`${inputCls} pl-8`}
            />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Leave it empty and you approve every price yourself.
          </p>
        </div>

        <div>
          <label htmlFor={`${id}-notes`} className={label}>
            Notes <span className={hint}>(only you see these)</span>
          </label>
          <input
            id={`${id}-notes`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Did the boiler in 2024. Fast, fair."
            className={inputCls}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button onClick={() => void save()} disabled={busy} className={buttonCls("primary")}>
            {busy ? "Saving…" : person ? "Save" : "Add to my list"}
          </button>
          <button onClick={onDone} disabled={busy} className={buttonCls("ghost")}>
            Cancel
          </button>
        </div>
        {person && (
          <ConfirmButton
            onConfirm={remove}
            confirmLabel="Yes, remove"
            className="min-h-9 rounded-lg px-3 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-700"
          >
            Remove from my list
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}

/** One person: what they do, how to reach them, and whether a limit says yes for the owner. */
function PersonRow({ person, onEdit }: { person: PersonView; onEdit: () => void }) {
  const reach = [person.phone, person.email].filter(Boolean).join(" · ");
  return (
    <button
      onClick={onEdit}
      className="group -mx-3 flex min-h-16 w-[calc(100%+1.5rem)] items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-stone-50 focus-visible:bg-stone-50"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-stone-900">{person.name}</span>
        <span className="mt-0.5 block break-words text-sm text-stone-600">
          {tradeLine(person.trades)}
          {reach ? ` · ${reach}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm">
        {person.autoApproveCents != null ? (
          <span className="flex items-center gap-2 text-stone-700">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-patina" />
            Yes up to {formatCents(person.autoApproveCents)}
          </span>
        ) : (
          <span className="text-stone-500">Asks you first</span>
        )}
      </span>
      <span className="shrink-0 text-sm font-medium text-patina underline">Change</span>
    </button>
  );
}

export function RepairPeople({
  people,
  autoAsk,
}: {
  people: PersonView[];
  autoAsk: boolean;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  // "new" opens the add form; an id opens that person's form.
  const [open, setOpen] = useState<string | null>(null);
  const [auto, setAuto] = useState(autoAsk);
  const [busy, setBusy] = useState(false);

  async function toggleAuto() {
    const next = !auto;
    setAuto(next);
    setBusy(true);
    const res = await fetch("/api/v1/landlord/quote-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoAskQuotes: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setAuto(!next);
      toast("Couldn't save that. Try again.", "bad");
      return;
    }
    toast(next ? "They will be asked automatically." : "You will ask them yourself.");
    router.refresh();
  }

  if (people.length === 0 && open !== "new") {
    return (
      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8">
        <p className="text-xl font-semibold tracking-tight text-stone-900">
          Add the people you already call
        </p>
        <p className="mt-1 text-stone-600">
          Your plumber, your locksmith, your handyman. The next time a tenant reports a problem,
          the ones who fit are asked for a price, and their answers line up for you to compare.
        </p>
        <button onClick={() => setOpen("new")} className={`${buttonCls("accent")} mt-5`}>
          Add your first repair person
        </button>
      </section>
    );
  }

  return (
    <>
      <Section
        title={people.length === 1 ? "1 person" : `${people.length} people`}
        aside={
          open !== "new" ? (
            <button onClick={() => setOpen("new")} className={buttonCls("secondary", "sm")}>
              <IconPlus className="h-3.5 w-3.5" /> Add a person
            </button>
          ) : null
        }
      >
        {open === "new" && (
          <div className="mb-3">
            <PersonForm onDone={() => setOpen(null)} />
          </div>
        )}
        <ul className="divide-y divide-stone-100">
          {people.map((p) => (
            <li key={p.id}>
              {open === p.id ? (
                <div className="py-3">
                  <PersonForm person={p} onDone={() => setOpen(null)} />
                </div>
              ) : (
                <PersonRow person={p} onEdit={() => setOpen(p.id)} />
              )}
            </li>
          ))}
        </ul>
      </Section>

      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-base font-semibold text-stone-900">Ask them automatically</p>
            <p className="mt-0.5 text-sm text-stone-600">
              {auto
                ? "When a tenant reports a problem, the people who fit are asked for a price right away."
                : "Nobody is asked until you press the button on the repair."}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={auto}
            aria-label="Ask them automatically"
            onClick={() => void toggleAuto()}
            disabled={busy}
            className={`relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 ${
              auto ? "bg-patina" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                auto ? "left-7" : "left-1"
              }`}
            />
          </button>
        </div>
      </section>
    </>
  );
}
