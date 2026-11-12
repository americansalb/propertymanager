/**
 * The forge palette: single source for brand artwork hexes (skyline,
 * portraits, spots). UI colors live as Tailwind tokens in globals.css;
 * these constants exist because SVG fills cannot read CSS variables when
 * rendered to static markup for sheets and previews.
 */
// "Iron" is kept as a name only: the darkest tone in the artwork is deep green.
export const IRON = "#234B3F";
export const IRON_DEEP = "#17342B";
export const COPPER = "#D08A45";
export const COPPER_DEEP = "#9E5B23";
export const PATINA = "#3E7C66";
export const PATINA_DEEP = "#2F6350";
export const GLOW = "#F6E7D7"; // lit windows

// The mark (v4): a green keep lit from the left, holding a copper home.
export const KEEP = "#2F6353"; // lit face
export const KEEP_DEEP = "#234B3F"; // shaded face
export const KEEP_NIGHT = "#1B3B31"; // ground and the darkest buildings
export const HOME_ROOF = "#DC9853";
export const HOME_ROOF_DEEP = "#A9652B";
export const HOME_WALL = "#C8823E";
export const HOME_WALL_DEEP = "#8F521F";
export const NOTICE = "#D9A441";

// The village is brick: warm Chicago common as the default body,
// deeper red seeded in, occasional iron. The keep is green, like the mark.
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
