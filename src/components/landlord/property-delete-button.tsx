"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton, useToast } from "@/components/ui-feedback";

export function PropertyDeleteButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const { push: toast } = useToast();

  async function remove() {
    const res = await fetch(`/api/v1/landlord/properties/${propertyId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      toast(data.error ?? "Couldn't delete this property.", "bad");
      return;
    }
    toast("Property deleted.");
    router.push("/landlord/properties");
    router.refresh();
  }

  return (
    <ConfirmButton
      onConfirm={remove}
      confirmLabel="Delete property"
      title="Delete property and all of its units"
      className="rounded-lg px-2 py-1 text-sm text-stone-400 transition hover:bg-red-50 hover:text-red-600"
    >
      Delete property
    </ConfirmButton>
  );
}
