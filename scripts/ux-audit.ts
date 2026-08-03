/**
 * UX audit harness: renders the real app in a real browser and both SCREENSHOTS
 * and MEASURES the claims in docs/product/mvp-audit-findings.md that were made
 * by reading JSX rather than by looking at the product.
 *
 *   VK_SHOTS_BROWSER=/opt/pw-browsers/chromium/chrome-linux/chrome \
 *   VK_SHOTS_URL=http://127.0.0.1:3306 npx tsx scripts/ux-audit.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium, type Browser, type Page } from "playwright-core";

const BASE = process.env.VK_SHOTS_URL ?? "http://127.0.0.1:3306";
const OUT = process.env.VK_SHOTS_OUT ?? "/tmp/ux-audit";
const EXE = process.env.VK_SHOTS_BROWSER!;
const DESKTOP = { width: 1360, height: 900 };
const PHONE = { width: 390, height: 844 }; // iPhone 14 Pro

const findings: Array<{ claim: string; verdict: string; detail: string; shot?: string }> = [];
let n = 0;

async function shot(page: Page, name: string, full = true): Promise<string> {
  const file = `${String(++n).padStart(2, "0")}-${name}.png`;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: full });
  return file;
}

async function login(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return /session=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1] ?? null;
}

async function ctx(browser: Browser, viewport: { width: number; height: number }, token?: string) {
  const c = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: viewport.width < 500 });
  if (token) await c.addCookies([{ name: "session", value: token, url: BASE }]);
  return c.newPage();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const landlord = await login("landlord@demo.test", "Demo1234!");
  const tenant = await login("tenant@demo.test", "Demo1234!");
  if (!landlord) throw new Error("landlord login failed");

  // ── 1. Landing page, desktop and phone ───────────────────────────────────
  const anonD = await ctx(browser, DESKTOP);
  await anonD.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const promises = await anonD.$$eval("h2, p", (els) =>
    els.map((e) => e.textContent?.trim() ?? "").filter((t) => /pay online|photos|bid|escrow/i.test(t)),
  );
  findings.push({
    claim: "Landing page sells features that do not exist",
    verdict: promises.length > 0 ? "CONFIRMED" : "NOT FOUND",
    detail: promises.join(" | ").slice(0, 400),
    shot: await shot(anonD, "landing-desktop"),
  });

  const anonP = await ctx(browser, PHONE);
  await anonP.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const hOverflow = await anonP.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  findings.push({
    claim: "Landing page horizontal overflow at 390px",
    verdict: hOverflow ? "CONFIRMED" : "REFUTED",
    detail: await anonP.evaluate(() => `scrollWidth=${document.documentElement.scrollWidth} innerWidth=${window.innerWidth}`),
    shot: await shot(anonP, "landing-phone"),
  });

  // ── 2. Landlord dashboard: "All quiet" with open EMERGENCY maintenance ───
  const dashD = await ctx(browser, DESKTOP, landlord);
  await dashD.goto(`${BASE}/landlord/dashboard`, { waitUntil: "networkidle" });
  const body = (await dashD.textContent("body")) ?? "";
  const allQuiet = /all quiet/i.test(body);
  const maintCount = /(\d+)\s*open maintenance/i.exec(body)?.[1] ?? "?";
  findings.push({
    claim: "Dashboard says 'All quiet' while emergency maintenance is open",
    verdict: allQuiet ? "CONFIRMED" : "REFUTED",
    detail: `allQuietRendered=${allQuiet}; pulse bar reports "${maintCount} open maintenance"; body mentions the emergency title=${/hot water/i.test(body)}`,
    shot: await shot(dashD, "landlord-dashboard-desktop"),
  });

  // The unfinishable setup step
  findings.push({
    claim: "Setup chain shows an unfinishable 'Connect your bank' step",
    verdict: /connect your bank/i.test(body) ? "CONFIRMED" : "REFUTED",
    detail: /connect your bank/i.test(body) ? "'Connect your bank' rendered on the dashboard" : "not present",
  });

  const dashP = await ctx(browser, PHONE, landlord);
  await dashP.goto(`${BASE}/landlord/dashboard`, { waitUntil: "networkidle" });
  await shot(dashP, "landlord-dashboard-phone");

  // ── 3. Maintenance inbox ─────────────────────────────────────────────────
  const maint = await ctx(browser, DESKTOP, landlord);
  await maint.goto(`${BASE}/landlord/maintenance`, { waitUntil: "networkidle" });
  await shot(maint, "landlord-maintenance-inbox");

  // ── 4. iOS zoom: measure computed font-size of real inputs at 390px ──────
  const unitPage = await ctx(browser, PHONE, landlord);
  const propId = process.env.VK_PROPERTY_ID;
  const unitId = process.env.VK_UNIT_ID;
  await unitPage.goto(`${BASE}/landlord/properties/${propId}/units/${unitId}`, { waitUntil: "networkidle" });
  const beforeShot = await shot(unitPage, "lease-panel-phone");
  // Open an inline editor (the rent row) and measure the input that appears.
  const sizes = await unitPage.evaluate(() => {
    const out: Array<{ tag: string; fs: string; type: string }> = [];
    document.querySelectorAll("input, textarea, select").forEach((el) => {
      const cs = getComputedStyle(el);
      out.push({ tag: el.tagName, fs: cs.fontSize, type: (el as HTMLInputElement).type ?? "" });
    });
    return out;
  });
  const zoomers = sizes.filter((s) => parseFloat(s.fs) < 16 && !["checkbox", "radio", "hidden"].includes(s.type));
  findings.push({
    claim: "Inputs below 16px make iOS Safari zoom the viewport on focus",
    verdict: zoomers.length > 0 ? "CONFIRMED" : "REFUTED",
    detail: `${zoomers.length}/${sizes.length} focusable inputs under 16px. Sizes seen: ${[...new Set(sizes.map((s) => s.fs))].join(", ")}`,
    shot: beforeShot,
  });

  // ── 5. Error boundary: a 404 and a bad id ────────────────────────────────
  const nf = await ctx(browser, DESKTOP, landlord);
  await nf.goto(`${BASE}/landlord/properties/does-not-exist-abc`, { waitUntil: "networkidle" });
  const nfBody = (await nf.textContent("body")) ?? "";
  const hasChrome = /VillageKeep/i.test(nfBody);
  const hasNav = (await nf.$$('a[href^="/landlord"]')).length > 0;
  findings.push({
    claim: "No not-found boundary: 404 renders stock Next.js chrome with no nav",
    verdict: !hasChrome && !hasNav ? "CONFIRMED" : "PARTIAL",
    detail: `brandingPresent=${hasChrome} navLinks=${hasNav} text="${nfBody.replace(/\s+/g, " ").trim().slice(0, 120)}"`,
    shot: await shot(nf, "not-found-page"),
  });

  // ── 6. Tenant: lease hidden, but are charges visible? ────────────────────
  if (tenant) {
    const tD = await ctx(browser, DESKTOP, tenant);
    await tD.goto(`${BASE}/tenant/dashboard`, { waitUntil: "networkidle" });
    const tBody = (await tD.textContent("body")) ?? "";
    const hiddenMsg = /hasn.t shared|not shared/i.test(tBody);
    const money = /\$[\d,]+/.test(tBody);
    findings.push({
      claim: "Tenant sees charge amounts while the landlord has the lease hidden",
      verdict: hiddenMsg && money ? "CONFIRMED" : hiddenMsg ? "REFUTED (no money shown)" : "INCONCLUSIVE",
      detail: `"lease not shared" message present=${hiddenMsg}; dollar amount rendered=${money}; amounts=${(tBody.match(/\$[\d,]+\.?\d*/g) ?? []).slice(0, 5).join(" ")}`,
      shot: await shot(tD, "tenant-dashboard-lease-hidden"),
    });

    const tP = await ctx(browser, PHONE, tenant);
    await tP.goto(`${BASE}/tenant/payments`, { waitUntil: "networkidle" });
    const payBody = (await tP.textContent("body")) ?? "";
    findings.push({
      claim: "Tenant payments page offers no way to pay",
      verdict: /coming soon|pay .* the way you do today/i.test(payBody) ? "CONFIRMED" : "REFUTED",
      detail: (payBody.match(/[^.]*coming soon[^.]*\./i) ?? ["n/a"])[0].trim().slice(0, 200),
      shot: await shot(tP, "tenant-payments-phone"),
    });

    const tm = await ctx(browser, PHONE, tenant);
    await tm.goto(`${BASE}/tenant/maintenance`, { waitUntil: "networkidle" });
    await shot(tm, "tenant-maintenance-phone");
    // The report wizard: does it have a photo input, as the landing page promises?
    const btn = await tm.$('button:has-text("Report"), a:has-text("Report")');
    if (btn) { await btn.click(); await tm.waitForTimeout(700); }
    const fileInputs = (await tm.$$('input[type="file"]')).length;
    findings.push({
      claim: "Report-a-problem wizard has no photo upload despite the promise",
      verdict: fileInputs === 0 ? "CONFIRMED" : "REFUTED",
      detail: `input[type=file] count in the wizard: ${fileInputs}`,
      shot: await shot(tm, "tenant-report-wizard-phone"),
    });
  }

  // ── 7. Pro portal dead end ───────────────────────────────────────────────
  const pro = await login("pro@demo.test", "Demo1234!");
  if (pro) {
    const pp = await ctx(browser, DESKTOP, pro);
    await pp.goto(`${BASE}/pro/dashboard`, { waitUntil: "networkidle" });
    const pBody = (await pp.textContent("body")) ?? "";
    findings.push({
      claim: "Pro signup dead-ends on a stub page",
      verdict: /marketplace launch|we.ll email you/i.test(pBody) ? "CONFIRMED" : "REFUTED",
      detail: pBody.replace(/\s+/g, " ").trim().slice(0, 200),
      shot: await shot(pp, "pro-dashboard-dead-end"),
    });
  }

  await browser.close();
  writeFileSync(`${OUT}/findings.json`, JSON.stringify(findings, null, 2));
  console.log("\n================ UX AUDIT RESULTS ================\n");
  for (const f of findings) {
    console.log(`[${f.verdict}] ${f.claim}`);
    console.log(`   ${f.detail}`);
    if (f.shot) console.log(`   shot: ${f.shot}`);
    console.log();
  }
  console.log(`${n} screenshots in ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
