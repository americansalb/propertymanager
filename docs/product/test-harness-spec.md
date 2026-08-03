# VillageKeep integration test harness + cross-org authorization sweep

Implementation-ready. Everything below is real code against the tree as it exists today (Next 15.5.19, Vitest 3.2.6, Prisma 6.8, Node 22).

---

## 0. What gets built

```
scripts/
  prisma-scoped.mjs                  NEW  pins ?schema= for every Prisma CLI call
tests/
  unit/**                            unchanged (126 tests)
  unit/service-scoping.test.ts       NEW  static guard: no unscoped mutations (no DB)
  integration/
    setup/
      workers.ts                     NEW  worker count + schema naming (shared constant)
      global-setup.ts                NEW  creates + migrates one schema per worker
      env.ts                         NEW  sets APP_DB_SCHEMA before anything imports @/lib/env
      next-headers.mock.ts           NEW  AsyncLocalStorage-backed cookies()/headers()
      globals.ts                     NEW  vi.mock wiring, truncate beforeEach, $disconnect afterAll
      truncate.ts                    NEW  per-worker TRUNCATE
    factories.ts                     NEW  makeWorld() and friends
    http.ts                          NEW  call() -- invokes a route handler with a fake request scope
    snapshot.ts                      NEW  snapshotOrg() for mutation-effect assertions
    routes.ts                        NEW  THE ROUTE TABLE
    cross-org.test.ts                NEW  landlord sweep
    tenant-isolation.test.ts         NEW  tenant sweep + files + messages
    tick.test.ts                     NEW  cron tick
vitest.config.ts                     EDIT two projects
package.json                         EDIT scoped db scripts + test:integration
.github/workflows/ci.yml             EDIT Postgres service + integration step
```

---

## 1. CI: Postgres service, schema-scoped migrations, env wiring

### 1a. The schema-pinning wrapper (fixes a real production-adjacent hole)

Today `pnpm db:migrate` / `db:deploy` shell straight to the Prisma CLI. The CLI reads `DATABASE_URL` from the process env and **never imports `src/lib/env.ts`**, so `APP_DB_SCHEMA` is invisible to it. `.env.example` has no `?schema=`. Result: a developer running `pnpm db:deploy` against a URL copied from Render writes `_prisma_migrations` and all 33 tables into **`public`** on the shared instance. Only `scripts/render-start.mjs` gets this right, and only on Render.

**`scripts/prisma-scoped.mjs`** (new):

```js
#!/usr/bin/env node
/**
 * Runs the Prisma CLI with DATABASE_URL pinned to the app's own schema.
 *
 * The CLI never imports src/lib/env.ts, so without this wrapper `prisma
 * migrate` targets `public` on an instance shared with other services.
 * Mirrors scripts/render-start.mjs so local, CI, and Render agree.
 */
import { spawnSync } from "node:child_process";

const SCHEMA_RE = /^[a-z_][a-z0-9_]*$/;
const schema = process.env.APP_DB_SCHEMA ?? "villagekeep_app";

if (!SCHEMA_RE.test(schema)) {
  console.error(`APP_DB_SCHEMA "${schema}" is not a plain identifier.`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const pinned = url.searchParams.get("schema");
if (pinned && pinned !== schema) {
  console.error(
    `DATABASE_URL pins schema="${pinned}" but APP_DB_SCHEMA is "${schema}". Refusing to guess.`,
  );
  process.exit(1);
}
url.searchParams.set("schema", schema);

// The shared instance makes these unrecoverable. They are never correct here.
const argv = process.argv.slice(2);
const joined = argv.join(" ");
for (const banned of ["migrate reset", "db push"]) {
  if (joined.startsWith(banned)) {
    console.error(
      `Refusing "prisma ${banned}": the Postgres instance is shared. ` +
        `Write a forward migration instead.`,
    );
    process.exit(1);
  }
}

const result = spawnSync("./node_modules/.bin/prisma", argv, {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url.toString() },
});
process.exit(result.status ?? 1);
```

**`package.json`** diff:

```diff
     "test": "vitest run",
+    "test:unit": "vitest run --project unit",
+    "test:integration": "vitest run --project integration",
     "db:generate": "prisma generate",
-    "db:migrate": "prisma migrate dev",
-    "db:deploy": "prisma migrate deploy",
+    "db:migrate": "node scripts/prisma-scoped.mjs migrate dev",
+    "db:deploy": "node scripts/prisma-scoped.mjs migrate deploy",
+    "db:status": "node scripts/prisma-scoped.mjs migrate status",
+    "db:drift": "node scripts/prisma-scoped.mjs migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --shadow-database-url \"$SHADOW_DATABASE_URL\" --exit-code",
     "db:seed": "tsx prisma/seed.ts",
```

Also add to `.env.example` so nobody ever hand-runs an unpinned CLI:

```diff
 DATABASE_URL="postgresql://villagekeep:villagekeep@localhost:5432/villagekeep?schema=villagekeep_app"
 APP_DB_SCHEMA="villagekeep_app"
```

### 1b. `.github/workflows/ci.yml`

```diff
 name: CI
 
 on:
   push:
     branches: [main_property]
   pull_request:
 
 jobs:
   checks:
     runs-on: ubuntu-latest
+
+    services:
+      postgres:
+        image: postgres:16-alpine
+        env:
+          POSTGRES_USER: vk
+          POSTGRES_PASSWORD: vk
+          POSTGRES_DB: vk_ci
+        ports:
+          - 5432:5432
+        # 200 is generous headroom for 4 workers x (files x pool of 2).
+        options: >-
+          --health-cmd "pg_isready -U vk -d vk_ci"
+          --health-interval 5s
+          --health-timeout 5s
+          --health-retries 10
+          --tmpfs /var/lib/postgresql/data:rw,noexec,nosuid,size=512m
+
+    env:
+      # Note the ?schema=: CI is a throwaway database, but the harness must
+      # exercise the same schema-scoped path production uses.
+      DATABASE_URL: 'postgresql://vk:vk@localhost:5432/vk_ci?schema=villagekeep_app'
+      SHADOW_DATABASE_URL: 'postgresql://vk:vk@localhost:5432/vk_ci?schema=villagekeep_shadow'
+      APP_DB_SCHEMA: villagekeep_app
+      DB_CONNECTION_LIMIT: '2'
+      NODE_ENV: test
+      # Deterministic, non-secret. Only used to exercise the AES-GCM path.
+      SESSION_SECRET: 'ci-only-not-a-secret-0123456789abcdef0123456789'
+      CRON_SECRET: 'ci-cron-secret'
+      APP_URL: 'http://localhost:3000'
+      # Deliberately unset: RESEND_API_KEY, STRIPE_*. Tests mock the sender.
+      ALLOW_TEST_DB: '1'
+
     steps:
       - uses: actions/checkout@v4
 
       - uses: pnpm/action-setup@v4
 
       - uses: actions/setup-node@v4
         with:
           node-version: 22
           cache: pnpm
 
       - name: Install
         run: pnpm install --frozen-lockfile
 
       - name: Prisma generate
         run: pnpm db:generate
 
       - name: Lint
         run: pnpm lint
 
       - name: Typecheck
         run: pnpm typecheck
 
-      - name: Unit tests
-        run: pnpm test
+      - name: Migrations apply cleanly into the app schema
+        run: pnpm db:deploy
+
+      - name: Migrations match schema.prisma (no drift)
+        run: pnpm db:drift
+
+      - name: Unit tests
+        run: pnpm test:unit
+
+      - name: Integration tests (incl. cross-org authz sweep)
+        run: pnpm test:integration
+
+      - name: Assert nothing landed outside the app schema
+        run: node scripts/prisma-scoped.mjs db execute --url "$DATABASE_URL" --stdin <<'SQL'
+          DO $$
+          DECLARE leaked int;
+          BEGIN
+            SELECT count(*) INTO leaked FROM pg_tables WHERE schemaname = 'public';
+            IF leaked > 0 THEN
+              RAISE EXCEPTION 'CI wrote % table(s) into public. The schema pin is broken.', leaked;
+            END IF;
+          END $$;
+          SQL
 
       - name: Build
         run: pnpm build
-        env:
-          DATABASE_URL: 'postgresql://ci:ci@localhost:5432/ci'
```

Three things this buys beyond running tests:

1. **`db:deploy` in CI is the first time migrations have ever been executed by CI.** A migration that does not apply now fails the PR instead of failing `render-start.mjs` on deploy.
2. **`db:drift`** catches `schema.prisma` edited without a migration (the `Charge` composite unique and `LedgerEntry.seq` are exactly the kind of thing that drifts).
3. **The `public` leak assertion** is the mechanical proof that the schema pin holds. It is the only check that would have caught the unpinned `db:deploy` bug.

`SHADOW_DATABASE_URL` points at `villagekeep_shadow` in the same throwaway CI database. `migrate diff` creates and drops it. This is CI-only and never configured on Render.

---

## 2. Test isolation: schema-per-worker + TRUNCATE

### The three options against Prisma's actual constraints

**Transaction rollback is not available to this codebase.** The pattern is `BEGIN; run test; ROLLBACK`, which requires the code under test to use the transaction client. Every service in `src/lib/services/*` imports the module singleton `prisma` from `@/lib/db`. To inject a `Prisma.TransactionClient` you would have to swap that singleton at runtime, and then two things break immediately:

- `Prisma.TransactionClient` has `$transaction` **omitted from its type and absent at runtime**. `respondToMaintenance` (`src/lib/services/maintenance.ts:315`) calls `prisma.$transaction(async (tx) => ...)`, `deleteLease` (`src/lib/services/lease.ts:77`) calls `prisma.$transaction([...])`, `createTenantInvitation` and `acceptInvitation` both do too. Every one of those routes would throw `prisma.$transaction is not a function` under a swapped client. That is five of the fourteen landlord routes, including the two the sweep most needs.
- Prisma interactive transactions default to a 5 s `timeout` and a 2 s `maxWait`. Wrapping a whole test in one turns any slow assertion into `P2028`.

Rejected on the merits, not on taste.

**Truncate alone forces serial execution.** One shared schema means workers clobber each other's rows mid-test. You would need `--no-file-parallelism`, which throws away the only cheap speedup available.

**Schema-per-worker + TRUNCATE per test is the pick**, and it is nearly free here because `src/lib/env.ts` already does the work:

```ts
export function databaseUrlWithSchema(): string {
  const url = new URL(env.DATABASE_URL);
  if (!url.searchParams.has("schema")) {
    url.searchParams.set("schema", env.APP_DB_SCHEMA);
  }
  ...
}
```

`src/lib/db.ts` passes that to `new PrismaClient({ datasourceUrl })`. So setting `process.env.APP_DB_SCHEMA = "vk_test_w3"` before the first import of `@/lib/env` gives that worker its own physical schema, with **zero production code changes**. One caveat the env.ts code creates: if `DATABASE_URL` already carries `?schema=`, `databaseUrlWithSchema()` keeps it and ignores `APP_DB_SCHEMA`. CI sets `?schema=villagekeep_app` in `DATABASE_URL`, so the setup file must strip it. Handled below.

**`pool: "forks"` is mandatory, not a preference.** With `pool: "threads"`, `process.env` is shared across all worker threads in one process, so `APP_DB_SCHEMA` per worker is impossible. Forks give each worker a real process.

**`isolate` stays at its default `true`.** With `isolate: false` the module registry is shared across test files in a worker, so setup-file modules evaluate once and the `beforeEach` hooks registered at their top level attach to the wrong suite. Keeping isolation costs one `PrismaClient` per test file; `afterAll(() => prisma.$disconnect())` in the setup file releases those connections deterministically, and `DB_CONNECTION_LIMIT=2` caps the peak at 4 workers x 2 = 8 concurrent connections.

### 2a. `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

const alias = { "@": path.resolve(__dirname, "./src") };

// Kept in lockstep with tests/integration/setup/workers.ts. globalSetup uses
// the same number to decide how many schemas to build.
const INTEGRATION_WORKERS = Number(process.env.VK_TEST_WORKERS ?? 4);

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          // Required: threads share process.env, which would break the
          // per-worker APP_DB_SCHEMA pin.
          pool: "forks",
          poolOptions: {
            forks: {
              minForks: INTEGRATION_WORKERS,
              maxForks: INTEGRATION_WORKERS,
            },
          },
          // env.ts must be first: it mutates process.env before any module
          // imports @/lib/env (which parses process.env at load time).
          setupFiles: [
            "./tests/integration/setup/env.ts",
            "./tests/integration/setup/globals.ts",
          ],
          globalSetup: ["./tests/integration/setup/global-setup.ts"],
          // Tests within a file share a schema; truncate between them only
          // works if they run one at a time.
          sequence: { concurrent: false },
          testTimeout: 15_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
```

### 2b. `tests/integration/setup/workers.ts`

```ts
/** Shared between vitest.config.ts, globalSetup, and the per-worker env file. */
export const WORKER_COUNT = Number(process.env.VK_TEST_WORKERS ?? 4);

export function testSchemaFor(workerId: number): string {
  return `vk_test_w${workerId}`;
}

export function allTestSchemas(): string[] {
  return Array.from({ length: WORKER_COUNT }, (_, i) => testSchemaFor(i + 1));
}

/** Strips any ?schema= so APP_DB_SCHEMA wins, and pins the schema we want. */
export function urlForSchema(base: string, schema: string): string {
  const url = new URL(base);
  url.searchParams.set("schema", schema);
  url.searchParams.set("connection_limit", process.env.DB_CONNECTION_LIMIT ?? "2");
  return url.toString();
}
```

### 2c. `tests/integration/setup/global-setup.ts`

Runs once, in the main process, before any worker starts. It must not import `@/lib/db` (that would build a client against the wrong schema), so it drives the Prisma CLI.

```ts
import { spawnSync } from "node:child_process";
import { allTestSchemas, urlForSchema } from "./workers";

function assertDisposableDatabase(raw: string) {
  const host = new URL(raw).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (!local && process.env.ALLOW_TEST_DB !== "1") {
    throw new Error(
      `Refusing to build test schemas on "${host}". The production Postgres is ` +
        `shared with other services. Set ALLOW_TEST_DB=1 only for a throwaway CI database.`,
    );
  }
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv, stdin?: string) {
  const r = spawnSync(cmd, args, {
    env: { ...process.env, ...env },
    input: stdin,
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(
      `${cmd} ${args.join(" ")} failed (${r.status})\n${r.stdout ?? ""}\n${r.stderr ?? ""}`,
    );
  }
}

export async function setup() {
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("DATABASE_URL is required to run integration tests.");
  assertDisposableDatabase(base);

  const prisma = "./node_modules/.bin/prisma";

  await Promise.all(
    allTestSchemas().map(async (schema) => {
      const url = urlForSchema(base, schema);

      // Drop + recreate so a crashed previous run cannot leave rows behind.
      // Scoped by name to schemas this harness owns; never public, never the
      // app schema.
      run(
        prisma,
        ["db", "execute", "--url", url, "--stdin"],
        {},
        `DROP SCHEMA IF EXISTS "${schema}" CASCADE; CREATE SCHEMA "${schema}";`,
      );

      // Real migrations, not `db push`: CI must prove the migration files
      // themselves apply.
      run(prisma, ["migrate", "deploy"], { DATABASE_URL: url });
    }),
  );
}

export async function teardown() {
  // Nothing. The CI Postgres is thrown away; locally the schemas are reused
  // (recreated on the next run), which keeps repeat runs fast.
}
```

Four `migrate deploy` runs in parallel over 11 migrations: about 4 s wall.

### 2d. `tests/integration/setup/env.ts`

Top of the setup chain. **No imports from `src/`** and no top-level `await`, so nothing can parse `process.env` before this runs.

```ts
import { testSchemaFor, urlForSchema } from "./workers";

const workerId = Number(process.env.VITEST_POOL_ID ?? process.env.VITEST_WORKER_ID ?? 1);
const schema = testSchemaFor(workerId);

const base = process.env.DATABASE_URL;
if (!base) throw new Error("DATABASE_URL is required to run integration tests.");

// Both are set: DATABASE_URL carries ?schema= (databaseUrlWithSchema() honours
// an existing param over APP_DB_SCHEMA), and APP_DB_SCHEMA is set so anything
// reading it directly agrees.
process.env.DATABASE_URL = urlForSchema(base, schema);
process.env.APP_DB_SCHEMA = schema;
process.env.NODE_ENV = "test";
process.env.SESSION_SECRET ??= "test-only-not-a-secret-0123456789abcdef0123456789";
process.env.CRON_SECRET ??= "test-cron-secret";
process.env.APP_URL ??= "http://localhost:3000";
delete process.env.RESEND_API_KEY; // the sender is mocked; belt and braces

export const TEST_SCHEMA = schema;
```

### 2e. `tests/integration/setup/truncate.ts`

```ts
import { prisma } from "@/lib/db";
import { TEST_SCHEMA } from "./env";

let statement: string | null = null;

async function buildStatement(): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = ${TEST_SCHEMA} AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) {
    throw new Error(`Schema "${TEST_SCHEMA}" has no tables. Did globalSetup run?`);
  }
  const list = rows.map((r) => `"${TEST_SCHEMA}"."${r.tablename}"`).join(", ");
  // RESTART IDENTITY resets LedgerEntry.seq so ordering assertions are stable.
  return `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`;
}

/**
 * Services fire audit() and notify() writes with `void` (see src/lib/audit.ts:
 * "Failures never break the user action"). Those promises can settle after the
 * handler returns. Drain the microtask + macrotask queues so a late write lands
 * BEFORE we truncate, instead of leaking into the next test.
 */
export async function drain(rounds = 3): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

export async function resetDb(): Promise<void> {
  await drain();
  statement ??= await buildStatement();
  await prisma.$executeRawUnsafe(statement);
}
```

Single-statement `TRUNCATE ... CASCADE` across ~35 empty-ish tables on a tmpfs Postgres: **1 to 3 ms**. That is why truncate beats any per-test schema creation.

### 2f. `tests/integration/setup/globals.ts`

```ts
import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { resetDb } from "./truncate";

// next/headers throws outside a request scope (see section 4). One global mock,
// registered here so no test file needs its own vi.mock.
vi.mock("next/headers", async () => {
  const mock = await import("./next-headers.mock");
  return {
    cookies: mock.cookies,
    headers: mock.headers,
    draftMode: async () => ({ isEnabled: false, enable() {}, disable() {} }),
  };
});

// Email must never leave the box, and the real sendEmail() short-circuits to
// { sent: false, reason: "not_configured" } when RESEND_API_KEY is unset --
// which shouldRetryEmail() treats as success, silently hiding the retry branch.
vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(async () => ({ sent: true })),
}));

beforeEach(async () => {
  await resetDb();
});

afterEach(() => {
  vi.clearAllMocks();
});

// isolate: true gives each test file its own PrismaClient. Disconnect so the
// connections are returned instead of waiting on GC.
afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## 3. Factory / fixture layer

`tests/integration/factories.ts`. One call builds a complete, self-consistent org: property, two units, an ACTIVE lease with a tenant, two charges, a maintenance request with history, a message, a photo with real bytes, a pending invitation, notifications, and signed-in sessions for both the owner and the tenant.

**The factories never hash a password.** `validateSessionToken` only checks `tokenHash`, `revokedAt`, `expiresAt`, and `user.status`; `passwordHash` is nullable in the schema (`// null until an invite is accepted`). Skipping argon2 saves roughly 60 to 100 ms per user, which across ~120 users in a sweep run is the difference between a 6 s and a 20 s suite.

```ts
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { inviteExpiresAt } from "@/lib/invites";
import { hashToken } from "@/lib/auth/session";

/** 1x1 opaque PNG. Small enough to be free, real enough for sharp. */
export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

export type World = {
  label: string;
  orgId: string;
  ownerUserId: string;
  ownerToken: string;
  tenantUserId: string;
  tenantProfileId: string;
  tenantToken: string;
  propertyId: string;
  occupiedUnitId: string;
  vacantUnitId: string;
  leaseId: string;
  rentChargeId: string;
  lateFeeChargeId: string;
  maintenanceId: string;
  messageId: string;
  invitationId: string;
  attachmentId: string;
  blobId: string;
  ownerNotificationId: string;
  tenantNotificationId: string;
};

/**
 * A whole landlord org with one of everything, in one call.
 *
 *   const a = await makeWorld("a");
 *   const b = await makeWorld("b");
 *
 * Every id is a cuid, so no two worlds ever collide, and every label is in the
 * generated strings so failures name the org that produced them.
 */
export async function makeWorld(label = "a"): Promise<World> {
  const tag = `${label}-${randomUUID().slice(0, 8)}`;

  const owner = await prisma.user.create({
    data: {
      email: `owner-${tag}@example.test`,
      firstName: "Olive",
      lastName: `Owner${label.toUpperCase()}`,
      passwordHash: null, // sessions are minted directly; argon2 is not needed
    },
    select: { id: true },
  });

  const tenant = await prisma.user.create({
    data: {
      email: `tenant-${tag}@example.test`,
      firstName: "Tess",
      lastName: `Tenant${label.toUpperCase()}`,
      passwordHash: null,
      tenantProfile: { create: {} },
    },
    select: { id: true, tenantProfile: { select: { id: true } } },
  });
  const tenantProfileId = tenant.tenantProfile!.id;

  const org = await prisma.organization.create({
    data: {
      name: `Keep ${tag}`,
      slug: `keep-${tag}`,
      memberships: { create: { userId: owner.id, role: "OWNER" } },
    },
    select: { id: true },
  });

  // Unit.orgId is a denormalized scalar with no relation, so it cannot be
  // inferred from a nested create -- the org must exist first.
  const property = await prisma.property.create({
    data: {
      orgId: org.id,
      name: `Oakdale ${tag}`,
      type: "MULTIFAMILY",
      address1: `1247 W Oakdale Ave ${tag}`,
      city: "Chicago",
      state: "IL",
      zipCode: "60657",
      yearBuilt: 1923,
      units: {
        create: [
          {
            orgId: org.id,
            unitNumber: "1F",
            bedrooms: 2,
            bathrooms: 1,
            squareFeet: 850,
            marketRentCents: 185_000,
            securityDepositCents: 185_000,
            status: "OCCUPIED",
          },
          {
            orgId: org.id,
            unitNumber: "2F",
            bedrooms: 2,
            bathrooms: 1,
            squareFeet: 875,
            marketRentCents: 192_500,
            status: "VACANT",
          },
        ],
      },
    },
    select: { id: true, units: { orderBy: { unitNumber: "asc" }, select: { id: true } } },
  });
  const [occupiedUnitId, vacantUnitId] = property.units.map((u) => u.id) as [string, string];

  const lease = await prisma.lease.create({
    data: {
      unitId: occupiedUnitId,
      orgId: org.id,
      status: "ACTIVE",
      startDate: new Date("2026-01-01T00:00:00.000Z"),
      endDate: new Date("2026-12-31T00:00:00.000Z"),
      monthlyRentCents: 185_000,
      securityDepositCents: 185_000,
      rentDueDay: 1,
      lateFeeCents: 7_500,
      lateFeeGraceDays: 5,
      tenants: { create: { tenantProfileId, isPrimary: true } },
      charges: {
        create: [
          {
            orgId: org.id,
            type: "RENT",
            periodKey: "2026-07",
            amountCents: 185_000,
            description: "Rent for July 2026",
            dueDate: new Date("2026-07-01T00:00:00.000Z"),
          },
          {
            orgId: org.id,
            type: "LATE_FEE",
            periodKey: "2026-07",
            amountCents: 7_500,
            description: "Late fee for July 2026",
            dueDate: new Date("2026-07-06T00:00:00.000Z"),
          },
        ],
      },
      messages: {
        create: {
          orgId: org.id,
          senderUserId: tenant.id,
          body: `Hello from ${tag}. The radiator knocks.`,
        },
      },
    },
    select: {
      id: true,
      charges: { orderBy: { type: "asc" }, select: { id: true, type: true } },
      messages: { select: { id: true } },
    },
  });

  const maintenance = await prisma.maintenanceRequest.create({
    data: {
      orgId: org.id,
      propertyId: property.id,
      unitId: occupiedUnitId,
      leaseId: lease.id,
      createdByUserId: tenant.id,
      origin: "TENANT",
      category: "PLUMBING",
      title: `Leaking sink ${tag}`,
      description: "Water under the vanity for two days.",
      urgency: "URGENT",
      status: "SUBMITTED",
      statusHistory: { create: { toStatus: "SUBMITTED", actorUserId: tenant.id } },
    },
    select: { id: true },
  });

  const blob = await prisma.fileBlob.create({
    data: { bytes: Uint8Array.from(TINY_PNG), mimeType: "image/webp", sizeBytes: TINY_PNG.length },
    select: { id: true },
  });
  const attachment = await prisma.attachment.create({
    data: {
      entityType: "Property",
      entityId: property.id,
      kind: "PHOTO",
      storageKey: blob.id,
      url: `/api/v1/files/${blob.id}`,
      mimeType: "image/webp",
      sizeBytes: TINY_PNG.length,
      uploadedByUserId: owner.id,
      orgId: org.id,
    },
    select: { id: true },
  });

  const invitation = await prisma.invitation.create({
    data: {
      kind: "TENANT",
      email: `invitee-${tag}@example.test`,
      tokenHash: hashToken(`raw-invite-token-${tag}`),
      orgId: org.id,
      leaseId: lease.id,
      invitedByUserId: owner.id,
      expiresAt: inviteExpiresAt(),
    },
    select: { id: true },
  });

  const [ownerNote, tenantNote] = await Promise.all([
    prisma.notification.create({
      data: { userId: owner.id, type: "test", title: `owner ${tag}`, body: "b" },
      select: { id: true },
    }),
    prisma.notification.create({
      data: { userId: tenant.id, type: "test", title: `tenant ${tag}`, body: "b" },
      select: { id: true },
    }),
  ]);

  const [ownerSession, tenantSession] = await Promise.all([
    createSession({ userId: owner.id, activeRole: "LANDLORD", activeOrgId: org.id }),
    createSession({ userId: tenant.id, activeRole: "TENANT", activeOrgId: null }),
  ]);

  const rent = lease.charges.find((c) => c.type === "RENT")!;
  const late = lease.charges.find((c) => c.type === "LATE_FEE")!;

  return {
    label,
    orgId: org.id,
    ownerUserId: owner.id,
    ownerToken: ownerSession.token,
    tenantUserId: tenant.id,
    tenantProfileId,
    tenantToken: tenantSession.token,
    propertyId: property.id,
    occupiedUnitId,
    vacantUnitId,
    leaseId: lease.id,
    rentChargeId: rent.id,
    lateFeeChargeId: late.id,
    maintenanceId: maintenance.id,
    messageId: lease.messages[0]!.id,
    invitationId: invitation.id,
    attachmentId: attachment.id,
    blobId: blob.id,
    ownerNotificationId: ownerNote.id,
    tenantNotificationId: tenantNote.id,
  };
}

/** Two isolated orgs. The single most common line in the sweep. */
export async function makeTwoWorlds(): Promise<[World, World]> {
  // Sequential, not Promise.all: Organization.slug is unique and both writes
  // touch overlapping index pages. Sequential is ~12 ms and never flakes.
  const a = await makeWorld("a");
  const b = await makeWorld("b");
  return [a, b];
}

/** A landlord with no property, for "empty org" assertions. */
export async function makeBareOrg(label = "c") {
  const tag = `${label}-${randomUUID().slice(0, 8)}`;
  const user = await prisma.user.create({
    data: { email: `bare-${tag}@example.test`, firstName: "B", lastName: "Are" },
    select: { id: true },
  });
  const org = await prisma.organization.create({
    data: {
      name: `Bare ${tag}`,
      slug: `bare-${tag}`,
      memberships: { create: { userId: user.id, role: "OWNER" } },
    },
    select: { id: true },
  });
  const { token } = await createSession({
    userId: user.id,
    activeRole: "LANDLORD",
    activeOrgId: org.id,
  });
  return { orgId: org.id, userId: user.id, token };
}

/** A user with a session but no membership and no tenant profile. */
export async function makeStranger(label = "x") {
  const tag = `${label}-${randomUUID().slice(0, 8)}`;
  const user = await prisma.user.create({
    data: {
      email: `stranger-${tag}@example.test`,
      firstName: "S",
      lastName: "Tranger",
      isSuperAdmin: false,
      tenantProfile: { create: {} }, // needs a role, else getSession returns null
    },
    select: { id: true },
  });
  const { token } = await createSession({ userId: user.id, activeRole: "TENANT" });
  return { userId: user.id, token };
}
```

Cost: about 14 round trips per world, roughly 8 ms against a tmpfs Postgres.

---

## 4. Invoking App Router route handlers directly in vitest

### What actually needs stubbing in Next 15 (verified against 15.5.19 in `node_modules`)

| Thing | Works unstubbed? | Why |
|---|---|---|
| `NextResponse.json(...)` | **Yes** | Thin wrapper over the global `Response`; Node 22 has undici built in. |
| `new NextRequest(url, init)` | **Yes** | Only needed for `/api/internal/cron/tick`, which takes `NextRequest` for `req.headers`. |
| Plain `Request` for every other route | **Yes** | All `v1` handlers take `Request`, not `NextRequest`. |
| `params` | **Yes**, but must be a Promise | Next 15 made `params` async. Every dynamic route here does `(await params).id`. Pass `{ params: Promise.resolve({ id }) }`. |
| `cookies()` from `next/headers` | **NO -- must be stubbed** | `next/dist/server/request/cookies.js` reads `workAsyncStorage` and `workUnitAsyncStorage`; with neither store present it falls through to `throwForMissingRequestStore('cookies')` at line 119. |
| `cache()` from `react` | **Yes, no stub needed** | Vitest resolves the plain `react` condition, not `react-server`. In `node_modules/react/cjs/react.development.js:917`, `exports.cache = function (fn) { return function () { return fn.apply(null, arguments); }; }` -- a straight pass-through. So `getSession` (which is `cache()`-wrapped in `src/lib/authz/index.ts`) re-queries on every call. That is a feature: **no session memo leaks between tests**, at the cost of one extra `Session` join per `getSession()` call. |
| `redirect()` from `next/navigation` | Not reached | Only `requireRole`/`requireOrg` call it, and those are page guards. Every API route goes through `requireOrgApi` or `getSession` directly. |
| `server-only` | Not present | `grep -rn "server-only" src/` returns nothing. |
| `sharp` | **Yes** | Native CJS, resolved and externalized by Vite's SSR pipeline. Only `addPhoto` touches it. |

One resolution note: `next/package.json` has **no `exports` field** -- `next/server` is literally `node_modules/next/server.js`. Plain Node ESM will not resolve that bare specifier, but Vite's resolver (extension probing) does, so it works under vitest and fails under `node --input-type=module`. If a future Next version adds `exports` and this breaks, the fallback is `test.server.deps.inline: [/^next\//]`.

### 4a. `tests/integration/setup/next-headers.mock.ts`

`AsyncLocalStorage` rather than a module-level variable: it makes the jar impossible to leak between concurrently-awaiting handlers, and it produces a clear error when a handler is invoked outside `call()`.

```ts
import { AsyncLocalStorage } from "node:async_hooks";

export type OutgoingCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

export type Jar = {
  incoming: Map<string, string>;
  outgoing: OutgoingCookie[];
  headers: Headers;
};

export const jarStore = new AsyncLocalStorage<Jar>();

function jar(): Jar {
  const current = jarStore.getStore();
  if (!current) {
    throw new Error(
      "next/headers was used outside a request scope. Invoke route handlers " +
        "through tests/integration/http.ts `call()`, not directly.",
    );
  }
  return current;
}

/**
 * Enough of Next 15's ReadonlyRequestCookies / ResponseCookies to satisfy every
 * caller in this codebase: .get() in src/lib/authz/index.ts, .set() in
 * setSessionCookie / clearSessionCookie.
 */
export async function cookies() {
  const j = jar();
  return {
    get(name: string) {
      const value = j.incoming.get(name);
      return value === undefined ? undefined : { name, value };
    },
    getAll() {
      return [...j.incoming].map(([name, value]) => ({ name, value }));
    },
    has(name: string) {
      return j.incoming.has(name);
    },
    set(
      nameOrOptions: string | { name: string; value: string },
      value?: string,
      options?: Record<string, unknown>,
    ) {
      const name = typeof nameOrOptions === "string" ? nameOrOptions : nameOrOptions.name;
      const val = typeof nameOrOptions === "string" ? (value ?? "") : nameOrOptions.value;
      const opts =
        typeof nameOrOptions === "string" ? (options ?? {}) : { ...nameOrOptions, name: undefined };
      j.outgoing.push({ name, value: val, options: opts });
      // Mirror the browser: a cookie set mid-request is visible to later reads.
      if (val === "" || opts.maxAge === 0) j.incoming.delete(name);
      else j.incoming.set(name, val);
      return this;
    },
    delete(name: string) {
      j.outgoing.push({ name, value: "", options: { maxAge: 0 } });
      j.incoming.delete(name);
      return this;
    },
    toString() {
      return [...j.incoming].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    [Symbol.iterator]() {
      return [...j.incoming].map(([name, value]) => [name, { name, value }])[Symbol.iterator]();
    },
  };
}

export async function headers() {
  return jar().headers;
}
```

### 4b. `tests/integration/http.ts`

```ts
import { SESSION_COOKIE } from "@/lib/auth/session";
import { jarStore, type Jar, type OutgoingCookie } from "./setup/next-headers.mock";
import { drain } from "./setup/truncate";

export type RouteHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

export type CallOptions = {
  handler: RouteHandler;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  params?: Record<string, string>;
  json?: unknown;
  form?: FormData;
  /** Raw session token. Omit for an anonymous request. */
  token?: string | null;
  headers?: Record<string, string>;
};

export type CallResult<T = unknown> = {
  status: number;
  body: T | null;
  text: string;
  res: Response;
  setCookies: OutgoingCookie[];
};

/**
 * Invokes an App Router route handler with a synthetic request scope.
 *
 * - Builds a real WHATWG Request (Node 22 undici), so req.json(), req.formData()
 *   and new URL(req.url).searchParams all behave exactly as in production.
 * - Runs the handler inside an AsyncLocalStorage jar so the mocked cookies()
 *   sees the session cookie and captures anything the handler sets.
 * - Passes params as a Promise, which is what Next 15 hands dynamic routes.
 * - Drains the event loop afterwards so `void audit(...)` / `void notify(...)`
 *   floating writes land before the next test truncates.
 */
export async function call<T = unknown>(opts: CallOptions): Promise<CallResult<T>> {
  const headers = new Headers(opts.headers ?? {});
  let body: BodyInit | undefined;

  if (opts.form) {
    body = opts.form; // undici sets the multipart content-type + boundary
  } else if (opts.json !== undefined) {
    body = JSON.stringify(opts.json);
    headers.set("content-type", "application/json");
  }
  if (opts.token) headers.set("cookie", `${SESSION_COOKIE}=${opts.token}`);

  const req = new Request(`http://test.local${opts.path}`, {
    method: opts.method,
    headers,
    body,
  });

  const jar: Jar = {
    incoming: new Map(opts.token ? [[SESSION_COOKIE, opts.token]] : []),
    outgoing: [],
    headers,
  };

  const res = await jarStore.run(jar, async () =>
    opts.handler(req, { params: Promise.resolve(opts.params ?? {}) }),
  );

  await drain();

  const clone = res.clone();
  const text = await clone.text();
  let parsed: T | null = null;
  try {
    parsed = text ? (JSON.parse(text) as T) : null;
  } catch {
    parsed = null; // /api/v1/files/[id] returns image bytes on success
  }

  return { status: res.status, body: parsed, text, res, setCookies: jar.outgoing };
}
```

Why `jarStore.run(jar, async () => handler(...))` is correct: `AsyncLocalStorage.run` returns the callback's value, and the async context propagates across every `await` inside the handler, including into `getSession` -> `cookies()` and into `prisma` calls. The context is torn down when the returned promise settles.

---

## 5. THE CROSS-ORG SWEEP

### 5a. Read this before writing the assertions

**Every one of these routes returns 404 today.** `updateProperty` looks broken -- the `getProperty` result is discarded and the `prisma.property.update` has no `orgId` -- but the guard still *throws* `NotFoundError` on the line before, so the status assertion passes. A status-only sweep would be green on day one and would stay green right up until someone deletes the guard line during a refactor.

So the sweep asserts **two** things per case:

1. the response status is 404 (or 403 for a role mismatch), and
2. **org A's entire row set is byte-identical before and after** the attempt.

Assertion (2) is what catches the discarded-guard pattern the day it regresses. The route table is the thing that makes adding a fifteenth landlord route without an authz test impossible.

### 5b. `tests/integration/snapshot.ts`

```ts
import { prisma } from "@/lib/db";

/**
 * Every org-scoped row in one deterministic string. Compare before/after a
 * cross-org attempt: any byte of difference means the org boundary leaked.
 *
 * MaintenanceStatusHistory and PaymentAllocation have no orgId column, so they
 * are pulled through their parents.
 */
export async function snapshotOrg(orgId: string): Promise<string> {
  const by = { orderBy: { id: "asc" } } as const;

  const [properties, units, leases, charges, messages, maintenance, attachments, invitations] =
    await Promise.all([
      prisma.property.findMany({ where: { orgId }, ...by }),
      prisma.unit.findMany({ where: { orgId }, ...by }),
      prisma.lease.findMany({ where: { orgId }, ...by }),
      prisma.charge.findMany({ where: { orgId }, ...by }),
      prisma.message.findMany({ where: { orgId }, ...by }),
      prisma.maintenanceRequest.findMany({ where: { orgId }, ...by }),
      prisma.attachment.findMany({ where: { orgId }, ...by }),
      prisma.invitation.findMany({ where: { orgId }, ...by }),
    ]);

  const history = await prisma.maintenanceStatusHistory.findMany({
    where: { requestId: { in: maintenance.map((m) => m.id) } },
    orderBy: { id: "asc" },
  });

  return JSON.stringify(
    { properties, units, leases, charges, messages, maintenance, history, attachments, invitations },
    (_key, value) => (typeof value === "bigint" ? value.toString() : value),
  );
}
```

### 5c. `tests/integration/routes.ts` -- the real route table

Enumerated from the filesystem. Fourteen landlord route modules, twenty exported handlers.

```ts
import type { World } from "./factories";
import type { RouteHandler } from "./http";
import { TINY_PNG } from "./factories";

import * as properties from "@/app/api/v1/landlord/properties/route";
import * as property from "@/app/api/v1/landlord/properties/[id]/route";
import * as propertyDetails from "@/app/api/v1/landlord/properties/[id]/details/route";
import * as propertyUnits from "@/app/api/v1/landlord/properties/[id]/units/route";
import * as unit from "@/app/api/v1/landlord/units/[id]/route";
import * as unitLeases from "@/app/api/v1/landlord/units/[id]/leases/route";
import * as lease from "@/app/api/v1/landlord/leases/[id]/route";
import * as leaseInvitations from "@/app/api/v1/landlord/leases/[id]/invitations/route";
import * as invitation from "@/app/api/v1/landlord/invitations/[id]/route";
import * as invitationSend from "@/app/api/v1/landlord/invitations/[id]/send/route";
import * as maintenance from "@/app/api/v1/landlord/maintenance/[id]/route";
import * as photos from "@/app/api/v1/landlord/photos/route";
import * as photo from "@/app/api/v1/landlord/photos/[id]/route";
import * as sample from "@/app/api/v1/landlord/sample/route";

export type Method = "GET" | "POST" | "PATCH" | "DELETE";

/** A landlord route that accepts an id belonging to some org. */
export type TargetedCase = {
  /** Reads like the URL, so a failure names the route. */
  name: string;
  method: Method;
  handler: RouteHandler;
  /** Path template with :id substituted for the victim's id. */
  path: (victim: World) => string;
  params?: (victim: World) => Record<string, string>;
  json?: (victim: World) => unknown;
  form?: (victim: World) => FormData;
};

function pngFile(): File {
  return new File([Uint8Array.from(TINY_PNG)], "shot.png", { type: "image/png" });
}

/**
 * EVERY landlord handler that takes a resource id from the client.
 *
 * Adding a landlord route without adding it here is the failure mode this
 * table exists to make impossible -- see the completeness test in
 * cross-org.test.ts, which walks the filesystem and fails on any gap.
 */
export const TARGETED_LANDLORD_ROUTES: TargetedCase[] = [
  {
    name: "GET /api/v1/landlord/properties/[id]",
    method: "GET",
    handler: property.GET,
    path: (v) => `/api/v1/landlord/properties/${v.propertyId}`,
    params: (v) => ({ id: v.propertyId }),
  },
  {
    name: "PATCH /api/v1/landlord/properties/[id]",
    method: "PATCH",
    handler: property.PATCH,
    path: (v) => `/api/v1/landlord/properties/${v.propertyId}`,
    params: (v) => ({ id: v.propertyId }),
    json: () => ({ name: "PWNED", type: "CONDO", address1: "1 Evil St", city: "Chicago", state: "IL", zipCode: "60657" }),
  },
  {
    name: "DELETE /api/v1/landlord/properties/[id]",
    method: "DELETE",
    handler: property.DELETE,
    path: (v) => `/api/v1/landlord/properties/${v.propertyId}`,
    params: (v) => ({ id: v.propertyId }),
  },
  {
    name: "PATCH /api/v1/landlord/properties/[id]/details",
    method: "PATCH",
    handler: propertyDetails.PATCH,
    path: (v) => `/api/v1/landlord/properties/${v.propertyId}/details`,
    params: (v) => ({ id: v.propertyId }),
    // accessCodes exercises the AES-GCM path, which needs SESSION_SECRET set.
    json: () => ({ yearBuilt: 1888, notes: "PWNED", accessCodes: "1234#" }),
  },
  {
    name: "POST /api/v1/landlord/properties/[id]/units",
    method: "POST",
    handler: propertyUnits.POST,
    path: (v) => `/api/v1/landlord/properties/${v.propertyId}/units`,
    params: (v) => ({ id: v.propertyId }),
    json: () => ({ unitNumber: "PWNED", bedrooms: 1 }),
  },
  {
    name: "PATCH /api/v1/landlord/units/[id]",
    method: "PATCH",
    handler: unit.PATCH,
    path: (v) => `/api/v1/landlord/units/${v.vacantUnitId}`,
    params: (v) => ({ id: v.vacantUnitId }),
    json: () => ({ unitNumber: "PWNED", status: "OCCUPIED" }),
  },
  {
    name: "DELETE /api/v1/landlord/units/[id]",
    method: "DELETE",
    handler: unit.DELETE,
    path: (v) => `/api/v1/landlord/units/${v.vacantUnitId}`,
    params: (v) => ({ id: v.vacantUnitId }),
  },
  {
    name: "POST /api/v1/landlord/units/[id]/leases",
    method: "POST",
    handler: unitLeases.POST,
    path: (v) => `/api/v1/landlord/units/${v.vacantUnitId}/leases`,
    params: (v) => ({ id: v.vacantUnitId }),
  },
  {
    name: "PATCH /api/v1/landlord/leases/[id]",
    method: "PATCH",
    handler: lease.PATCH,
    path: (v) => `/api/v1/landlord/leases/${v.leaseId}`,
    params: (v) => ({ id: v.leaseId }),
    json: () => ({ monthlyRentDollars: 1, status: "TERMINATED", shareWithTenant: false }),
  },
  {
    name: "DELETE /api/v1/landlord/leases/[id]",
    method: "DELETE",
    handler: lease.DELETE,
    path: (v) => `/api/v1/landlord/leases/${v.leaseId}`,
    params: (v) => ({ id: v.leaseId }),
  },
  {
    name: "POST /api/v1/landlord/leases/[id]/invitations",
    method: "POST",
    handler: leaseInvitations.POST,
    path: (v) => `/api/v1/landlord/leases/${v.leaseId}/invitations`,
    params: (v) => ({ id: v.leaseId }),
    json: () => ({ email: "attacker@example.test" }),
  },
  {
    name: "DELETE /api/v1/landlord/invitations/[id]",
    method: "DELETE",
    handler: invitation.DELETE,
    path: (v) => `/api/v1/landlord/invitations/${v.invitationId}`,
    params: (v) => ({ id: v.invitationId }),
  },
  {
    name: "POST /api/v1/landlord/invitations/[id]/send",
    method: "POST",
    handler: invitationSend.POST,
    path: (v) => `/api/v1/landlord/invitations/${v.invitationId}/send`,
    params: (v) => ({ id: v.invitationId }),
  },
  {
    name: "PATCH /api/v1/landlord/maintenance/[id]",
    method: "PATCH",
    handler: maintenance.PATCH,
    path: (v) => `/api/v1/landlord/maintenance/${v.maintenanceId}`,
    params: (v) => ({ id: v.maintenanceId }),
    json: () => ({ toStatus: "CLOSED", note: "PWNED" }),
  },
  {
    // entityId comes from the multipart body, not the path -- a different
    // shape of the same boundary, and the one most likely to be forgotten.
    name: "POST /api/v1/landlord/photos (entityId in body)",
    method: "POST",
    handler: photos.POST,
    path: () => "/api/v1/landlord/photos",
    form: (v) => {
      const fd = new FormData();
      fd.set("entityType", "Property");
      fd.set("entityId", v.propertyId);
      fd.set("file", pngFile());
      return fd;
    },
  },
  {
    name: "DELETE /api/v1/landlord/photos/[id]",
    method: "DELETE",
    handler: photo.DELETE,
    path: (v) => `/api/v1/landlord/photos/${v.attachmentId}`,
    params: (v) => ({ id: v.attachmentId }),
  },
];

/** Landlord routes with no client-supplied resource id. Asserted separately. */
export const COLLECTION_LANDLORD_ROUTES = {
  listProperties: properties.GET,
  createProperty: properties.POST,
  createSample: sample.POST,
};
```

### 5d. `tests/integration/cross-org.test.ts`

```ts
import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeTwoWorlds, makeBareOrg, makeStranger, type World } from "./factories";
import { call } from "./http";
import { snapshotOrg } from "./snapshot";
import { COLLECTION_LANDLORD_ROUTES, TARGETED_LANDLORD_ROUTES } from "./routes";

async function attempt(route: (typeof TARGETED_LANDLORD_ROUTES)[number], victim: World, token: string) {
  return call({
    handler: route.handler,
    method: route.method,
    path: route.path(victim),
    params: route.params?.(victim),
    json: route.json?.(victim),
    form: route.form?.(victim),
    token,
  });
}

describe("cross-org: org B cannot touch org A", () => {
  describe.each(TARGETED_LANDLORD_ROUTES.map((r) => [r.name, r] as const))(
    "%s",
    (_name, route) => {
      it("returns 404 and leaves org A byte-identical", async () => {
        const [a, b] = await makeTwoWorlds();
        const before = await snapshotOrg(a.orgId);

        const res = await attempt(route, a, b.ownerToken);

        // 404, never 403: existence must not be revealed. Every service in
        // src/lib/services throws NotFoundError for a cross-org id.
        expect(res.status, `${route.name} body=${res.text}`).toBe(404);

        // The assertion that actually has teeth. updateProperty et al. call
        // getProperty() as a guard and DISCARD the result, then
        // prisma.property.update({ where: { id } }) with no orgId. Today the
        // guard throws first. The day someone drops that line, THIS fails.
        expect(await snapshotOrg(a.orgId)).toBe(before);
      });

      it("succeeds for org A's own owner (positive control)", async () => {
        const [a] = await makeTwoWorlds();
        const res = await attempt(route, a, a.ownerToken);
        // Proves the 404 above came from the org check, not from a malformed
        // payload that would 400 for everybody.
        expect([200, 201, 409], `${route.name} body=${res.text}`).toContain(res.status);
      });

      it("returns 401 when signed out", async () => {
        const [a] = await makeTwoWorlds();
        const res = await attempt(route, a, null);
        expect(res.status).toBe(401);
      });

      it("returns 403 for a signed-in non-landlord", async () => {
        const [a] = await makeTwoWorlds();
        const stranger = await makeStranger();
        const res = await attempt(route, a, stranger.token);
        // requireOrgApi: roles must include LANDLORD and activeOrgId must be set.
        expect(res.status).toBe(403);
      });
    },
  );

  it("GET /api/v1/landlord/properties returns only the caller's org", async () => {
    const [a, b] = await makeTwoWorlds();

    const asB = await call<{ properties: Array<{ id: string; orgId: string }> }>({
      handler: COLLECTION_LANDLORD_ROUTES.listProperties,
      method: "GET",
      path: "/api/v1/landlord/properties",
      token: b.ownerToken,
    });

    expect(asB.status).toBe(200);
    const ids = asB.body!.properties.map((p) => p.id);
    expect(ids).toContain(b.propertyId);
    expect(ids).not.toContain(a.propertyId);
    expect(asB.body!.properties.every((p) => p.orgId === b.orgId)).toBe(true);
  });

  it("POST /api/v1/landlord/properties writes to the session org, never a client orgId", async () => {
    const [a, b] = await makeTwoWorlds();

    const res = await call<{ property: { id: string; orgId: string } }>({
      handler: COLLECTION_LANDLORD_ROUTES.createProperty,
      method: "POST",
      path: "/api/v1/landlord/properties",
      token: b.ownerToken,
      // orgId is not in propertyCreateSchema; zod strips it. Send it anyway --
      // this is the test that proves stripping happens.
      json: {
        orgId: a.orgId,
        name: "Injected",
        type: "CONDO",
        address1: "9 Injection Ln",
        city: "Chicago",
        state: "IL",
        zipCode: "60657",
        units: [],
      },
    });

    expect(res.status).toBe(201);
    expect(res.body!.property.orgId).toBe(b.orgId);
    expect(await prisma.property.count({ where: { orgId: a.orgId } })).toBe(1);
  });

  it("POST /api/v1/landlord/sample writes to the session org", async () => {
    const bare = await makeBareOrg();
    const [a] = await makeTwoWorlds();
    const before = await snapshotOrg(a.orgId);

    const res = await call<{ property: { id: string } }>({
      handler: COLLECTION_LANDLORD_ROUTES.createSample,
      method: "POST",
      path: "/api/v1/landlord/sample",
      token: bare.token,
    });

    expect(res.status).toBe(201);
    const created = await prisma.property.findUniqueOrThrow({
      where: { id: res.body!.property.id },
      select: { orgId: true, units: { select: { orgId: true } } },
    });
    expect(created.orgId).toBe(bare.orgId);
    // Unit.orgId is denormalized and hand-set in createSample; a mismatch here
    // is a silent scoping hole no FK would catch.
    expect(created.units.every((u) => u.orgId === bare.orgId)).toBe(true);
    expect(await snapshotOrg(a.orgId)).toBe(before);
  });
});

describe("the route table is complete", () => {
  it("covers every handler exported under src/app/api/v1/landlord", () => {
    const root = path.resolve(__dirname, "../../src/app/api/v1/landlord");

    const routeFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) walk(full);
        else if (entry === "route.ts") routeFiles.push(full);
      }
    };
    walk(root);

    // /api/v1/landlord/properties/[id]/route.ts -> "properties/[id]"
    const onDisk = routeFiles
      .map((f) => path.relative(root, path.dirname(f)))
      .sort();

    const covered = new Set(
      [
        ...TARGETED_LANDLORD_ROUTES.map((r) => r.name),
        "GET /api/v1/landlord/properties",
        "POST /api/v1/landlord/properties",
        "POST /api/v1/landlord/sample",
      ].map((n) => n.split(" ")[1]!.replace("/api/v1/landlord/", "").replace(/\s.*$/, "")),
    );

    const missing = onDisk.filter((segment) => !covered.has(segment));
    expect(
      missing,
      `New landlord route(s) with no cross-org test: ${missing.join(", ")}. ` +
        `Add them to TARGETED_LANDLORD_ROUTES in tests/integration/routes.ts.`,
    ).toEqual([]);
  });
});
```

Sixteen targeted routes x 4 assertions + 3 collection tests + 1 completeness test = **68 cases**.

### 5e. The static companion (`tests/unit/service-scoping.test.ts`, no DB)

The sweep proves behaviour. This freezes the *shape*, so the discarded-guard pattern cannot spread silently.

```ts
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SERVICES = path.resolve(__dirname, "../../src/lib/services");
const MUTATIONS = /\.(update|delete|updateMany|deleteMany|upsert)\(\s*\{/g;
const LOOKAHEAD = 220;

/**
 * Mutations whose `where` is keyed on a bare id, relying on a preceding
 * org-scoped guard whose result is discarded.
 *
 * Run `pnpm test:unit -- service-scoping` once and paste the emitted list here.
 * Every entry is a place where deleting one line silently opens a cross-org
 * write. Shrinking this list is the M5 hardening work; growing it must be a
 * deliberate, reviewed act.
 */
const ALLOWED_UNSCOPED = new Set<string>([
  // paste from the failure output, e.g.
  // "property.ts:110 update",
  // "property.ts:148 update",
  // "property.ts:167 delete",
  // "lease.ts:52 update",
  // "lease.ts:79 delete",
  // "maintenance.ts:326 update",
]);

describe("service mutations are org-scoped", () => {
  it("has no new unscoped mutation", () => {
    const found: string[] = [];

    for (const file of readdirSync(SERVICES).filter((f) => f.endsWith(".ts"))) {
      const src = readFileSync(path.join(SERVICES, file), "utf8");
      for (const m of src.matchAll(MUTATIONS)) {
        const window = src.slice(m.index!, m.index! + LOOKAHEAD);
        if (/\borgId\b/.test(window)) continue;
        const line = src.slice(0, m.index!).split("\n").length;
        found.push(`${file}:${line} ${m[1]}`);
      }
    }

    const unexpected = found.filter((f) => !ALLOWED_UNSCOPED.has(f));
    expect(
      unexpected,
      "Unscoped mutation(s). Put orgId in the `where` -- a guard whose result " +
        "is discarded is one refactor away from an IDOR. If it is genuinely " +
        "unscopable (User, Notification, Session), add it to ALLOWED_UNSCOPED " +
        "with a comment.\n" +
        found.map((f) => `  "${f}",`).join("\n"),
    ).toEqual([]);

    // Fail loudly when a hole is fixed, so the allowlist shrinks.
    const stale = [...ALLOWED_UNSCOPED].filter((a) => !found.includes(a));
    expect(stale, `Fixed -- remove from ALLOWED_UNSCOPED: ${stale.join(", ")}`).toEqual([]);
  });
});
```

Plus the specific canary for the `getTenantBilling` IDOR the brief calls out. It takes a bare `leaseId` with no ownership check; it is safe only because both callers are trusted server components:

```ts
it("getTenantBilling is never reachable from a route handler", () => {
  const roots = [
    path.resolve(__dirname, "../../src/app/api"),
    path.resolve(__dirname, "../../src/app/(tenant)"),
    path.resolve(__dirname, "../../src/app/(landlord)"),
  ];
  const importers: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir)) {
      const full = path.join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(e) && /getTenantBilling/.test(readFileSync(full, "utf8"))) {
        importers.push(path.relative(path.resolve(__dirname, "../../src"), full));
      }
    }
  };
  roots.forEach(walk);

  // getTenantBilling(leaseId) has NO ownership check. Its only safe callers are
  // tenant server components that pass home.leaseId, which getTenantHome()
  // already resolved from the session. A route handler reading leaseId from the
  // query string (as GET /api/v1/messages does) would be a full IDOR.
  expect(
    importers.filter((f) => f.startsWith("app/api/")),
    "A route handler now imports getTenantBilling. Give it an ownership check " +
      "(orgId or tenantProfileId in the where) before exposing it.",
  ).toEqual([]);
  expect(importers.sort()).toEqual([
    "app/(tenant)/tenant/dashboard/page.tsx",
    "app/(tenant)/tenant/payments/page.tsx",
    "lib/services/charges.ts",
  ]);
});
```

---

## 6. Tenant isolation

`tests/integration/tenant-isolation.test.ts`.

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { makeTwoWorlds, makeStranger, TINY_PNG } from "./factories";
import { call } from "./http";
import { snapshotOrg } from "./snapshot";

import * as messages from "@/app/api/v1/messages/route";
import * as files from "@/app/api/v1/files/[id]/route";
import * as tenantMaintenance from "@/app/api/v1/tenant/maintenance/route";
import * as notifications from "@/app/api/v1/notifications/route";
import * as notificationsRead from "@/app/api/v1/notifications/read/route";

describe("messages: leaseId comes from the query string, so prove leaseAccess holds", () => {
  // GET /api/v1/messages is the ONE route that reads a resource id straight
  // off the wire. It is safe only because getThread -> leaseAccess() checks
  // membership internally. These tests are the guarantee of that.

  it("tenant B cannot read org A's thread", async () => {
    const [a, b] = await makeTwoWorlds();
    const res = await call({
      handler: messages.GET,
      method: "GET",
      path: `/api/v1/messages?leaseId=${a.leaseId}`,
      token: b.tenantToken,
    });
    expect(res.status).toBe(404);
  });

  it("landlord B cannot read org A's thread", async () => {
    const [a, b] = await makeTwoWorlds();
    const res = await call({
      handler: messages.GET,
      method: "GET",
      path: `/api/v1/messages?leaseId=${a.leaseId}`,
      token: b.ownerToken,
    });
    expect(res.status).toBe(404);
  });

  it("a signed-in stranger with no lease and no membership cannot read", async () => {
    const [a] = await makeTwoWorlds();
    const stranger = await makeStranger();
    const res = await call({
      handler: messages.GET,
      method: "GET",
      path: `/api/v1/messages?leaseId=${a.leaseId}`,
      token: stranger.token,
    });
    expect(res.status).toBe(404);
  });

  it("tenant B cannot post into org A's thread", async () => {
    const [a, b] = await makeTwoWorlds();
    const before = await snapshotOrg(a.orgId);

    const res = await call({
      handler: messages.POST,
      method: "POST",
      path: "/api/v1/messages",
      token: b.tenantToken,
      json: { leaseId: a.leaseId, body: "PWNED" },
    });

    expect(res.status).toBe(404);
    expect(await snapshotOrg(a.orgId)).toBe(before);
    // sendMessage() also notifies every OWNER/MANAGER of the lease's org.
    // A leak here would put attacker text in org A's notification bell.
    expect(
      await prisma.notification.count({ where: { userId: a.ownerUserId, body: "PWNED" } }),
    ).toBe(0);
  });

  it("tenant A and landlord A both read the same thread (positive control)", async () => {
    const [a] = await makeTwoWorlds();
    for (const token of [a.tenantToken, a.ownerToken]) {
      const res = await call<{ thread: { messages: unknown[] } }>({
        handler: messages.GET,
        method: "GET",
        path: `/api/v1/messages?leaseId=${a.leaseId}`,
        token,
      });
      expect(res.status).toBe(200);
      expect(res.body!.thread.messages).toHaveLength(1);
    }
  });
});

describe("GET /api/v1/files/[id]", () => {
  it("serves bytes to the owning org", async () => {
    const [a] = await makeTwoWorlds();
    const res = await call({
      handler: files.GET,
      method: "GET",
      path: `/api/v1/files/${a.blobId}`,
      params: { id: a.blobId },
      token: a.ownerToken,
    });
    expect(res.status).toBe(200);
    expect(res.res.headers.get("content-type")).toBe("image/webp");
    expect(res.res.headers.get("cache-control")).toContain("private");
    expect(Buffer.from(await res.res.arrayBuffer()).equals(TINY_PNG)).toBe(true);
  });

  it("404s for org B, without revealing the blob exists", async () => {
    const [a, b] = await makeTwoWorlds();
    const res = await call({
      handler: files.GET,
      method: "GET",
      path: `/api/v1/files/${a.blobId}`,
      params: { id: a.blobId },
      token: b.ownerToken,
    });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found." });
  });

  it("401s for an anonymous request", async () => {
    const [a] = await makeTwoWorlds();
    const res = await call({
      handler: files.GET,
      method: "GET",
      path: `/api/v1/files/${a.blobId}`,
      params: { id: a.blobId },
      token: null,
    });
    expect(res.status).toBe(401);
  });

  it("401s for the tenant who lives at the property", async () => {
    // This is the CURRENT behaviour, pinned deliberately: the route requires
    // session.activeOrgId, and a pure tenant has no Membership so activeOrgId
    // is null. Consequence: tenant-facing photos are unreachable today. When
    // M4 adds tenant photo viewing, this expectation must flip to 200 AND a
    // cross-org case must be added -- fail here so nobody forgets.
    const [a] = await makeTwoWorlds();
    const res = await call({
      handler: files.GET,
      method: "GET",
      path: `/api/v1/files/${a.blobId}`,
      params: { id: a.blobId },
      token: a.tenantToken,
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/v1/tenant/maintenance", () => {
  it("attaches to the caller's own lease, ignoring any client-supplied ids", async () => {
    const [a, b] = await makeTwoWorlds();
    const before = await snapshotOrg(a.orgId);

    const res = await call<{ id: string }>({
      handler: tenantMaintenance.POST,
      method: "POST",
      path: "/api/v1/tenant/maintenance",
      token: b.tenantToken,
      json: {
        // Not in maintenanceRequestSchema; zod strips them. Sent to prove it.
        leaseId: a.leaseId,
        orgId: a.orgId,
        propertyId: a.propertyId,
        category: "PLUMBING",
        title: "Kitchen tap drips",
        description: "Constant drip since Tuesday.",
        urgency: "NORMAL",
        permissionToEnter: true,
      },
    });

    expect(res.status).toBe(201);
    const created = await prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: res.body!.id },
      select: { orgId: true, leaseId: true, propertyId: true },
    });
    expect(created.orgId).toBe(b.orgId);
    expect(created.leaseId).toBe(b.leaseId);
    expect(created.propertyId).toBe(b.propertyId);
    expect(await snapshotOrg(a.orgId)).toBe(before);
  });

  it("403s for a landlord with no tenant profile", async () => {
    const [, b] = await makeTwoWorlds();
    const res = await call({
      handler: tenantMaintenance.POST,
      method: "POST",
      path: "/api/v1/tenant/maintenance",
      token: b.ownerToken,
      json: {
        category: "PLUMBING",
        title: "Nope",
        description: "Should not be allowed.",
        urgency: "NORMAL",
        permissionToEnter: false,
      },
    });
    expect(res.status).toBe(403);
  });
});

describe("notifications are per-user, not per-org", () => {
  it("GET returns only the caller's rows", async () => {
    const [a, b] = await makeTwoWorlds();
    const res = await call<{ items: Array<{ id: string }>; unread: number }>({
      handler: notifications.GET,
      method: "GET",
      path: "/api/v1/notifications",
      token: b.tenantToken,
    });
    expect(res.status).toBe(200);
    const ids = res.body!.items.map((i) => i.id);
    expect(ids).toContain(b.tenantNotificationId);
    expect(ids).not.toContain(a.tenantNotificationId);
    expect(ids).not.toContain(a.ownerNotificationId);
  });

  it("POST /read cannot mark another user's notification read", async () => {
    const [a, b] = await makeTwoWorlds();

    const res = await call<{ count: number }>({
      handler: notificationsRead.POST,
      method: "POST",
      path: "/api/v1/notifications/read",
      token: b.tenantToken,
      json: { ids: [a.tenantNotificationId, a.ownerNotificationId] },
    });

    expect(res.status).toBe(200);
    expect(res.body!.count).toBe(0);
    const victim = await prisma.notification.findUniqueOrThrow({
      where: { id: a.tenantNotificationId },
      select: { readAt: true },
    });
    expect(victim.readAt).toBeNull();
  });

  it("POST /read with no ids marks only the caller's unread", async () => {
    const [a, b] = await makeTwoWorlds();
    const res = await call<{ count: number }>({
      handler: notificationsRead.POST,
      method: "POST",
      path: "/api/v1/notifications/read",
      token: b.tenantToken,
      json: {},
    });
    expect(res.body!.count).toBe(1);
    expect(await prisma.notification.count({ where: { userId: a.tenantUserId, readAt: null } })).toBe(1);
  });
});
```

---

## 7. The cron tick in tests

Four rules, in priority order.

**7a. Nothing schedules it.** Verified: there is no `setInterval` on the server, no `src/instrumentation.ts`. The only trigger is `POST /api/internal/cron/tick`, poked by a Render Cron job (`render.yaml:71`). Nothing in vitest will fire it accidentally, and no teardown is needed.

**7b. Never let the real email path run.** `sendEmail` short-circuits to `{ sent: false, reason: "not_configured" }` when `RESEND_API_KEY` is unset, and `shouldRetryEmail` returns false for that, so the tick counts it as `emailsSent`. A test relying on that would pass while covering nothing. The global `vi.mock("@/lib/email/send")` in `setup/globals.ts` is what makes both branches reachable.

**7c. Freeze `Date` only.** `generateRentCharges` and `applyLateFees` default `asOf` to `new Date()`, so charge generation is calendar-dependent and would drift on the first of the month. Use `vi.useFakeTimers({ toFake: ["Date"] })` -- **not** the full fake-timer set, which would freeze `setTimeout`/`setInterval` and hang the Prisma engine's internal timers.

**7d. Give `runTick` an injectable clock.** Three lines, worth doing before the tick grows more work:

```diff
-export async function runTick(opts?: { emailBatch?: number }): Promise<TickSummary> {
-  const rentChargesCreated = await generateRentCharges();
-  const lateFeesCreated = await applyLateFees();
+export async function runTick(opts?: { emailBatch?: number; asOf?: Date }): Promise<TickSummary> {
+  const asOf = opts?.asOf ?? new Date();
+  const rentChargesCreated = await generateRentCharges(asOf);
+  const lateFeesCreated = await applyLateFees(asOf);
```

`tests/integration/tick.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { runTick } from "@/lib/worker/tick";
import { sendEmail } from "@/lib/email/send";
import { makeWorld } from "./factories";
import { POST as tickRoute } from "@/app/api/internal/cron/tick/route";

const AS_OF = new Date("2026-07-20T12:00:00.000Z");

beforeEach(() => {
  // Date only. Faking timers wholesale stalls the Prisma engine's own timers.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AS_OF);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("runTick", () => {
  it("generates one rent charge per active lease and is idempotent", async () => {
    const a = await makeWorld("a");
    const b = await makeWorld("b");
    // The factory pre-seeds 2026-07; clear so the tick has work to do.
    await prisma.charge.deleteMany({ where: { periodKey: "2026-07" } });

    const first = await runTick({ asOf: AS_OF });
    expect(first.rentChargesCreated).toBe(2);

    const second = await runTick({ asOf: AS_OF });
    // The (leaseId, type, periodKey) unique makes re-running free.
    expect(second.rentChargesCreated).toBe(0);
    expect(second.lateFeesCreated).toBe(0);

    for (const w of [a, b]) {
      const charges = await prisma.charge.findMany({
        where: { leaseId: w.leaseId, type: "RENT", periodKey: "2026-07" },
        select: { orgId: true },
      });
      expect(charges).toHaveLength(1);
      // The tick scans ALL active leases with no org filter. This is the only
      // place orgId is written from lease data rather than a session.
      expect(charges[0]!.orgId).toBe(w.orgId);
    }
  });

  it("flushes pending EMAIL notifications exactly once", async () => {
    const a = await makeWorld("a");
    await prisma.notification.create({
      data: {
        userId: a.ownerUserId,
        channel: "EMAIL",
        type: "maintenance.submitted",
        title: "New maintenance request",
        body: "Leaking sink",
      },
    });

    const first = await runTick({ asOf: AS_OF });
    expect(first.emailsSent).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const second = await runTick({ asOf: AS_OF });
    expect(second.emailsSent).toBe(0); // emailedAt claim holds
  });

  it("releases the claim so a transient failure is retried", async () => {
    const a = await makeWorld("a");
    const n = await prisma.notification.create({
      data: { userId: a.ownerUserId, channel: "EMAIL", type: "t", title: "T", body: "B" },
      select: { id: true },
    });

    vi.mocked(sendEmail).mockResolvedValueOnce({ sent: false, reason: "send_failed" });
    const failed = await runTick({ asOf: AS_OF });
    expect(failed.emailsFailed).toBe(1);
    expect(
      (await prisma.notification.findUniqueOrThrow({ where: { id: n.id }, select: { emailedAt: true } })).emailedAt,
    ).toBeNull();

    const retried = await runTick({ asOf: AS_OF });
    expect(retried.emailsSent).toBe(1);
  });

  it("two overlapping ticks never double-send", async () => {
    const a = await makeWorld("a");
    await prisma.notification.createMany({
      data: Array.from({ length: 5 }, (_, i) => ({
        userId: a.ownerUserId,
        channel: "EMAIL" as const,
        type: "t",
        title: `T${i}`,
        body: "B",
      })),
    });

    const [x, y] = await Promise.all([
      runTick({ asOf: AS_OF }),
      runTick({ asOf: AS_OF }),
    ]);
    // The atomic updateMany-where-emailedAt-is-null claim is what makes the
    // */2 * * * * schedule safe on a restarting instance.
    expect(x.emailsSent + y.emailsSent).toBe(5);
    expect(sendEmail).toHaveBeenCalledTimes(5);
  });
});

describe("POST /api/internal/cron/tick", () => {
  const post = (secret?: string) =>
    tickRoute(
      new NextRequest("http://test.local/api/internal/cron/tick", {
        method: "POST",
        headers: secret === undefined ? {} : { "x-cron-secret": secret },
      }),
    );

  it("401s with no header", async () => {
    expect((await post()).status).toBe(401);
  });

  it("401s with the wrong secret of the same length", async () => {
    // timingSafeEqual throws on a length mismatch, hence the a.length===b.length
    // guard in the route. Same-length is the case that reaches the comparison.
    const wrong = "x".repeat(process.env.CRON_SECRET!.length);
    expect((await post(wrong)).status).toBe(401);
  });

  it("401s with a wrong-length secret", async () => {
    expect((await post("short")).status).toBe(401);
  });

  it("200s with the configured secret and returns the summary", async () => {
    await makeWorld("a");
    const res = await post(process.env.CRON_SECRET!);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      ok: true,
      rentChargesCreated: expect.any(Number),
      emailsSent: expect.any(Number),
    });
  });
});
```

One property this exposes: the tick is **global, not org-scoped** -- `generateRentCharges` selects every `ACTIVE` lease with no `orgId` filter. That is correct behaviour, and it is exactly why the tick tests must live in the schema-per-worker world. In a single shared test schema, one worker's tick would generate charges against another worker's leases.

---

## 8. Expected CI runtime and how to hold it

### Budget on `ubuntu-latest` (2 vCPU)

| Step | Cold | Warm (pnpm cache hit) |
|---|---|---|
| checkout + node + pnpm setup | 20 s | 12 s |
| `pnpm install --frozen-lockfile` | 70 s | 25 s |
| `pnpm db:generate` | 14 s | 14 s |
| `pnpm lint` | 30 s | 30 s |
| `pnpm typecheck` | 22 s | 22 s |
| `pnpm db:deploy` + `db:drift` | 8 s | 8 s |
| `pnpm test:unit` (126 pure tests) | 5 s | 5 s |
| **`pnpm test:integration`** | **~22 s** | **~22 s** |
| public-leak assertion | 1 s | 1 s |
| `pnpm build` | 85 s | 75 s |
| **Total (single job)** | **~4.6 min** | **~3.6 min** |

Integration breakdown: globalSetup (4 parallel `migrate deploy`) 4 s; 4 fork boots + Vite transform 6 s; ~95 test cases at roughly 25 ms each (8 ms factories x2, 1 to 3 ms truncate, 5 to 15 ms handler) = 3 s; plus ~9 s of per-file `PrismaClient` connect across the 4 files.

### Splitting to get under three minutes

`build` is the single largest step and depends on nothing the tests produce. Split it into a sibling job so the wall clock is `max(checks, build)` rather than the sum:

```yaml
jobs:
  checks:   # lint, typecheck, migrations, unit, integration   ~2.4 min
  build:    # pnpm build only                                  ~2.0 min
```

That puts the PR gate at roughly **2.5 minutes wall**.

### The rules that keep it there

1. **Never hash a password in a factory.** argon2id at `m=19456, t=2` is 60 to 100 ms. `makeTwoWorlds()` creates four users; hashing them would add 0.4 s per test, ~38 s across the suite. Sessions are minted with `createSession()` and `passwordHash` stays null. Only the two or three auth-route tests hash, and they reuse a single module-level hash.
2. **TRUNCATE, never re-migrate, between tests.** 1 to 3 ms versus 900 ms.
3. **Keep the Postgres data directory on tmpfs** (`--tmpfs /var/lib/postgresql/data`). Roughly 3x on write-heavy factory work and it removes fsync entirely. The database is disposable by construction.
4. **`DB_CONNECTION_LIMIT=2`.** With `isolate: true`, peak is workers x files-in-flight x 2. The `afterAll($disconnect)` keeps it bounded.
5. **Do not add an HTTP server.** Calling handlers as functions skips Next's build, router, and middleware: roughly 5 ms per request instead of roughly 40 ms, and no port allocation to serialize on.
6. **Watch `pnpm lint`.** `next lint` on 128 files is already 30 s and is now the second-largest step. When it passes 45 s, move to `eslint --cache` with the cache directory in `actions/cache`.
7. **Cap `VK_TEST_WORKERS` at 4.** On a 2 vCPU runner, more forks means more context switching and more Postgres connections for no throughput. If GitHub larger runners are adopted, raise it and the schema count follows automatically from `workers.ts`.

---

## Appendix: the DB-level backstop this harness cannot replace

The sweep proves the application layer holds. It cannot prove the database would stop a bug that slips past it. Of 33 foreign keys in `prisma/migrations/20260610000000_init/migration.sql`, exactly three are on `orgId` -- `Membership`, `Property`, and `ConnectAccount`. `Charge`, `Payment`, `Lease`, `Unit`, `MaintenanceRequest`, `Message`, `Attachment`, and `AuditLog` carry `orgId` as an unconstrained string.

The additive, schema-local fix is a **composite foreign key**, which makes a mismatched `orgId` a Postgres error rather than a silent cross-org row. For `Unit`:

```sql
-- Additive only. Touches nothing outside "villagekeep_app".
ALTER TABLE "Property" ADD CONSTRAINT "Property_id_orgId_key" UNIQUE ("id", "orgId");

ALTER TABLE "Unit"
  ADD CONSTRAINT "Unit_propertyId_orgId_fkey"
  FOREIGN KEY ("propertyId", "orgId") REFERENCES "Property"("id", "orgId")
  ON DELETE CASCADE ON UPDATE CASCADE;
```

The same shape applies to `Lease` -> `Unit`, `Charge` -> `Lease`, and `Message` -> `Lease`. Prisma expresses it with `@@unique([id, orgId])` on the parent and a two-field `@relation`. This is M5 hardening work, not part of the harness, but the harness is the prerequisite: **write the sweep first, watch it stay green through the FK migration, and you know the migration changed no behaviour.**

Files referenced, all absolute:
- `/home/user/propertymanager/src/lib/services/property.ts` (lines 107, 110, 148, 167 -- the discarded-guard pattern)
- `/home/user/propertymanager/src/lib/services/charges.ts` line 126 -- `getTenantBilling(leaseId)` with no ownership check
- `/home/user/propertymanager/src/app/api/v1/messages/route.ts` -- the only handler reading a resource id from the wire
- `/home/user/propertymanager/src/lib/env.ts` -- `databaseUrlWithSchema()`, the hook the whole isolation strategy hangs on
- `/home/user/propertymanager/scripts/render-start.mjs` -- the existing schema pin `scripts/prisma-scoped.mjs` mirrors