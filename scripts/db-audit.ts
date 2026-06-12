/**
 * READ-ONLY audit of the Postgres instance.
 *
 * Lists every schema with table counts and sizes so the founder can see
 * exactly what shares the instance before/after deploys. Runs only SELECTs -
 * never DDL, never writes. Usage: DATABASE_URL=... pnpm db:audit
 */
import { PrismaClient } from "@prisma/client";

const APP_SCHEMA = process.env.APP_DB_SCHEMA ?? "villagekeep_app";

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("Set DATABASE_URL to the instance you want to audit.");
  const prisma = new PrismaClient({ datasourceUrl: raw });

  const schemas = await prisma.$queryRaw<
    Array<{ schema: string; tables: bigint; total_bytes: bigint | null }>
  >`
    SELECT n.nspname AS schema,
           count(c.oid) FILTER (WHERE c.relkind = 'r') AS tables,
           sum(pg_total_relation_size(c.oid)) FILTER (WHERE c.relkind = 'r') AS total_bytes
    FROM pg_namespace n
    LEFT JOIN pg_class c ON c.relnamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    GROUP BY n.nspname
    ORDER BY n.nspname;
  `;

  console.log("\nPostgres instance audit (read-only)\n");
  console.log("schema".padEnd(32), "tables".padStart(7), "size".padStart(12), "  note");
  console.log("-".repeat(70));
  for (const s of schemas) {
    const size = Number(s.total_bytes ?? 0);
    const pretty =
      size > 1024 * 1024
        ? `${(size / 1024 / 1024).toFixed(1)} MB`
        : `${(size / 1024).toFixed(0)} KB`;
    const note =
      s.schema === APP_SCHEMA
        ? "← this app (only schema we touch)"
        : "untouched by this app";
    console.log(s.schema.padEnd(32), String(s.tables).padStart(7), pretty.padStart(12), " ", note);
  }
  console.log(
    `\nThis app reads/writes ONLY "${APP_SCHEMA}". Everything else is left alone.\n`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
