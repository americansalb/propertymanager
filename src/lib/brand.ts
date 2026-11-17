import { env } from "./env";

/** Single source of truth for branding - a rebrand is an env-var change. */
export const brand = {
  name: env.BRAND_NAME,
  domain: env.BRAND_DOMAIN,
  tagline: "Your rentals, well kept.",
  /** What search engines and shared links show under the name. */
  description:
    "Leases, rent and repairs for your rentals in one place. When something breaks, your own repair people are asked for a price right away.",
  emailFrom: env.EMAIL_FROM,
} as const;
