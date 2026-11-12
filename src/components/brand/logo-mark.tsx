import {
  COPPER,
  COPPER_DEEP,
  HOME_ROOF,
  HOME_ROOF_DEEP,
  HOME_WALL,
  HOME_WALL_DEEP,
  KEEP,
  KEEP_DEEP,
  PATINA,
} from "./palette";

/* Geometry on the mark's own grid (the keep spans -62..62 both ways). */
const KEEP_PATH =
  "M -60 62 L -41 -46 L -41 -62 L -21 -62 L -21 -46 L -10 -46 L -10 -62 L 10 -62 L 10 -46 L 21 -46 L 21 -62 L 41 -62 L 41 -46 L 60 62 Z";
const KEEP_LIT =
  "M -60 62 L -41 -46 L -41 -62 L -21 -62 L -21 -46 L -10 -46 L -10 -62 L 0 -62 L 0 62 Z";
/* Under about 28px the battlement gaps close up, so the small mark opens them. */
const KEEP_PATH_SMALL =
  "M -60 62 L -41 -44 L -41 -62 L -24 -62 L -24 -44 L -9 -44 L -9 -62 L 9 -62 L 9 -44 L 24 -44 L 24 -62 L 41 -62 L 41 -44 L 60 62 Z";
const KEEP_LIT_SMALL =
  "M -60 62 L -41 -44 L -41 -62 L -24 -62 L -24 -44 L -9 -44 L -9 -62 L 0 -62 L 0 62 Z";

/**
 * The VillageKeep mark, v4: a green keep lit from the left, holding a
 * copper home with eaves. Green and copper only.
 *
 * tone  "light" for parchment and white grounds, "dark" for iron and
 *       other dark grounds (the keep lifts one step so it does not sink).
 * small the simplified drawing for about 28px and under.
 */
export function LogoMark({
  className,
  tone = "light",
  small = false,
}: {
  className?: string;
  tone?: "light" | "dark";
  small?: boolean;
}) {
  const lit = tone === "dark" ? PATINA : KEEP;
  const shade = tone === "dark" ? KEEP : KEEP_DEEP;
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true" focusable="false">
      <g transform="translate(256,260) scale(3.55)">
        <path d={small ? KEEP_PATH_SMALL : KEEP_PATH} fill={shade} />
        <path d={small ? KEEP_LIT_SMALL : KEEP_LIT} fill={lit} />
        {small ? (
          <>
            <path d="M 0 -32 L -37 5 L -29 5 L -29 62 L 0 62 Z" fill={COPPER} />
            <path d="M 0 -32 L 37 5 L 29 5 L 29 62 L 0 62 Z" fill={COPPER_DEEP} />
          </>
        ) : (
          <>
            <path d="M 0 -31 L -35 4 L 0 4 Z" fill={HOME_ROOF} />
            <path d="M 0 -31 L 35 4 L 0 4 Z" fill={HOME_ROOF_DEEP} />
            <rect x="-28" y="4" width="28" height="58" fill={HOME_WALL} />
            <rect x="0" y="4" width="28" height="58" fill={HOME_WALL_DEEP} />
          </>
        )}
      </g>
    </svg>
  );
}
