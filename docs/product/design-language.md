# VillageKeep design language: "the forge"

UI and UX rules. Features ride on this; none of them matter without it.

## UX laws

1. CALM IS THE PRODUCT. Landlording is anxiety; the interface sells peace
   of mind. Generous whitespace, parchment ground, white cards, restrained
   color. Nothing pulses, nothing nags, nothing moves unless the user did
   something.
2. COLOR IS INFORMATION, NEVER DECORATION. Patina = good, money-in,
   verified. Copper = action wanted from you. Amber = warning. Red =
   emergency only (a dead red-free dashboard is the goal state). Iron does
   all the talking; accents whisper.
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

## The forged signature

The icon set's construction rules extend to the interface so the product
is recognizable at a glance:

- CHAMFERS, NOT PILLS. Primary buttons and icon chips carry a 45-degree
  cut corner (top-left and bottom-right), the same cut-metal language as
  the icons. Cards stay soft-rounded for calm; the chamfer is reserved
  for things you press or that mark status.
- FLAT METAL, NO SHADOWS. Depth comes from background steps (parchment to
  white) and 1px borders, never drop shadows. Hover shifts a border to
  patina; press nudges 1px down (stamped, tactile).
- OCTAGONS AND DIAMONDS continue wherever a generic product would use a
  circle or a dot.
- THE SHIMMER. The mark's roof is two flat coppers meeting at a hard edge,
  and it reads as metal catching light. Systemized: every gabled roof in
  the skyline and portraits splits at its apex, light face left, deep face
  right (copper/copper-deep, patina/patina-deep, iron/iron-deep,
  glow/#E6CFB4). Always a hard stop, never a gradient ramp. Buttons carry
  it as a 115deg translucent overlay (.facet 16%, .facet-soft 10%) so
  hover colors compose and labels keep contrast: true copper-deep under
  text drops below AA (~2.9:1), which is why button facets are overlays
  and the literal two-tone pairs stay reserved for artwork.
- THE VILLAGE IS BRICK. Building bodies are warm Chicago common brick
  (#9A5B43) with deeper red (#7C4334) seeded in and the occasional iron
  block for rhythm. The keep and castle elements stay iron, always.
  Windows, doors, and roofs keep the metal palette; brick walls stay flat
  (no brick facet: shimmer belongs to metal).

## Typography

- DISPLAY: Fraunces (warm, artisanal serif; the wordmark voice) for page
  titles, wizard questions, big numbers on marketing surfaces.
- UI: Inter for everything else. Money and counts always tabular-nums.
- Scale: 12 / 14 (default) / 16 / 20 / 24 / 30. Two weights per family.

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
