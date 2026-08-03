/**
 * Schema-pinned Prisma CLI wrapper.
 *
 * The Prisma CLI reads DATABASE_URL verbatim and never sees APP_DB_SCHEMA, so
 * a bare `prisma migrate deploy` targets `public`. On the shared production
 * instance that is either 39 stray tables in `public` (when it is empty) or a
 * P3005 failure (when it is not), and `migrate dev` goes further and offers to
 * RESET `public`, which would drop other services' data. This pins the schema
 * the same way src/lib/env.ts and scripts/render-start.mjs already do.
 *
 * Usage: node scripts/prisma-scoped.mjs migrate deploy
 */
import { spawnSync } from "node:child_process";

const schema = process.env.APP_DB_SCHEMA ?? "villagekeep_app";
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const url = new URL(process.env.DATABASE_URL);
if (!url.searchParams.has("schema")) url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();

const args = process.argv.slice(2);
if (args.includes("reset")) {
  console.error("Refusing to run `prisma migrate reset`: this app shares its database instance.");
  process.exit(1);
}
console.log(`prisma ${args.join(" ")} (schema: ${schema})`);
const r = spawnSync("./node_modules/.bin/prisma", args, { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
