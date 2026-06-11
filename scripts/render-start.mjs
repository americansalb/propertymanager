/**
 * Production start for the Render NATIVE Node service (no Docker).
 * 1. Pins DATABASE_URL to the app's isolated schema (shared instance safety).
 * 2. Applies migrations (only ever inside that schema).
 * 3. Starts Next.js on Render's $PORT.
 */
import { spawn, spawnSync } from "node:child_process";

const schema = process.env.APP_DB_SCHEMA ?? "villagekeep_app";
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const url = new URL(process.env.DATABASE_URL);
if (!url.searchParams.has("schema")) url.searchParams.set("schema", schema);
process.env.DATABASE_URL = url.toString();

console.log(`Applying migrations (schema: ${schema})...`);
const migrate = spawnSync("./node_modules/.bin/prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

const port = process.env.PORT ?? "3000";
console.log(`Starting Next.js on port ${port}...`);
const server = spawn("./node_modules/.bin/next", ["start", "-p", port], {
  stdio: "inherit",
  env: process.env,
});
server.on("exit", (code) => process.exit(code ?? 0));
