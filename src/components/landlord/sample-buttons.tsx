"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { buttonCls } from "@/components/ui";

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
    <button onClick={create} disabled={busy} className={buttonCls("ghost")}>
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
    <button onClick={remove} disabled={busy} className={buttonCls("secondary", "sm")}>
      {busy ? "Removing…" : "Remove sample"}
    </button>
  );
}
