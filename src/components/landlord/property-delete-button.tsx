"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PropertyDeleteButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!window.confirm("Delete this property and all of its units? This cannot be undone.")) return;
    const res = await fetch(`/api/v1/landlord/properties/${propertyId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }
    router.push("/landlord/properties");
    router.refresh();
  }

  return (
    <span>
      <button
        onClick={remove}
        className="rounded-lg px-2 py-1 text-sm text-stone-400 transition hover:bg-red-50 hover:text-red-600"
      >
        Delete property
      </button>
      {error && <span className="ml-3 text-sm text-red-600">{error}</span>}
    </span>
  );
}
