import { z } from "zod";

/**
 * Environment contract.
 *
 * Only DATABASE_URL is hard-required at boot — everything else is validated
 * lazily by the feature that needs it (so the health endpoint and first
 * deploy stay green while Stripe/Resend vars are added milestone by
 * milestone).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // The Postgres schema this app exclusively owns. The shared instance hosts
  // other services — the app must never read or write outside this schema.
  APP_DB_SCHEMA: z.string().regex(/^[a-z_][a-z0-9_]*$/).default("villagemembers_app"),
  SESSION_SECRET: z.string().min(32).optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  BRAND_NAME: z.string().default("VillageMembers"),
  BRAND_DOMAIN: z.string().default("villagemembers.org"),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("VillageMembers <no-reply@villagemembers.org>"),
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(),
  PLATFORM_FEE_RENT_BPS: z.coerce.number().int().min(0).max(2000).default(0),
  MARKETPLACE_TAKE_RATE_BPS: z.coerce.number().int().min(0).max(2000).default(1000),
});

export const env = envSchema.parse(process.env);

/**
 * DATABASE_URL with the app's isolated schema pinned.
 *
 * Render's managed DATABASE_URL has no schema param; appending one scopes
 * Prisma (queries AND migrations) to `villagemembers_app` so the other
 * services sharing this instance are untouched.
 */
export function databaseUrlWithSchema(): string {
  const url = new URL(env.DATABASE_URL);
  if (!url.searchParams.has("schema")) {
    url.searchParams.set("schema", env.APP_DB_SCHEMA);
  }
  return url.toString();
}

/** Use when a milestone-gated env var is required at runtime. */
export function requireEnv<K extends keyof typeof env>(key: K): NonNullable<(typeof env)[K]> {
  const value = env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${String(key)}`);
  }
  return value as NonNullable<(typeof env)[K]>;
}
