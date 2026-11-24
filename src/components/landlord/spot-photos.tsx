"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import type { SpotView } from "@/lib/urgent";

type Shown = SpotView & { photoId: string | null };

/**
 * One photo for each place someone has to find in a hurry. The words live
 * in Building details; the picture is added here. The tenant sees both
 * when they report an emergency.
 */
export function SpotPhotos({ propertyId, spots }: { propertyId: string; spots: Shown[] }) {
  const router = useRouter();
  const { push: toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(spot: string, file: File) {
    setBusy(spot);
    const form = new FormData();
    form.set("entityType", "Property");
    form.set("entityId", propertyId);
    form.set("spot", spot);
    form.set("file", file);
    const res = await fetch("/api/v1/landlord/photos", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!res.ok) {
      toast(data.error ?? "Upload failed.", "bad");
      return;
    }
    toast("Photo saved.");
    router.refresh();
  }

  async function remove(photoId: string) {
    const res = await fetch(`/api/v1/landlord/photos/${photoId}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Couldn't remove that photo.", "bad");
      return;
    }
    toast("Photo removed.");
    router.refresh();
  }

  function pick(spot: string) {
    setTarget(spot);
    fileInput.current?.click();
  }

  return (
    <div>
      <ul className="divide-y divide-stone-100">
        {spots.map((s) => (
          <li key={s.spot} className="flex items-center gap-4 py-3">
            {s.photoUrl ? (
              <a
                href={s.photoUrl}
                target="_blank"
                rel="noreferrer"
                className="block h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- org-private bytes, no loader */}
                <img
                  src={s.photoUrl}
                  alt={`Photo of the ${s.label.toLowerCase()}`}
                  className="h-full w-full object-cover"
                />
              </a>
            ) : (
              <span
                aria-hidden="true"
                className="block h-16 w-20 shrink-0 rounded-lg border border-dashed border-stone-300"
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-stone-900">{s.label}</span>
              <span className="mt-0.5 block break-words text-sm text-stone-600">
                {s.where ?? "No words yet. Add them in Building details."}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => pick(s.spot)}
                disabled={busy !== null}
                className="min-h-9 rounded-lg px-2 text-sm font-medium text-patina underline disabled:opacity-50"
              >
                {busy === s.spot ? "Saving…" : s.photoUrl ? "Change photo" : "Add a photo"}
              </button>
              {s.photoId && (
                <ConfirmButton
                  onConfirm={() => remove(s.photoId!)}
                  confirmLabel="Yes, remove"
                  className="min-h-9 rounded-lg px-2 text-sm font-medium text-stone-500 transition hover:bg-red-50 hover:text-red-700"
                >
                  Remove
                </ConfirmButton>
              )}
            </span>
          </li>
        ))}
      </ul>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f && target) void upload(target, f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
