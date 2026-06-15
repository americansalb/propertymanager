/**
 * Notification core (pure). Email rendering and the retry decision, kept free
 * of Prisma so they are unit-testable. The service (services/notification.ts)
 * persists rows; the worker tick (worker/tick.ts) delivers the EMAIL ones.
 */
import type { SendEmailResult } from "@/lib/email/send";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A plain email for one notification. Title is the subject. */
export function notificationEmail(n: { title: string; body: string; linkUrl?: string | null }): {
  subject: string;
  html: string;
  text: string;
} {
  const button = n.linkUrl
    ? `<p style="margin:16px 0"><a href="${escapeHtml(n.linkUrl)}">Open</a></p>`
    : "";
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px">
  <h2 style="margin:0 0 8px">${escapeHtml(n.title)}</h2>
  <p style="margin:0;color:#3f3f46">${escapeHtml(n.body)}</p>
  ${button}
</div>`;
  const text = n.linkUrl ? `${n.title}\n\n${n.body}\n\n${n.linkUrl}` : `${n.title}\n\n${n.body}`;
  return { subject: n.title, html, text };
}

/**
 * After a send attempt, should the tick release its claim so a later tick
 * retries? Only on a transient failure. A missing API key is "nothing to do",
 * not a retry, otherwise pending rows would pile up forever.
 */
export function shouldRetryEmail(result: SendEmailResult): boolean {
  return !result.sent && result.reason === "send_failed";
}
