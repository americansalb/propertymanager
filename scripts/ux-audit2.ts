import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";
const BASE = process.env.VK_SHOTS_URL!, OUT = process.env.VK_SHOTS_OUT!, EXE = process.env.VK_SHOTS_BROWSER!;
const D = { width: 1360, height: 900 }, P = { width: 390, height: 844 };
const out: Array<{ claim: string; verdict: string; detail: string; shot?: string }> = [];
let n = 20;
async function shot(p: Page, name: string) { const f = `${++n}-${name}.png`; await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${f}`, fullPage: true }); return f; }
async function login(e: string, pw: string) {
  const r = await fetch(`${BASE}/api/v1/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: e, password: pw }) });
  return /session=([^;]+)/.exec(r.headers.get("set-cookie") ?? "")?.[1] ?? null;
}
async function pg(b: Browser, v: typeof D, t?: string) {
  const c = await b.newContext({ viewport: v, deviceScaleFactor: 2, isMobile: v.width < 500 });
  if (t) await c.addCookies([{ name: "session", value: t, url: BASE }]);
  return c.newPage();
}
(async () => {
  mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });

  // A: brand-new landlord, day 0. Does the setup chain show "Connect your bank"?
  const em = `fresh-${Date.now()}@demo.test`;
  await fetch(`${BASE}/api/v1/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountType: "LANDLORD", firstName: "New", lastName: "Landlord", businessName: "Fresh Rentals", email: em, password: "Demo1234!" }) });
  const fresh = await login(em, "Demo1234!");
  const p1 = await pg(b, D, fresh!);
  await p1.goto(`${BASE}/landlord/dashboard`, { waitUntil: "networkidle" });
  const t1 = (await p1.textContent("body")) ?? "";
  out.push({ claim: "Day-0 setup chain shows an unfinishable 'Connect your bank' step",
    verdict: /connect your bank/i.test(t1) ? "CONFIRMED" : "REFUTED",
    detail: `soon-step present=${/connect your bank/i.test(t1)}; allQuiet=${/all quiet/i.test(t1)}`,
    shot: await shot(p1, "day0-landlord-dashboard") });
  const p1p = await pg(b, P, fresh!);
  await p1p.goto(`${BASE}/landlord/dashboard`, { waitUntil: "networkidle" });
  await shot(p1p, "day0-landlord-dashboard-phone");

  // B: the strong "All quiet" claim. Fresh org, no rent/vacancy items, but an open EMERGENCY.
  const p2 = await pg(b, D, fresh!);
  await p2.goto(`${BASE}/landlord/maintenance`, { waitUntil: "networkidle" });
  await shot(p2, "day0-maintenance-empty");

  // C: a genuine server exception (not notFound) -> is there an error boundary?
  const lg = await login("landlord@demo.test", "Demo1234!");
  const p3 = await pg(b, D, lg!);
  const resp = await p3.goto(`${BASE}/landlord/messages/not-a-real-lease-id`, { waitUntil: "networkidle" });
  const t3 = (await p3.textContent("body")) ?? "";
  out.push({ claim: "Server exception on a bad lease id renders an unstyled error",
    verdict: `HTTP ${resp?.status()}`,
    detail: t3.replace(/\s+/g, " ").trim().slice(0, 200),
    shot: await shot(p3, "bad-lease-id") });

  // D: the signup wizard and login on a phone
  const p4 = await pg(b, P);
  await p4.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await shot(p4, "signup-phone");
  const p5 = await pg(b, P);
  await p5.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  const fs5 = await p5.$$eval("input", (els) => els.map((e) => getComputedStyle(e).fontSize));
  out.push({ claim: "Login form inputs under 16px (iOS zoom on the very first screen)",
    verdict: fs5.some((f) => parseFloat(f) < 16) ? "CONFIRMED" : "REFUTED",
    detail: `login input font sizes: ${fs5.join(", ")}`, shot: await shot(p5, "login-phone") });

  // E: landlord property + unit pages on a phone (the daily surface)
  const p6 = await pg(b, P, lg!);
  await p6.goto(`${BASE}/landlord/properties/${process.env.VK_PROPERTY_ID}`, { waitUntil: "networkidle" });
  const ov = await p6.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  out.push({ claim: "Property page horizontal overflow at 390px", verdict: ov ? "CONFIRMED" : "REFUTED",
    detail: await p6.evaluate(() => `scrollWidth=${document.documentElement.scrollWidth} innerWidth=${window.innerWidth}`),
    shot: await shot(p6, "property-page-phone") });

  // F: the maintenance detail / respond surface
  const p7 = await pg(b, D, lg!);
  await p7.goto(`${BASE}/landlord/maintenance`, { waitUntil: "networkidle" });
  const link = await p7.$('a[href^="/landlord/maintenance/"]');
  if (link) { await link.click(); await p7.waitForLoadState("networkidle"); }
  out.push({ claim: "Maintenance detail shows cost capture", verdict: /cost|\$/i.test((await p7.textContent("body")) ?? "") ? "HAS $" : "NO COST FIELD",
    detail: "landlord respond surface", shot: await shot(p7, "maintenance-detail") });

  await b.close();
  writeFileSync(`${OUT}/findings2.json`, JSON.stringify(out, null, 2));
  for (const f of out) console.log(`[${f.verdict}] ${f.claim}\n   ${f.detail}\n   shot: ${f.shot}\n`);
})().catch((e) => { console.error(e); process.exit(1); });
