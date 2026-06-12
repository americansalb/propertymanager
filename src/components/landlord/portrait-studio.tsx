"use client";

import { useState } from "react";
import {
  PropertyPortrait,
  pickVariant,
  type PortraitPrefs,
  type PortraitUnit,
} from "@/components/brand/property-portrait";
import { BRICK, BRICK_DEEP, COPPER, IRON, PATINA } from "@/components/brand/palette";
import { useRowPatch } from "@/components/ui-inline";
import { IconPencil } from "@/components/icons";

/**
 * The portrait studio: your building, your look. Body brick, roof metal,
 * roof shape, or shuffle the whole thing; every choice saves instantly and
 * the portrait redraws. Reset returns to the seeded default.
 */
export function PortraitStudio({
  propertyId,
  type,
  units,
  prefs,
}: {
  propertyId: string;
  type: string;
  units: PortraitUnit[];
  prefs: PortraitPrefs;
}) {
  const patch = useRowPatch(`/api/v1/landlord/properties/${propertyId}/details`);
  const [open, setOpen] = useState(false);
  const isBuilding = pickVariant(type, units.length) === "building";
  const customized =
    prefs.portraitSeed != null ||
    prefs.portraitBody != null ||
    prefs.portraitRoof != null ||
    prefs.portraitAccent != null;

  const swatch = (active: boolean) =>
    `h-7 w-7 cut-sm transition ${active ? "ring-2 ring-patina ring-offset-2" : "hover:scale-110"}`;
  const chip = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-xs font-medium transition ${
      active
        ? "bg-iron text-white"
        : "border border-stone-200 bg-white text-stone-600 hover:border-patina"
    }`;

  return (
    <div className="w-44 shrink-0">
      <div className="rounded-xl border border-stone-200 bg-white px-3 pt-4 pb-2">
        <PropertyPortrait
          seedKey={propertyId}
          type={type}
          units={units}
          prefs={prefs}
          className="h-auto w-full"
        />
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-xs font-medium text-stone-400 transition hover:bg-stone-50 hover:text-copper-deep"
        >
          <IconPencil className="h-3 w-3" />
          {open ? "Close studio" : "Change the look"}
        </button>
      </div>

      {open && (
        <div className="mt-2 space-y-3 rounded-xl border border-stone-200 bg-white p-3">
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Brick
            </p>
            <div className="flex items-center gap-2.5">
              <button
                title="Common brick"
                onClick={() => void patch({ portraitBody: "BRICK" })}
                className={swatch(prefs.portraitBody === "BRICK")}
                style={{ backgroundColor: BRICK }}
              />
              <button
                title="Deep red brick"
                onClick={() => void patch({ portraitBody: "BRICK_DEEP" })}
                className={swatch(prefs.portraitBody === "BRICK_DEEP")}
                style={{ backgroundColor: BRICK_DEEP }}
              />
              <button
                title="Iron"
                onClick={() => void patch({ portraitBody: "IRON" })}
                className={swatch(prefs.portraitBody === "IRON")}
                style={{ backgroundColor: IRON }}
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
              Roof metal
            </p>
            <div className="flex items-center gap-2.5">
              <button
                title="Copper"
                onClick={() => void patch({ portraitAccent: "COPPER" })}
                className={swatch(prefs.portraitAccent === "COPPER")}
                style={{ backgroundColor: COPPER }}
              />
              <button
                title="Patina"
                onClick={() => void patch({ portraitAccent: "PATINA" })}
                className={swatch(prefs.portraitAccent === "PATINA")}
                style={{ backgroundColor: PATINA }}
              />
            </div>
          </div>

          {isBuilding && (
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-stone-400">
                Roofline
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["PARAPET", "Parapet"],
                    ["GABLE", "Gable"],
                    ["SHED", "Shed"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => void patch({ portraitRoof: value })}
                    className={chip(prefs.portraitRoof === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-stone-100 pt-2">
            <button
              onClick={() =>
                void patch({ portraitSeed: Math.floor(Math.random() * 2_147_483_647) })
              }
              className={chip(false)}
            >
              Shuffle
            </button>
            {customized && (
              <button
                onClick={() =>
                  void patch({
                    portraitSeed: null,
                    portraitBody: null,
                    portraitRoof: null,
                    portraitAccent: null,
                  })
                }
                className="text-xs font-medium text-stone-400 hover:text-copper-deep"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
