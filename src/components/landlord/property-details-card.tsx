"use client";

import { useState } from "react";
import { Badge, buttonCls } from "@/components/ui";
import { EditableRow, useRowPatch } from "@/components/ui-inline";

export type DetailsView = {
  alternateAddress: string | null;
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

/**
 * The operational record as living rows: every row edits itself in place.
 * Empty rows pitch their value ("Your plumber's first question..."); the
 * card stays silent until it has facts, and never becomes a form.
 */
export function PropertyDetailsCard({
  propertyId,
  details,
}: {
  propertyId: string;
  details: DetailsView;
}) {
  const patch = useRowPatch(`/api/v1/landlord/properties/${propertyId}/details`);
  const [revealed, setRevealed] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  const pets =
    details.petsAllowed === null ? null : details.petsAllowed ? "Allowed" : "Not allowed";

  type Row = { filled: boolean; node: React.ReactNode };
  const rows: Row[] = [
    {
      filled: details.alternateAddress != null,
      node: (
        <EditableRow
          key="aka"
          label="Also known as"
          value={details.alternateAddress}
          emptyPrompt="Corner building? Add its other street address."
          kind={{ kind: "text", placeholder: "850 W Belmont Ave entrance" }}
          onSave={(v) => patch({ alternateAddress: v })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.yearBuilt != null,
      node: (
        <EditableRow
          key="year"
          label="Year built"
          value={details.yearBuilt?.toString() ?? null}
          emptyPrompt="When was it built? Pros quote blind without it."
          kind={{ kind: "number", placeholder: "1924" }}
          onSave={(v) => patch({ yearBuilt: v })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.parkingNotes != null,
      node: (
        <EditableRow
          key="parking"
          label="Parking"
          value={details.parkingNotes}
          emptyPrompt="Where does the van park? Pros ask first."
          kind={{ kind: "text", placeholder: "Permit zone 383; alley spot behind" }}
          onSave={(v) => patch({ parkingNotes: v })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.waterShutoffLocation != null,
      node: (
        <EditableRow
          key="water"
          label="Water shutoff"
          value={details.waterShutoffLocation}
          emptyPrompt="Your plumber's first question in an emergency."
          kind={{ kind: "text", placeholder: "Basement, NE corner by the meter" }}
          onSave={(v) => patch({ waterShutoffLocation: v })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.breakerPanelLocation != null,
      node: (
        <EditableRow
          key="breaker"
          label="Breaker panel"
          value={details.breakerPanelLocation}
          emptyPrompt="The first thing any electrician asks."
          kind={{ kind: "text", placeholder: "Rear stairwell, gray box" }}
          onSave={(v) => patch({ breakerPanelLocation: v })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.accessCodes != null || details.accessLocked,
      node: (
        <EditableRow
          key="codes"
          label="Access codes"
          value={details.accessCodes}
          display={
            details.accessLocked ? (
              <span className="text-amber-700">Stored, but the encryption key changed.</span>
            ) : (
              // span, not button: this display lives inside the row button
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCodes((s) => !s);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowCodes((s) => !s);
                  }
                }}
                className="cursor-pointer font-medium text-copper-deep hover:underline"
              >
                {showCodes ? details.accessCodes : "•••••• tap to reveal"}
              </span>
            )
          }
          emptyPrompt="Lockbox or gate codes, encrypted, shared per job only."
          kind={{ kind: "text", placeholder: "Lockbox 4417; gate #2290" }}
          onSave={(v) => patch({ accessCodes: v })}
          savedToast="Encrypted and saved."
        />
      ),
    },
    {
      filled: details.petsAllowed != null,
      node: (
        <EditableRow
          key="pets"
          label="Pets"
          value={details.petsAllowed === null ? null : details.petsAllowed ? "yes" : "no"}
          display={pets}
          emptyPrompt="Pets on site change who takes the job."
          kind={{
            kind: "select",
            options: [
              { value: "unset", label: "Not decided" },
              { value: "yes", label: "Allowed" },
              { value: "no", label: "Not allowed" },
            ],
          }}
          onSave={(v) => patch({ petsAllowed: v ?? "unset" })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.petNotes != null,
      node: (
        <EditableRow
          key="petNotes"
          label="Pet notes"
          value={details.petNotes}
          emptyPrompt="Conditions, breeds, weight limits."
          kind={{ kind: "text", placeholder: "Cats ok, dogs under 30 lbs" }}
          onSave={(v) => patch({ petNotes: v })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.notes != null,
      node: (
        <EditableRow
          key="notes"
          label="Notes"
          value={details.notes}
          emptyPrompt="Anything the next person at the door should know."
          kind={{ kind: "text", rows: 3, placeholder: "Boiler serviced March 2026..." }}
          onSave={(v) => patch({ notes: v })}
          savedToast="Saved."
        />
      ),
    },
    {
      filled: details.tags.length > 0,
      node: (
        <EditableRow
          key="tags"
          label="Tags"
          value={details.tags}
          display={
            <span className="flex flex-wrap gap-1.5">
              {details.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </span>
          }
          emptyPrompt="Organize your way: Lakeview, LLC-A, Section 8."
          kind={{ kind: "chips", placeholder: "Add a tag" }}
          onSave={(v) => patch({ tags: Array.isArray(v) ? v : [] })}
          savedToast="Tags saved."
        />
      ),
    },
  ];

  const filledRows = rows.filter((r) => r.filled);
  const hiddenCount = rows.length - filledRows.length;
  const empty = filledRows.length === 0;
  const visible = empty || revealed ? rows : filledRows;

  return (
    <div className="rounded-xl border border-stone-200 bg-white">
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-stone-900">Details &amp; access</h2>
      </div>

      {empty && !revealed ? (
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-stone-500">
            Nothing recorded yet. Pros will ask for the year built, parking, shutoff
            locations, pets, and access codes.
          </p>
          <button onClick={() => setRevealed(true)} className={buttonCls("secondary", "sm")}>
            Add details
          </button>
        </div>
      ) : (
        <dl className="p-4">
          {visible.map((r) => r.node)}
          {!revealed && hiddenCount > 0 && (
            <button
              onClick={() => setRevealed(true)}
              className="mt-2 text-xs font-medium text-stone-400 transition hover:text-copper-deep"
            >
              + {hiddenCount} more detail{hiddenCount === 1 ? "" : "s"} pros will ask about
            </button>
          )}
        </dl>
      )}
    </div>
  );
}
