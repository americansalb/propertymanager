#!/bin/sh
set -e

# Pin the app to its isolated Postgres schema. The shared instance hosts other
# services - migrations and queries must never leave this schema.
APP_DB_SCHEMA="${APP_DB_SCHEMA:-villagekeep_app}"
case "$DATABASE_URL" in
  *schema=*) : ;;
  *\?*) export DATABASE_URL="${DATABASE_URL}&schema=${APP_DB_SCHEMA}" ;;
  *)   export DATABASE_URL="${DATABASE_URL}?schema=${APP_DB_SCHEMA}" ;;
esac

echo "Applying migrations (schema: ${APP_DB_SCHEMA})..."
prisma migrate deploy --schema ./prisma/schema.prisma

if [ "$RUN_SEED" = "true" ]; then
  echo "Seeding..."
  node ./prisma/seed.js 2>/dev/null || echo "(seed skipped - run via 'pnpm db:seed' locally)"
fi

exec node server.js
