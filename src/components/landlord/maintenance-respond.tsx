"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonCls } from "@/components/ui";
import { MAINT_ACTION_LABEL, MAINT_LANDLORD_STATUSES } from "@/lib/validation/maintenance";

const noteCls =
  "w-full resize-none rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder-stone-400 focus:border-patina focus:outline-none focus:ring-1 focus:ring-patina";

type LandlordStatus = (typeof MAINT_LANDLORD_STATUSES)[number];

/**
 * Landlord's reply on a request: an optional note plus the status actions.
 * A status button sends that status (carrying any note); "Send note only"
 * posts the note without changing status. Either way the tenant is notified.
 */
export function MaintenanceRespond({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(toStatus?: LandlordStatus) {
    setBusy(toStatus ?? "note");
    setError(null);
    const res = await fetch(`/api/v1/landlord/maintenance/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toStatus, note: note.trim() || undefined }),
    });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong.");
      return;
    }
    setNote("");
    router.refresh();
  }

  const actions = MAINT_LANDLORD_STATUSES.filter((s) => s !== currentStatus);

  return (
    <div className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setError(null);
        }}
        placeholder="Write a note to the tenant (optional)"
        aria-label="Note to tenant"
        rows={3}
        className={noteCls}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {actions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy !== null}
            onClick={() => send(s)}
            className={`${buttonCls(
              s === "CANCELLED" ? "danger" : s === "RESOLVED" ? "primary" : "secondary",
              "sm",
            )} disabled:opacity-50`}
          >
            {busy === s ? "Saving…" : MAINT_ACTION_LABEL[s]}
          </button>
        ))}
        <button
          type="button"
          disabled={busy !== null || note.trim().length === 0}
          onClick={() => send(undefined)}
          className={`${buttonCls("ghost", "sm")} disabled:opacity-40`}
        >
          {busy === "note" ? "Sending…" : "Send note only"}
        </button>
      </div>
    </div>
  );
}
