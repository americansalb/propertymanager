# VillageKeep design language: copper and green

UI and UX rules. Features ride on this; none of them matter without it.

## UX laws

1. CALM IS THE PRODUCT. Landlording is anxiety; the interface sells peace
   of mind. Generous whitespace, parchment ground, white cards, restrained
   color. Nothing pulses, nothing nags, nothing moves unless the user did
   something.
2. COLOR IS INFORMATION, NEVER DECORATION. Patina = good, money-in,
   verified. Copper = action wanted from you. Amber = warning. Red =
   emergency only (a dead red-free dashboard is the goal state). There is
   no black anywhere: dark green is the ink and the main button.
3. FIVE SECONDS TO THE ANSWER. Every screen is designed backwards from the
   question it answers. Money and counts in tabular figures, scannable at
   a glance. One primary action per surface, verb-first labels.
4. THE LANDLORD NEVER TYPES what the system can derive or someone else can
   enter. Forms are last resorts; defaults are the norm.
5. MOBILE-FIRST. Single-column layouts, touch targets 44px, everything a
   thumb can finish. Landlords approve, tenants report, pros bid: all from
   phones.
6. CRAFT = TRUST. People keep their leases and their rent records here.
   Aligned baselines, consistent corners, visible focus rings, zero layout
   shift. Sloppy pixels read as sloppy records.

## Page rules

Every signed-in page follows the same few patterns. A new page that needs
something else is probably two pages.

1. ONE COLUMN. Header and page share one width (`max-w-3xl`), so their
   edges line up. On a phone the four places are a tab bar at the bottom.
2. THE ANSWER FIRST. The top of the page says the thing the person came
   for: who lives here and what they pay, how many things need you, what
   you owe. On the home page the title itself is the answer.
3. ONE NEXT STEP. At most one filled button per page. Copper marks what
   needs the person (a dot, a line of text, the one accent button); green
   is everything that is fine.
4. ROWS THAT ARE LINKS. Lists are one white card of rows. The whole row is
   a real link, 64px tall, with a chevron. Never a card grid, never a
   click handler on a div.
5. SECTIONS ARE CARDS. `Section` in `components/ui.tsx`: a plain title
   in sentence case, then rows. No uppercase micro-labels anywhere.
6. FACTS ARE ROWS. A plain label on the left, the value in ink on the
   right (`EditableRow` to change it, `InfoRow` to read it). Editing
   shows a real label, a 16px input, and visible Save and Cancel buttons.
7. EMPTY STAYS HIDDEN. An optional field with no value is not a blank row:
   it waits behind an "Add" chip (`AddChips`, `useOptionalRows`).
8. DELETE AT THE BOTTOM. Destructive actions sit quietly at the bottom of
   the thing they destroy, and ask once before acting.
9. NO PROMISES. Nothing on screen says "soon". If it is not built, it is
   not shown.
10. PLAIN WORDS. Repairs, not maintenance. Home, not dashboard. "A month",
    not "/mo". Labels on every field; a placeholder is only an example.

## The landing page

The landing page shows the product instead of describing it. Its pictures
are small copies of the real screens (`components/landing/shots.tsx`),
built from the same colors and the same words, plus one working piece: a
repair the visitor answers themselves (`repair-demo.tsx`, which uses the
product's own stage labels). No illustrations, no stock photos, no invented
numbers or quotes. When a real screen changes, its copy here changes too.
Everything pictured must be built. The soft shadow under these frames is
the one place depth is allowed; the app itself stays flat.

The mark gets room. On every public page it appears at least once large
enough to read the copper home inside the keep: above the headline on the
landing page, standing on the footer line in the closing band, and above
the sign-in card. The `small` drawing is only for 28px and under. Lists of
audiences or features are typographic rows that lead somewhere, never a
grid of icon cards.

## The signature

The product is recognizable by restraint and two colors:

- NO BLACK. Dark green does every job black would: body ink (#1B3B31),
  main buttons (#234B3F, white lettering), footers and the ground under
  the village artwork. Greys are tinted green too (the stone scale in
  globals.css), so text and hairlines are never black or plain grey.
- COPPER NEEDS YOU. Copper is for the thing that wants attention: the
  "needs you" button (the kit's accent variant, dark green lettering
  because white on copper fails contrast), "needs you" labels, the active
  nav item (a copper underline) and one call to action on marketing pages.
- GREEN IS ALSO DONE AND GOOD. Paid, fixed, chosen, verified use the
  mark's keep green (#2F6353).
- WHITE BARS, WARM PAPER. Headers are white with a hairline border.
  Pages sit on warm paper (#F6F4EF), content on white cards.
- ROUNDED, NOT CUT. Buttons and chips are plainly rounded. The old cut
  corners, facets and battlement edge are retired.
- FLAT, NO SHADOWS. Depth comes from background steps (paper to white)
  and 1px borders. Hover shifts a border to green; press nudges 1px down.
- NO ILLUSTRATIONS. The mark is the only drawing in the product. The
  village skyline and the building portraits are retired from every page
  (their components remain in the code, unused). A place is shown by its
  name, address and numbers; real photos can be added on the property
  page.

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
- "Nothing needs you today" is the flagship sentence.
- Buttons start with verbs: Add a property, Send update, Add a tenant.
- Numbers carry the message: "Asking $1,925.00 a month" beats "Unit vacant".
- Errors say what happened and what to do, in one sentence each.

## Accessibility floor

Focus-visible patina ring on everything interactive, 4.5:1 contrast
minimum, hit areas 44px, every icon decorative-by-default with text
labels doing the work.
