import { z } from "zod";
import { TRADES } from "@/lib/quotes";

/** "300", "$1,250.50" or 300 → cents. Empty or null → null. */
const dollarsToCentsOrNull = z.preprocess(
  (v) => {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    const s = String(v).replace(/[$,\s]/g, "");
    return s === "" ? null : Number(s);
  },
  z
    .number({ invalid_type_error: "Enter a dollar amount." })
    .finite("Enter a dollar amount.")
    .min(0, "Enter a dollar amount.")
    .max(1_000_000, "That amount is too large.")
    .transform((n) => Math.round(n * 100))
    .nullable(),
);

const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(max).nullable().optional(),
  );

export const contractorSchema = z
  .object({
    name: z.string().trim().min(1, "Enter a name.").max(80),
    trades: z
      .array(z.enum(TRADES))
      .min(1, "Pick what they do.")
      .max(6, "Pick up to six."),
    phone: optionalText(30),
    email: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? null : v),
      z.string().trim().toLowerCase().email("That does not look like an email.").nullable().optional(),
    ),
    notes: optionalText(500),
    /** Say yes for me up to this many dollars. Empty = always ask me. */
    autoApproveDollars: dollarsToCentsOrNull.optional(),
  })
  .refine((d) => Boolean(d.phone) || Boolean(d.email), {
    message: "Add a phone number or an email, so they can be reached.",
  });

export type ContractorInput = z.infer<typeof contractorSchema>;

export const contractorPatchSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80).optional(),
  trades: z.array(z.enum(TRADES)).min(1, "Pick what they do.").max(6).optional(),
  phone: optionalText(30),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().toLowerCase().email("That does not look like an email.").nullable().optional(),
  ),
  notes: optionalText(500),
  autoApproveDollars: dollarsToCentsOrNull.optional(),
});

export type ContractorPatch = z.infer<typeof contractorPatchSchema>;

export const quoteSettingsSchema = z.object({ autoAskQuotes: z.boolean() });

export const askQuotesSchema = z.object({
  contractorIds: z.array(z.string().min(1)).max(10).optional(),
});

/** The repair person's answer through their private link. */
export const quoteRespondSchema = z.discriminatedUnion("answer", [
  z.object({
    answer: z.literal("price"),
    token: z.string().min(10),
    priceDollars: dollarsToCentsOrNull.refine((c) => c !== null && c > 0, "Enter your price."),
    priceHighDollars: dollarsToCentsOrNull.optional(),
    availability: z.string().trim().min(2, "Say when you can come.").max(120),
    note: optionalText(500),
  }),
  z.object({ answer: z.literal("pass"), token: z.string().min(10) }),
]);

export type QuoteRespondInput = z.infer<typeof quoteRespondSchema>;
