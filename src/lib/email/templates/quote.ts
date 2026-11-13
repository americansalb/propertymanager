/**
 * Emails to an owner's repair people (pure: brand and links arrive as
 * inputs). Three moments: "can you give me a price", "you got it", and
 * "this one went to someone else". Table-based HTML with the palette
 * inlined, because email clients ignore stylesheets.
 */

const INK = "#1b3b31";
const INK_SOFT = "#234b3f";
const COPPER = "#d08a45";
const BODY = "#476b5f";
const FAINT = "#789187";

function esc(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

type Email = { subject: string; html: string; text: string };

/** One layout for all three: a headline, a few lines, an optional button. */
function layout(opts: {
  brandName: string;
  headline: string;
  /** Already-escaped HTML paragraphs. */
  bodyHtml: string;
  button?: { label: string; url: string };
  footHtml?: string;
}): string {
  const font = "font-family:Arial,Helvetica,sans-serif;";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f6f4ef;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f4ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #d5ddd8;border-radius:12px;">
            <tr>
              <td style="padding:28px 32px 0;${font}font-size:18px;font-weight:bold;color:${INK};">${esc(opts.brandName)}</td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0;${font}font-size:16px;line-height:24px;color:${BODY};">
                <p style="margin:0 0 14px;font-size:20px;line-height:26px;font-weight:bold;color:${INK};">${esc(opts.headline)}</p>
                ${opts.bodyHtml}
              </td>
            </tr>
            ${
              opts.button
                ? `<tr>
              <td style="padding:22px 32px 0;">
                <a href="${esc(opts.button.url)}" style="display:inline-block;background-color:${INK_SOFT};color:#ffffff;${font}font-size:16px;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:10px;">${esc(opts.button.label)}</a>
              </td>
            </tr>`
                : ""
            }
            <tr>
              <td style="padding:22px 32px 28px;${font}font-size:13px;line-height:19px;color:${FAINT};">
                ${opts.footHtml ?? ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const p = (html: string) => `<p style="margin:0 0 10px;">${html}</p>`;
const strong = (s: string) => `<strong style="color:${INK};">${esc(s)}</strong>`;
const quoteBlock = (s: string) =>
  `<p style="margin:0 0 14px;font-size:16px;color:${INK};border-left:3px solid ${COPPER};padding-left:12px;">${esc(s)}</p>`;

export type QuoteRequestEmailInput = {
  brandName: string;
  /** Who is asking, as the repair person knows them. */
  ownerName: string;
  contractorName: string;
  title: string;
  description: string;
  /** "Unit 1F, 1247 W Oakdale Ave, Chicago" */
  where: string;
  /** True for emergencies and urgent problems. */
  urgent: boolean;
  link: string;
};

export function quoteRequestEmail(i: QuoteRequestEmailInput): Email {
  const subject = `${i.urgent ? "Urgent: " : ""}${i.ownerName} needs a price: ${i.title}`;
  const text = [
    `Hi ${i.contractorName},`,
    "",
    `${i.ownerName} needs a price for a repair${i.urgent ? ", and it is urgent" : ""}.`,
    "",
    `${i.title}`,
    `${i.description}`,
    `Where: ${i.where}`,
    "",
    "Give your price and when you can come. It takes a minute, and you do not need an account:",
    i.link,
    "",
    "If you cannot take it, the same link lets you say so.",
  ].join("\n");
  const html = layout({
    brandName: i.brandName,
    headline: `${i.ownerName} needs a price${i.urgent ? ", and it is urgent" : ""}`,
    bodyHtml:
      p(`Hi ${esc(i.contractorName)},`) +
      quoteBlock(i.title) +
      p(esc(i.description)) +
      p(`Where: ${strong(i.where)}`) +
      p("Give your price and when you can come. It takes a minute, and you do not need an account."),
    button: { label: "Give my price", url: i.link },
    footHtml: `If you cannot take it, the same link lets you say so.<br/>Button not working? Paste this into your browser:<br/><a href="${esc(i.link)}" style="color:${INK_SOFT};word-break:break-all;">${esc(i.link)}</a>`,
  });
  return { subject, html, text };
}

export type QuoteApprovedEmailInput = {
  brandName: string;
  ownerName: string;
  /** How to reach the owner to set the time. */
  ownerEmail: string | null;
  contractorName: string;
  title: string;
  where: string;
  /** "$180.00" or "$150.00 to $300.00" */
  price: string;
  /** What they said about when they can come. */
  availability: string | null;
  /** Whether someone may go in when the tenant is out. */
  entry: string;
  bestTimes: string | null;
  /** Gate codes and the like: only shared once they have the job. */
  accessNotes: string | null;
  tenantFirstName: string | null;
};

export function quoteApprovedEmail(i: QuoteApprovedEmailInput): Email {
  const subject = `You got the job: ${i.title}`;
  const facts: Array<[string, string]> = [
    ["Where", i.where],
    ["Your price", i.price],
    ...(i.availability ? ([["You said", i.availability]] as Array<[string, string]>) : []),
    ["Going in", i.entry],
    ...(i.bestTimes ? ([["Best times", i.bestTimes]] as Array<[string, string]>) : []),
    ...(i.accessNotes ? ([["Getting in", i.accessNotes]] as Array<[string, string]>) : []),
    ...(i.tenantFirstName ? ([["Tenant", i.tenantFirstName]] as Array<[string, string]>) : []),
  ];
  const contact = i.ownerEmail
    ? `To set the time, write to ${i.ownerName} at ${i.ownerEmail}.`
    : `${i.ownerName} will be in touch to set the time.`;
  const text = [
    `Hi ${i.contractorName},`,
    "",
    `${i.ownerName} said yes to your price for: ${i.title}`,
    "",
    ...facts.map(([k, v]) => `${k}: ${v}`),
    "",
    contact,
  ].join("\n");
  const html = layout({
    brandName: i.brandName,
    headline: "You got the job",
    bodyHtml:
      p(`Hi ${esc(i.contractorName)}, ${esc(i.ownerName)} said yes to your price.`) +
      quoteBlock(i.title) +
      facts.map(([k, v]) => p(`${esc(k)}: ${strong(v)}`)).join("") +
      p(esc(contact)),
  });
  return { subject, html, text };
}

export function quoteNotChosenEmail(i: {
  brandName: string;
  ownerName: string;
  contractorName: string;
  title: string;
}): Email {
  const subject = `Not this time: ${i.title}`;
  const line = `${i.ownerName} went with someone else for this repair. Thank you for the quick price. You are still on their list for the next one.`;
  const text = [`Hi ${i.contractorName},`, "", line].join("\n");
  const html = layout({
    brandName: i.brandName,
    headline: "This one went to someone else",
    bodyHtml: p(`Hi ${esc(i.contractorName)},`) + quoteBlock(i.title) + p(esc(line)),
  });
  return { subject, html, text };
}
