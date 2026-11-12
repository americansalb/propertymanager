"use client";

import { useState } from "react";
import { Badge } from "@/components/ui";
import {
  AddChips,
  EditableRow,
  useOptionalRows,
  useRowPatch,
  type EditableRowProps,
} from "@/components/ui-inline";

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

type Key =
  | "water"
  | "breaker"
  | "codes"
  | "parking"
  | "year"
  | "pets"
  | "petNotes"
  | "notes"
  | "tags"
  | "aka";

type Def = {
  key: Key;
  /** The word on the Add chip. */
  chip: string;
  filled: boolean;
  row: Omit<EditableRowProps, "autoOpen" | "onDismissEmpty">;
};

/**
 * What a repair person asks first. Only rows with an answer show; the rest
 * wait behind Add chips, so an empty building never looks like a form.
 */
export function PropertyDetailsCard({
  propertyId,
  details,
}: {
  propertyId: string;
  details: DetailsView;
}) {
  const patch = useRowPatch(`/api/v1/landlord/properties/${propertyId}/details`);
  const [showCodes, setShowCodes] = useState(false);

  const defs: Def[] = [
    {
      key: "water",
      chip: "Water shutoff",
      filled: details.waterShutoffLocation != null,
      row: {
        label: "Water shutoff",
        value: details.waterShutoffLocation,
        emptyPrompt: "Where is the main water shutoff?",
        kind: { kind: "text", placeholder: "Basement, by the meter" },
        onSave: (v) => patch({ waterShutoffLocation: v }),
        savedToast: "Saved.",
      },
    },
    {
      key: "breaker",
      chip: "Breaker panel",
      filled: details.breakerPanelLocation != null,
      row: {
        label: "Breaker panel",
        value: details.breakerPanelLocation,
        emptyPrompt: "Where is the breaker panel?",
        kind: { kind: "text", placeholder: "Rear stairwell, gray box" },
        onSave: (v) => patch({ breakerPanelLocation: v }),
        savedToast: "Saved.",
      },
    },
    {
      key: "codes",
      chip: "Door and gate codes",
      filled: details.accessCodes != null || details.accessLocked,
      row: {
        label: "Door and gate codes",
        value: details.accessCodes,
        display: details.accessLocked ? (
          <span className="text-amber-800">Saved, but it can no longer be read. Enter it again.</span>
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
            className="cursor-pointer"
          >
            {showCodes ? (
              details.accessCodes
            ) : (
              <>
                <span aria-hidden="true">••••••</span>
                <span className="ml-2 text-sm font-medium text-patina underline">Show</span>
              </>
            )}
          </span>
        ),
        emptyPrompt: "Lockbox, door or gate codes. Stored encrypted.",
        kind: { kind: "text", placeholder: "Lockbox 4417, gate 2290" },
        onSave: (v) => patch({ accessCodes: v }),
        savedToast: "Saved and encrypted.",
      },
    },
    {
      key: "parking",
      chip: "Parking",
      filled: details.parkingNotes != null,
      row: {
        label: "Parking",
        value: details.parkingNotes,
        emptyPrompt: "Where can a work van park?",
        kind: { kind: "text", placeholder: "Alley spot behind the building" },
        onSave: (v) => patch({ parkingNotes: v }),
        savedToast: "Saved.",
      },
    },
    {
      key: "year",
      chip: "Year built",
      filled: details.yearBuilt != null,
      row: {
        label: "Year built",
        value: details.yearBuilt?.toString() ?? null,
        emptyPrompt: "A rough year is fine.",
        kind: { kind: "number", placeholder: "1924" },
        onSave: (v) => patch({ yearBuilt: v }),
        savedToast: "Saved.",
      },
    },
    {
      key: "pets",
      chip: "Pets",
      filled: details.petsAllowed != null,
      row: {
        label: "Pets",
        value: details.petsAllowed === null ? null : details.petsAllowed ? "yes" : "no",
        display:
          details.petsAllowed === null ? null : details.petsAllowed ? "Allowed" : "Not allowed",
        emptyPrompt: "Are pets allowed here?",
        kind: {
          kind: "select",
          options: [
            { value: "unset", label: "Not decided" },
            { value: "yes", label: "Allowed" },
            { value: "no", label: "Not allowed" },
          ],
        },
        onSave: (v) => patch({ petsAllowed: v ?? "unset" }),
        savedToast: "Saved.",
      },
    },
    {
      key: "petNotes",
      chip: "Pet rules",
      filled: details.petNotes != null,
      row: {
        label: "Pet rules",
        value: details.petNotes,
        emptyPrompt: "Any limits on size, breed or number?",
        kind: { kind: "text", placeholder: "Cats are fine. Dogs under 30 lbs." },
        onSave: (v) => patch({ petNotes: v }),
        savedToast: "Saved.",
      },
    },
    {
      key: "notes",
      chip: "Notes",
      filled: details.notes != null,
      row: {
        label: "Notes",
        value: details.notes,
        emptyPrompt: "Anything the next person at the door should know.",
        kind: { kind: "text", rows: 3, placeholder: "Boiler serviced in March." },
        onSave: (v) => patch({ notes: v }),
        savedToast: "Saved.",
      },
    },
    {
      key: "tags",
      chip: "Labels",
      filled: details.tags.length > 0,
      row: {
        label: "Labels",
        value: details.tags,
        display: (
          <span className="flex flex-wrap gap-1.5">
            {details.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
            ))}
          </span>
        ),
        emptyPrompt: "Group your properties your way.",
        kind: { kind: "chips", placeholder: "Lakeview, LLC A" },
        onSave: (v) => patch({ tags: Array.isArray(v) ? v : [] }),
        savedToast: "Labels saved.",
      },
    },
    {
      key: "aka",
      chip: "Second address",
      filled: details.alternateAddress != null,
      row: {
        label: "Second address",
        value: details.alternateAddress,
        emptyPrompt: "A corner building's other street address.",
        kind: { kind: "text", placeholder: "850 W Belmont Ave" },
        onSave: (v) => patch({ alternateAddress: v }),
        savedToast: "Saved.",
      },
    },
  ];

  const rows = useOptionalRows(
    Object.fromEntries(defs.map((d) => [d.key, d.filled])) as Record<Key, boolean>,
  );
  const shown = defs.filter((d) => rows.shows(d.key));
  // Pet rules only make sense once pets are allowed.
  const pending = defs.filter(
    (d) => rows.pending.includes(d.key) && (d.key !== "petNotes" || details.petsAllowed === true),
  );

  return (
    <div>
      {shown.length === 0 && (
        <p className="py-1 text-stone-600">
          Nothing saved yet. Add what you know now, and nobody has to call you from the basement
          later.
        </p>
      )}
      {shown.map((d) => (
        <EditableRow
          key={d.key}
          {...d.row}
          autoOpen={rows.fresh(d.key)}
          onDismissEmpty={() => rows.hide(d.key)}
        />
      ))}
      <AddChips
        title={shown.length === 0 ? "Add" : "Add more"}
        items={pending.map((d) => ({ key: d.key, label: d.chip }))}
        onPick={(key) => rows.reveal(key as Key)}
      />
    </div>
  );
}
