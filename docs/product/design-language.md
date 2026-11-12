# VillageKeep design language: copper and green

UI and UX rules. Features ride on this; none of them matter without it.

## UX laws

1. CALM IS THE PRODUCT. Landlording is anxiety; the interface sells peace
   of mind. Generous whitespace, parchment ground, white cards, restrained
   color. Nothing pulses, nothing nags, nothing moves unless the user did
   something.
2. COLOR IS INFORMATION, NEVER DECORATION. Patina = good, money-in,
   verified. Copper = action wanted from you. Amber = warning. Red =
   emergency only (a dead red-free dashboard is the goal state). Iron is
   only the ink: no dark bands, no dark panels, no dark buttons.
3. FIVE SECONDS TO THE ANSWER. Every screen is designed backwards from the
   question it answers. Money and counts in tabular figures, scannable at
   a glance. One primary action per surface, verb-first labels.
4. THE LANDLORD NEVER TYPES what the system can derive or someone else can
   enter. Forms are last resorts; defaults are the norm.
5. MOBILE-FIRST. Single-column layouts, touch targets 44px, everything a
   thumb can finish. Landlords approve, tenants report, pros bid: all from
   phones.
6. CRAFT = TRUST. We hold people's money. Aligned baselines, consistent
   corners, visible focus rings, zero layout shift. Sloppy pixels read as
   sloppy escrow.

## The signature

The product is recognizable by restraint and two colors:

- COPPER IS THE ONE THING TO DO. One copper button per surface, dark
  lettering on it (white on copper fails contrast). Copper also marks
  "needs you" labels and the active nav item (a copper underline).
- GREEN IS DONE AND GOOD. Paid, fixed, chosen, verified. The green is the
  mark's keep (#2F6353); its darkest step (#1B3B31) is the only dark
  ground, used for footers and under the village artwork.
- WHITE BARS, WARM PAPER. Headers are white with a hairline border.
  Pages sit on warm paper (#F6F4EF), content on white cards.
- ROUNDED, NOT CUT. Buttons and chips are plainly rounded. The old cut
  corners, facets and battlement edge are retired.
- FLAT, NO SHADOWS. Depth comes from background steps (paper to white)
  and 1px borders. Hover shifts a border to green; press nudges 1px down.
- THE SHIMMER lives only in artwork: every gabled roof in the mark,
  skyline and portraits splits at its apex, light face left, deep face
  right. Always a hard stop, never a gradient ramp.
- THE VILLAGE IS BRICK. Building bodies are warm Chicago common brick
  (#9A5B43) with deeper red (#7C4334) seeded in and the occasional iron
  block for rhythm. The keep is green, like the mark (v4: green keep lit
  from the left, copper home, wordmark in green and copper). The darkest
  buildings and the ground are deep green, never black.
  Windows, doors, and roofs keep the metal palette; brick walls stay flat
  (no brick facet: shimmer belongs to metal).

## Typography

- ONE FAMILY: Inter for everything, including page titles and the
  wordmark (semibold, tight tracking). Money and counts always
  tabular-nums.
- Scale: 12 / 14 (default) / 16 / 20 / 24 / 30.

## Motion

150 to 250ms ease-out, entrances only (wizard step slide, card settle).
No looping animation anywhere. Press feedback is movement enough.

## Voice

Plain words from a competent neighbor, never a bank and never a mascot.

- "Money in", not "Receivables". "Needs you", not "Action items".
- "All quiet. 8 units, nothing needs you." is the flagship sentence.
- Buttons start with verbs: Add property, Compare bids, Release $1,240.
- Numbers carry the message: "$1,925/mo sitting idle" beats "Unit vacant".
- Errors say what happened and what to do, in one sentence each.

## Accessibility floor

Focus-visible patina ring on everything interactive, 4.5:1 contrast
minimum, hit areas 44px, every icon decorative-by-default with text
labels doing the work.
