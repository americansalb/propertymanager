/**
 * Password reset email (pure: brand and link arrive as inputs).
 * Table-based HTML with the palette inlined; email clients ignore stylesheets.
 */
const INK = "#1b3b31";
const INK_SOFT = "#234b3f";
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

export function passwordResetEmail(i: {
  brandName: string;
  firstName: string;
  link: string;
  minutes: number;
}): { subject: string; html: string; text: string } {
  const subject = `Set a new ${i.brandName} password`;
  const text = [
    `Hi ${i.firstName},`,
    "",
    `Someone asked to set a new password for your ${i.brandName} account. If it was you, open this link:`,
    i.link,
    "",
    `It works once, for ${i.minutes} minutes. If you did not ask, ignore this email: your password stays the same.`,
  ].join("\n");
  const font = "font-family:Arial,Helvetica,sans-serif;";
  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f3f6f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f6f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #d5ddd8;border-radius:12px;">
            <tr>
              <td style="padding:28px 32px 0;${font}font-size:18px;font-weight:bold;color:${INK};">${esc(i.brandName)}</td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0;${font}font-size:16px;line-height:24px;color:${BODY};">
                <p style="margin:0 0 14px;font-size:20px;line-height:26px;font-weight:bold;color:${INK};">Set a new password</p>
                <p style="margin:0 0 10px;">Hi ${esc(i.firstName)}, someone asked to set a new password for your account. If it was you, press the button.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px 0;">
                <a href="${esc(i.link)}" style="display:inline-block;background-color:${INK_SOFT};color:#ffffff;${font}font-size:16px;font-weight:bold;text-decoration:none;padding:13px 26px;border-radius:10px;">Set a new password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 32px 28px;${font}font-size:13px;line-height:19px;color:${FAINT};">
                It works once, for ${i.minutes} minutes. If you did not ask, ignore this email: your password stays the same.<br/>Button not working? Paste this into your browser:<br/><a href="${esc(i.link)}" style="color:${INK_SOFT};word-break:break-all;">${esc(i.link)}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  return { subject, html, text };
}
