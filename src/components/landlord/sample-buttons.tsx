"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Loads the sample duplex and refreshes: the dashboard lights up in place. */
export function CreateSampleButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/v1/landlord/sample", { method: "POST" });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <button
      onClick={create}
      disabled={busy}
      className="rounded-lg px-4 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700 disabled:opacity-50"
    >
      {busy ? "Setting up…" : "or explore with a sample duplex"}
    </button>
  );
}

export function RemoveSampleButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    const res = await fetch(`/api/v1/landlord/properties/${propertyId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
    else setBusy(false);
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:border-stone-400 disabled:opacity-50"
    >
      {busy ? "Removing…" : "Remove sample"}
    </button>
  );
}
