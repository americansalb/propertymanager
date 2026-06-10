import { env } from "./env";

/** Single source of truth for branding — a rebrand is an env-var change. */
export const brand = {
  name: env.BRAND_NAME,
  domain: env.BRAND_DOMAIN,
  tagline: "Property management & trusted local pros",
  emailFrom: env.EMAIL_FROM,
} as const;
