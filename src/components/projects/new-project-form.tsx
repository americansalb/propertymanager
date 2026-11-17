"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { OPEN_TRADES } from "@/lib/projects";
import { TRADE_LABEL, type Trade } from "@/lib/quotes";
import { buttonCls, inputCls } from "@/components/ui";

type Place = { id: string; name: string; units: Array<{ id: string; label: string }> };

const label = "mb-1 block text-sm font-medium text-stone-700";

/** Post a project to nearby pros, or open a tenant's repair to them. */
export function NewProjectForm({
  places,
  repair,
}: {
  places: Place[];
  repair: { id: string; title: string; description: string; where: string; trade: string } | null;
}) {
  const router = useRouter();
  const id = useId();
  const [propertyId, setPropertyId] = useState(places[0]?.id ?? "");
  const [unitId, setUnitId] = useState("");
  const [trade, setTrade] = useState<string>(repair?.trade ?? "HANDYMAN");
  const [title, setTitle] = useState(repair?.title ?? "");
  const [description, setDescription] = useState(repair?.description ?? "");
  const [bidDays, setBidDays] = useState(3);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const units = places.find((p) => p.id === propertyId)?.units ?? [];

  async function post() {
    if (!repair && !propertyId) return setError("Pick the property.");
    if (title.trim().length < 3) return setError("Say what needs doing in a few words.");
    if (description.trim().length < 5) return setError("Add a little more about the job.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/v1/landlord/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        repair
          ? { repairId: repair.id, trade, title, description, bidDays }
          : { propertyId, unitId: unitId || null, trade, title, description, bidDays },
      ),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
    if (!res.ok || !data.id) {
      setBusy(false);
      setError(data.error ?? "Something went wrong. Nothing was posted.");
      return;
    }
    router.push(`/landlord/projects/${data.id}`);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      {repair ? (
        <div className="rounded-xl bg-stone-50 p-4">
          <p className="text-sm text-stone-500">From the repair at {repair.where}</p>
          <p className="mt-0.5 font-semibold text-stone-900">{repair.title}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${id}-p`} className={label}>
              Property
            </label>
            <select
              id={`${id}-p`}
              value={propertyId}
              onChange={(e) => {
                setPropertyId(e.target.value);
                setUnitId("");
              }}
              className={inputCls}
            >
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {units.length > 1 && (
            <div>
              <label htmlFor={`${id}-u`} className={label}>
                Unit <span className="font-normal text-stone-500">(if it is for one)</span>
              </label>
              <select id={`${id}-u`} value={unitId} onChange={(e) => setUnitId(e.target.value)} className={inputCls}>
                <option value="">The whole building</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <fieldset>
        <legend className={label}>Kind of work</legend>
        <div className="flex flex-wrap gap-2">
          {OPEN_TRADES.map((t) => {
            const on = trade === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTrade(t)}
                aria-pressed={on}
                className={`inline-flex min-h-10 items-center rounded-full border px-4 text-[15px] font-medium transition ${
                  on ? "border-patina bg-patina-tint text-stone-900" : "border-stone-300 bg-white text-stone-700 hover:border-patina"
                }`}
              >
                {on ? "✓ " : ""}
                {TRADE_LABEL[t as Trade]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-sm text-stone-500">
          Plumbing, electrical, heating and roofs need a licensed pro, so they go to your own people.
        </p>
      </fieldset>

      <div>
        <label htmlFor={`${id}-t`} className={label}>
          What needs doing
        </label>
        <input id={`${id}-t`} value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} placeholder="Turnover: patch, paint and clean a 2-bedroom" className={inputCls} />
      </div>
      <div>
        <label htmlFor={`${id}-d`} className={label}>
          Details
        </label>
        <textarea
          id={`${id}-d`}
          value={description}
          onChange={(e) => { setDescription(e.target.value); setError(null); }}
          rows={4}
          placeholder="Tenant moved out Friday. Nail holes in every room, scuffed hallway, oven needs a deep clean. Needs to be ready by the 1st."
          className={`${inputCls} resize-none`}
        />
        <p className="mt-1 text-sm text-stone-500">Pros see the neighborhood, never the street address, until you pick one.</p>
      </div>

      <div className="max-w-[16rem]">
        <label htmlFor={`${id}-days`} className={label}>
          Take bids for
        </label>
        <select id={`${id}-days`} value={bidDays} onChange={(e) => setBidDays(Number(e.target.value))} className={inputCls}>
          <option value={1}>1 day</option>
          <option value={3}>3 days</option>
          <option value={7}>A week</option>
        </select>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
      <button onClick={() => void post()} disabled={busy} className={`${buttonCls("accent")} min-h-12`}>
        {busy ? "Posting…" : "Post it to nearby pros"}
      </button>
    </div>
  );
}
