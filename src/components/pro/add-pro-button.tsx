"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonCls } from "@/components/ui";

/** For a signed-in owner: put this pro on their own repair people. */
export function AddProButton({ slug, name }: { slug: string; name: string }) {
  const [state, setState] = useState<"idle" | "busy" | "added" | "already" | "error">("idle");

  async function add() {
    setState("busy");
    const res = await fetch("/api/v1/landlord/contractors/from-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const body = (await res.json().catch(() => ({}))) as { already?: boolean };
    setState(!res.ok ? "error" : body.already ? "already" : "added");
  }

  if (state === "added" || state === "already") {
    return (
      <div>
        <p className="font-semibold text-stone-900">
          {state === "added" ? `${name} is on your repair people.` : `${name} is already on your list.`}
        </p>
        <p className="mt-1 text-stone-600">
          The next time a tenant reports this kind of problem, they are asked for a price.
        </p>
        <Link href="/landlord/maintenance/people" className={`${buttonCls("secondary")} mt-4`}>
          See your repair people
        </Link>
      </div>
    );
  }
  return (
    <div>
      <button onClick={() => void add()} disabled={state === "busy"} className={buttonCls("accent")}>
        {state === "busy" ? "Adding…" : "Add to my repair people"}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-2 text-sm font-medium text-red-700">
          That did not work. Try again.
        </p>
      )}
    </div>
  );
}
