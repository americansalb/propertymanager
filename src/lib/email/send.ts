import { Resend } from "resend";
import { env } from "@/lib/env";

export type SendEmailResult = { sent: true } | { sent: false; reason: "not_configured" | "send_failed" };

let client: Resend | null = null;

/**
 * Email is a bonus channel, never a gate: with no RESEND_API_KEY the caller
 * still succeeds (the invite link IS the product) and the result says why
 * nothing was sent. Failures log and report; they never throw into the
 * user's flow.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendEmailResult> {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV !== "production") {
      console.log(`[email skipped: RESEND_API_KEY unset] to=${opts.to} subject=${opts.subject}`);
    }
    return { sent: false, reason: "not_configured" };
  }
  client ??= new Resend(env.RESEND_API_KEY);
  try {
    const { error } = await client.emails.send({
      from: env.EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      console.error("email send failed", error);
      return { sent: false, reason: "send_failed" };
    }
    return { sent: true };
  } catch (e) {
    console.error("email send failed", e);
    return { sent: false, reason: "send_failed" };
  }
}
