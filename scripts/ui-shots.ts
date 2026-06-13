/**
 * UI screenshot harness: walks EVERY route and EVERY wizard step, including
 * interaction states, so no surface ships unseen. Run before every merge.
 *
 *   VK_SHOTS_BROWSER=/path/to/chromium pnpm design:shots
 *
 * Env: VK_SHOTS_URL (default http://127.0.0.1:3306), VK_SHOTS_OUT
 * (default /tmp/ui-shots), VK_SHOTS_EMAIL / VK_SHOTS_PASSWORD for the authed
 * walk, VK_SHOTS_TENANT_EMAIL / VK_SHOTS_TENANT_PASSWORD for the tenant walk
 * (skipped when that login fails), VK_SHOTS_INVITE_URL for the public invite
 * page (optional; seed demo data prints one). Read-only by design: wizards
 * are stepped through but never submitted.
 */
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright-core";

const BASE = process.env.VK_SHOTS_URL ?? "http://127.0.0.1:3306";
const OUT = process.env.VK_SHOTS_OUT ?? "/tmp/ui-shots";
const EXE = process.env.VK_SHOTS_BROWSER;
const EMAIL = process.env.VK_SHOTS_EMAIL ?? "dana@test.local";
const PASSWORD = process.env.VK_SHOTS_PASSWORD ?? "Test1234";
const TENANT_EMAIL = process.env.VK_SHOTS_TENANT_EMAIL ?? "tenant@demo.test";
const TENANT_PASSWORD = process.env.VK_SHOTS_TENANT_PASSWORD ?? "Demo1234!";
const INVITE_URL = process.env.VK_SHOTS_INVITE_URL;

async function loginToken(email: string, password: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return /session=([^;]+)/.exec(res.headers.get("set-cookie") ?? "")?.[1] ?? null;
}

let count = 0;
async function shot(page: Page, name: string, fullPage = false) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${String(++count).padStart(2, "0")}-${name}.png`, fullPage });
  console.log(`shot ${name}`);
}

async function goto(page: Page, path: string) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!EXE) throw new Error("Set VK_SHOTS_BROWSER to a chromium executable");

  const token = await loginToken(EMAIL, PASSWORD);
  if (!token) throw new Error("Login failed; set VK_SHOTS_EMAIL/PASSWORD");

  const browser = await chromium.launch({ executablePath: EXE, args: ["--no-sandbox"] });
  const viewport = { width: 1360, height: 900 };

  // ── Anonymous walk: landing + full signup wizard, never submitted ────────
  const anon = await (await browser.newContext({ viewport, deviceScaleFactor: 1.5 })).newPage();
  await goto(anon, "/");
  await shot(anon, "landing", true);
  await goto(anon, "/login");
  await shot(anon, "login");

  await goto(anon, "/signup");
  await shot(anon, "signup-1-type");
  await anon.getByText("I own or manage rentals").click();
  await shot(anon, "signup-2-name");
  await anon.getByLabel("First name").fill("Ada");
  await anon.getByLabel("Last name").fill("Keeper");
  await anon.getByRole("button", { name: "Continue" }).click();
  await shot(anon, "signup-3-business");
  await anon.getByLabel("Business name").fill("Keeper Properties");
  await anon.getByRole("button", { name: "Continue" }).click();
  await shot(anon, "signup-4-email");
  await anon.getByLabel("Email").fill("ada@example.com");
  await anon.getByRole("button", { name: "Continue" }).click();
  await shot(anon, "signup-5-password");

  await goto(anon, "/signup");
  await anon.getByText("I'm a service pro").click();
  await shot(anon, "signup-pro-name");
  await goto(anon, "/signup");
  await anon.getByText("I rent my home").click();
  await shot(anon, "signup-tenant-explainer");

  // public invite page (the tenant's first sight of the brand)
  if (INVITE_URL) {
    await anon.goto(INVITE_URL, { waitUntil: "networkidle" });
    await shot(anon, "invite-accept", true);
  }

  // ── Authed walk: every landlord surface + wizard steps + edit states ─────
  const authedCtx = await browser.newContext({ viewport, deviceScaleFactor: 1.5 });
  await authedCtx.addCookies([{ name: "session", value: token, url: BASE }]);
  const page = await authedCtx.newPage();

  await goto(page, "/landlord/dashboard");
  await shot(page, "dashboard", true);
  await goto(page, "/landlord/properties");
  await shot(page, "properties", true);

  // first property detail + open unit editor
  const firstCard = page.locator('a[href^="/landlord/properties/c"]').first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.waitForLoadState("networkidle");
    await shot(page, "property-detail", true);
    // in-place editors: name, then address
    await page.getByTitle("Rename").click();
    await shot(page, "property-name-editing");
    await page.keyboard.press("Escape");
    await page.getByTitle("Edit address").click();
    await shot(page, "property-address-editing");
    // unit profile: card click navigates
    const unitCard = page.locator('[role="link"]').first();
    if (await unitCard.count()) {
      await unitCard.click();
      await page.waitForLoadState("networkidle");
      await shot(page, "unit-profile", true);
      const termsRow = page.locator("section button").first();
      if (await termsRow.count()) {
        await termsRow.click();
        await shot(page, "unit-terms-row-editing");
        await page.keyboard.press("Escape");
      }
    }
  }

  // add-property wizard, every step, never submitted
  await goto(page, "/landlord/properties/new");
  await shot(page, "prop-new-1-address");
  await page.getByLabel("Street address").fill("4130 N Ashland Ave");
  await page.getByLabel("City").fill("Chicago");
  await page.getByLabel("State").fill("IL");
  await page.getByLabel("ZIP").fill("60613");
  await page.getByRole("button", { name: "Continue" }).click();
  await shot(page, "prop-new-2-type");
  await page.getByText("Building with units").click();
  await shot(page, "prop-new-3-units-empty");
  await page.getByLabel("Units").fill("101-112");
  await shot(page, "prop-new-3-units-chips");
  await page.goBack();
  await goto(page, "/landlord/properties/new");
  await page.getByLabel("Street address").fill("21 Maple Ct");
  await page.getByLabel("City").fill("Chicago");
  await page.getByLabel("State").fill("IL");
  await page.getByLabel("ZIP").fill("60613");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Single-family home").click();
  await shot(page, "prop-new-4-rent");

  // ── Tenant walk: the home, desktop and mobile ────────────────────────────
  const tenantToken = await loginToken(TENANT_EMAIL, TENANT_PASSWORD);
  if (tenantToken) {
    const tenantCtx = await browser.newContext({ viewport, deviceScaleFactor: 1.5 });
    await tenantCtx.addCookies([{ name: "session", value: tenantToken, url: BASE }]);
    const tenant = await tenantCtx.newPage();
    await goto(tenant, "/tenant/dashboard");
    await shot(tenant, "tenant-home", true);

    const tenantMobCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    await tenantMobCtx.addCookies([{ name: "session", value: tenantToken, url: BASE }]);
    const tenantMob = await tenantMobCtx.newPage();
    await goto(tenantMob, "/tenant/dashboard");
    await shot(tenantMob, "m-tenant-home", true);
  } else {
    console.log("tenant walk skipped: no login (set VK_SHOTS_TENANT_EMAIL/PASSWORD)");
  }

  // ── Mobile walk (390x844): the laws say mobile-first, so we look ─────────
  const mobAnon = await (
    await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  ).newPage();
  await goto(mobAnon, "/");
  await shot(mobAnon, "m-landing", true);
  await goto(mobAnon, "/signup");
  await shot(mobAnon, "m-signup");

  const mobCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  await mobCtx.addCookies([{ name: "session", value: token, url: BASE }]);
  const mob = await mobCtx.newPage();
  await goto(mob, "/landlord/dashboard");
  await shot(mob, "m-dashboard", true);
  await goto(mob, "/landlord/properties");
  await shot(mob, "m-properties", true);
  const mFirst = mob.locator('a[href^="/landlord/properties/c"]').first();
  if (await mFirst.count()) {
    await mFirst.click();
    await mob.waitForLoadState("networkidle");
    await shot(mob, "m-property-detail", true);
  }
  await goto(mob, "/landlord/properties/new");
  await shot(mob, "m-prop-new");

  await browser.close();
  console.log(`done: ${count} screenshots in ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
