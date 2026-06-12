"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmButton, useToast } from "@/components/ui-feedback";
import { IconClose, IconPlus } from "@/components/icons";

export type PhotoView = { id: string; url: string };

/**
 * Photos for a property or unit: thumbnails plus an add tile. Uploads are
 * resized server-side; counts are capped. Delete is the in-place two-step.
 */
export function PhotoStrip({
  entityType,
  entityId,
  photos,
  limit,
}: {
  entityType: "Property" | "Unit";
  entityId: string;
  photos: PhotoView[];
  limit: number;
}) {
  const router = useRouter();
  const { push: toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    const form = new FormData();
    form.set("entityType", entityType);
    form.set("entityId", entityId);
    form.set("file", file);
    const res = await fetch("/api/v1/landlord/photos", { method: "POST", body: form });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      toast(data.error ?? "Upload failed.", "bad");
      return;
    }
    toast("Photo added.");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/v1/landlord/photos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast("Couldn't delete that photo.", "bad");
      return;
    }
    toast("Photo removed.");
    router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {photos.map((p) => (
          <div key={p.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- org-private bytes, no loader */}
            <img
              src={p.url}
              alt=""
              className="h-full w-full cursor-pointer object-cover transition group-hover:scale-[1.03]"
              onClick={() => setLightbox(p.url)}
            />
            <span className="absolute right-1 top-1 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
              <ConfirmButton
                onConfirm={() => remove(p.id)}
                confirmLabel="Delete"
                title="Delete photo"
                className="cut-sm bg-iron/80 p-1 text-white hover:bg-red-700"
              >
                <IconClose className="h-3 w-3" />
              </ConfirmButton>
            </span>
          </div>
        ))}

        {photos.length < limit && (
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 text-stone-400 transition hover:border-patina hover:text-patina disabled:opacity-50"
          >
            <IconPlus className="h-4 w-4" />
            <span className="text-xs font-medium">{busy ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />

      {lightbox && (
        <button
          aria-label="Close photo"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-iron-deep/90 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- org-private bytes, no loader */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </div>
  );
}
