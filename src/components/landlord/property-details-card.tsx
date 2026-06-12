"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, buttonCls, inputCls } from "@/components/ui";

export type DetailsView = {
  yearBuilt: number | null;
  parkingNotes: string | null;
  waterShutoffLocation: string | null;
  breakerPanelLocation: string | null;
  /** Already decrypted for this org member, or null. */
  accessCodes: string | null;
  accessLocked: boolean;
  petsAllowed: boolean | null;
  petNotes: string | null;
  notes: string | null;
  tags: string[];
};

const labelCls = "text-xs font-semibold uppercase tracking-wide text-stone-400";

/** Progressive profiling: every empty field explains why it's worth filling. */
const PROMPTS: Record<string, string> = {
  yearBuilt: "When was it built? Pros quote blind without it.",
  parkingNotes: "Street, garage, permit zone? Pros need to know where to park the van.",
  waterShutoffLocation: "Your plumber's first question in an emergency.",
  breakerPanelLocation: "The first thing any electrician asks.",
  accessCodes: "Lockbox or gate codes, encrypted at rest, shared per job only.",
  pets: "Pets on site change who takes the job and how they enter.",
};

export function PropertyDetailsCard({
  propertyId,
  details,
}: {
  propertyId: string;
  details: DetailsView;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCodes, setShowCodes] = useState(false);
  const [form, setForm] = useState({
    yearBuilt: details.yearBuilt?.toString() ?? "",
    parkingNotes: details.parkingNotes ?? "",
    waterShutoffLocation: details.waterShutoffLocation ?? "",
    breakerPanelLocation: details.breakerPanelLocation ?? "",
    accessCodes: details.accessCodes ?? "",
    petsAllowed: details.petsAllowed === null ? "unset" : details.petsAllowed ? "yes" : "no",
    petNotes: details.petNotes ?? "",
    notes: details.notes ?? "",
    tags: details.tags.join(", "),
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/landlord/properties/${propertyId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        yearBuilt: form.yearBuilt.trim(),
        parkingNotes: form.parkingNotes,
        waterShutoffLocation: form.waterShutoffLocation,
        breakerPanelLocation: form.breakerPanelLocation,
        accessCodes: form.accessCodes,
        petsAllowed: form.petsAllowed,
        petNotes: form.petNotes,
        notes: form.notes,
        tags: form.tags.split(","),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const rows: Array<{ label: string; value: string | null; prompt: string }> = [
    { label: "Year built", value: details.yearBuilt?.toString() ?? null, prompt: PROMPTS.yearBuilt! },
    { label: "Parking", value: details.parkingNotes, prompt: PROMPTS.parkingNotes! },
    {
      label: "Water shutoff",
      value: details.waterShutoffLocation,
      prompt: PROMPTS.waterShutoffLocation!,
    },
    {
      label: "Breaker panel",
      value: details.breakerPanelLocation,
      prompt: PROMPTS.breakerPanelLocation!,
    },
    {
      label: "Pets",
      value:
        details.petsAllowed === null
          ? null
          : `${details.petsAllowed ? "Allowed" : "Not allowed"}${details.petNotes ? ` · ${details.petNotes}` : ""}`,
      prompt: PROMPTS.pets!,
    },
  ];

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-900">Details &amp; access</h2>
        {!editing && (
          <button onClick={() => setEditing(true)} className={buttonCls("secondary", "sm")}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Year built</label>
              <input value={form.yearBuilt} onChange={(e) => set("yearBuilt", e.target.value)} inputMode="numeric" placeholder="1924" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Pets</label>
              <select value={form.petsAllowed} onChange={(e) => set("petsAllowed", e.target.value)} className={inputCls}>
                <option value="unset">Not decided</option>
                <option value="yes">Allowed</option>
                <option value="no">Not allowed</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Pet notes</label>
            <input value={form.petNotes} onChange={(e) => set("petNotes", e.target.value)} placeholder="Cats ok, dogs under 30 lbs" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Parking</label>
            <input value={form.parkingNotes} onChange={(e) => set("parkingNotes", e.target.value)} placeholder="Permit zone 383; visitor spot behind the building" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Water shutoff</label>
            <input value={form.waterShutoffLocation} onChange={(e) => set("waterShutoffLocation", e.target.value)} placeholder="Basement, NE corner by the meter" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Breaker panel</label>
            <input value={form.breakerPanelLocation} onChange={(e) => set("breakerPanelLocation", e.target.value)} placeholder="Rear stairwell, gray box" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Access codes (encrypted)</label>
            <input value={form.accessCodes} onChange={(e) => set("accessCodes", e.target.value)} placeholder="Lockbox 4417; gate #2290" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} placeholder="Anything the next person at the door should know" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tags (comma separated)</label>
            <input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="Lakeview, LLC-A, Section 8" className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={busy} className={buttonCls("primary", "sm")}>
              {busy ? "Saving…" : "Save details"}
            </button>
            <button onClick={() => setEditing(false)} disabled={busy} className={buttonCls("ghost", "sm")}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <dl className="space-y-3">
            {rows.map((r) => (
              <div key={r.label} className="flex items-baseline justify-between gap-4">
                <dt className={labelCls}>{r.label}</dt>
                <dd className={`text-right text-sm ${r.value ? "text-stone-800" : "text-stone-400"}`}>
                  {r.value ?? r.prompt}
                </dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4">
              <dt className={labelCls}>Access codes</dt>
              <dd className="text-right text-sm">
                {details.accessLocked ? (
                  <span className="text-amber-700">Stored, but the encryption key changed.</span>
                ) : details.accessCodes ? (
                  <button
                    onClick={() => setShowCodes((s) => !s)}
                    className="font-medium text-copper-deep hover:underline"
                  >
                    {showCodes ? details.accessCodes : "•••••• (tap to reveal)"}
                  </button>
                ) : (
                  <span className="text-stone-400">{PROMPTS.accessCodes}</span>
                )}
              </dd>
            </div>
          </dl>

          {details.notes && (
            <p className="mt-4 border-t border-stone-100 pt-3 text-sm leading-6 text-stone-600">
              {details.notes}
            </p>
          )}
          {details.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {details.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
