"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { buttonCls } from "@/components/ui";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import {
  MAINT_LANDLORD_STATUSES,
  MAINT_STAGE_HELP,
  MAINT_STATUS_LABEL_LANDLORD,
} from "@/lib/validation/maintenance";

type LandlordStatus = (typeof MAINT_LANDLORD_STATUSES)[number];

/** The stages in the order a repair moves through them. */
const STAGES = ["SUBMITTED", "ACKNOWLEDGED", "SCHEDULED", "IN_PROGRESS", "RESOLVED"] as const;

/**
 * One update, one button: say where the repair stands, add a note if you
 * like, send. The tenant is told either way.
 */
export function MaintenanceRespond({
  requestId,
  currentStatus,
  tenantFirstName,
}: {
  requestId: string;
  currentStatus: string;
  tenantFirstName: string | null;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const noteId = useId();
  const group = useId();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const who = tenantFirstName ?? "the tenant";
  const changed = status !== currentStatus;
  const canSend = changed || note.trim().length > 0;
  // "New" can be where it stands, but nobody moves a repair back to it.
  const stages = STAGES.filter((s) => s !== "SUBMITTED" || currentStatus === "SUBMITTED");

  async function send(toStatus: LandlordStatus | undefined) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/v1/landlord/maintenance/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus, note: note.trim() || undefined }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong. Nothing was sent.");
      return;
    }
    setNote("");
    toast(`Sent to ${who}.`);
    router.refresh();
  }

  return (
    <div>
      <fieldset>
        <legend className="text-sm text-stone-500">Where does this stand?</legend>
        <div className="mt-2 space-y-2">
          {stages.map((s) => {
            const picked = status === s;
            return (
              <label
                key={s}
                className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                  picked
                    ? "border-patina bg-patina-tint/50"
                    : "border-stone-200 bg-white hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  name={group}
                  value={s}
                  checked={picked}
                  onChange={() => {
                    setStatus(s);
                    setError(null);
                  }}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#2f6353]"
                />
                <span className="min-w-0">
                  <span className="block text-base font-medium text-stone-900">
                    {MAINT_STATUS_LABEL_LANDLORD[s]}
                    {s === currentStatus && (
                      <span className="ml-2 text-sm font-normal text-stone-500">now</span>
                    )}
                  </span>
                  <span className="block text-sm text-stone-500">{MAINT_STAGE_HELP[s]}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <label htmlFor={noteId} className="mt-5 block text-sm font-medium text-stone-700">
        Note for {who} <span className="font-normal text-stone-500">(if you like)</span>
      </label>
      <textarea
        id={noteId}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setError(null);
        }}
        placeholder="The plumber is coming Tuesday between 9 and 11."
        rows={3}
        className="mt-1 w-full resize-none rounded-xl border border-stone-300 bg-white px-3.5 py-3 text-base text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-2 focus:ring-patina/25"
      />

      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={busy || !canSend}
          onClick={() => void send(changed ? (status as LandlordStatus) : undefined)}
          className={buttonCls("primary")}
        >
          {busy ? "Sending…" : changed ? "Send update" : "Send note"}
        </button>
        {currentStatus !== "CANCELLED" && (
          <ConfirmButton
            onConfirm={() => send("CANCELLED")}
            confirmLabel="Yes, cancel it"
            className="min-h-9 rounded-lg px-3 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-700"
          >
            Cancel this request
          </ConfirmButton>
        )}
      </div>
      <p className="mt-3 text-sm text-stone-500">
        {tenantFirstName ?? "The tenant"} is told about every update.
      </p>
    </div>
  );
}
