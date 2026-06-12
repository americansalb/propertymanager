/**
 * The forge palette: single source for brand artwork hexes (skyline,
 * portraits, spots). UI colors live as Tailwind tokens in globals.css;
 * these constants exist because SVG fills cannot read CSS variables when
 * rendered to static markup for sheets and previews.
 */
export const IRON = "#34383F";
export const IRON_DEEP = "#1D2024";
export const COPPER = "#D08A45";
export const COPPER_DEEP = "#9E5B23";
export const PATINA = "#3E7C66";
export const PATINA_DEEP = "#2F6350";
export const GLOW = "#F6E7D7"; // lit windows
export const NOTICE = "#D9A441";

// The village is brick: warm Chicago common as the default body,
// deeper red seeded in, occasional iron. The keep stays iron.
export const BRICK = "#9A5B43";
export const BRICK_DEEP = "#7C4334";

/** Body mix, brick-forward: index with a seed stride decorrelated from roofs. */
export const BODY_MIX = [
  BRICK,
  BRICK,
  BRICK_DEEP,
  BRICK,
  IRON,
  BRICK,
  BRICK_DEEP,
  BRICK,
] as const;

/** The shimmer pairs: light face left of the ridge, deep face right. */
export const ROOF_PAIRS = [
  [COPPER, COPPER_DEEP],
  [PATINA, PATINA_DEEP],
] as const;
