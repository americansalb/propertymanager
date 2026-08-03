# UX shots: the app, rendered

Produced by `scripts/ux-audit.ts` and `scripts/ux-audit2.ts` against a real
build (`next start`) on a real Postgres with seeded demo data, driven by
Chromium via playwright-core. Desktop is 1360x900, phone is 390x844 (iPhone 14
Pro) with `isMobile`.

These exist because the UX findings in `mvp-audit-findings.md` were originally
made by reading JSX. Rendering them changed three of the conclusions.

## Corrected by looking

| Claim | Verdict |
| --- | --- |
| Dashboard says "All quiet" with emergency maintenance open | **Reworded.** It did not say "All quiet" (other items filled the queue). The real defect is that the emergency is absent from NEEDS YOU entirely, showing only as a pulse-bar count. `03` |
| 404 has "no header, no nav, no logo, no way back" | **Wrong.** The route-group layout wraps it: full header, nav, and bell survive. The body is stock unstyled Next.js in ~1,500px of white. BLOCKER to MEDIUM. `07` |
| Unfinishable "Connect your bank" setup step | **Retracted.** Greyed, explicit `soon` chip, disappears once setup completes. Honest roadmap signalling. `21` |
| Landing page horizontal overflow at 390px | **Refuted.** `scrollWidth === innerWidth === 390`. `02` |
| Property page horizontal overflow at 390px | **Refuted.** Clean. `27` |

## Confirmed by looking

| Claim | Evidence |
| --- | --- |
| Tenant sees rent the landlord hid | `08`: "Your landlord hasn't shared lease details here yet." directly above **"YOU OWE $1,850.00 · $1,850.00 past due"** |
| Landing page sells four features that do not exist | `01`: online rent, photos, pro bidding, escrow |
| "Report a problem: **Photos**, a time that works" | `08` promises photos on the tenant's own home; `11` shows the wizard has `input[type=file]` count **0** |
| Inputs under 16px zoom iOS Safari | `26` login: both inputs **14px**. `06` lease panel: 2 of 3 focusable inputs under 16px (12px, 14px) |
| Tenant has no way to pay | `09`: "Paying online through VillageKeep is coming soon." |
| Pro signup dead-ends | `12`: a paragraph, a status chip, no nav shell |

## Reproducing

```bash
docker compose up -d postgres     # or any local Postgres
export DATABASE_URL="postgresql://...?schema=villagekeep_app"
export APP_DB_SCHEMA=villagekeep_app SEED_DEMO=true
pnpm db:deploy && pnpm db:seed
pnpm build && ./node_modules/.bin/next start -p 3306 &

export VK_SHOTS_BROWSER=/opt/pw-browsers/chromium-*/chrome-linux/chrome
export VK_SHOTS_URL=http://127.0.0.1:3306 VK_SHOTS_OUT=./docs/product/ux-shots
export VK_PROPERTY_ID=... VK_UNIT_ID=...
npx tsx scripts/ux-audit.ts && npx tsx scripts/ux-audit2.ts
```

`findings.json` / `findings2.json` carry the machine-readable verdicts.
