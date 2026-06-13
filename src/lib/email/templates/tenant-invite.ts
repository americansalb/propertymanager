/**
 * Tenant invite email (pure: brand and URLs arrive as inputs). Table-based
 * HTML with the forge palette inlined - email clients ignore stylesheets.
 */

const IRON = "#34383f";
const IRON_DEEP = "#23262b";
const COPPER = "#d08a45";
const STONE = "#57534e";
const STONE_FAINT = "#a8a29e";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type TenantInviteEmailInput = {
  brandName: string;
  orgName: string;
  /** "Unit 2F, 1247 W Oakdale Ave" - already human-ready. */
  homeLabel: string;
  inviteUrl: string;
  expiresDays: number;
};

export function tenantInviteEmail(input: TenantInviteEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const brandName = escapeHtml(input.brandName);
  const orgName = escapeHtml(input.orgName);
  const homeLabel = escapeHtml(input.homeLabel);
  const url = escapeHtml(input.inviteUrl);

  const subject = `${input.orgName} invited you to your home on ${input.brandName}`;

  const text = [
    `${input.orgName} invited you to ${input.homeLabel} on ${input.brandName}.`,
    "",
    "Set a password to see your lease and keep everything about your home in one place:",
    input.inviteUrl,
    "",
    `This link works for ${input.expiresDays} days. If you weren't expecting it, you can ignore this email.`,
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f5f5f4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e7e5e4;border-radius:12px;">
            <tr>
              <td style="padding:28px 32px 0;font-family:Georgia,serif;font-size:20px;font-weight:bold;color:${IRON};">
                ${brandName}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:${STONE};">
                <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:${IRON};">You&#39;re invited to your home</p>
                <p style="margin:0 0 6px;"><strong style="color:${IRON};">${orgName}</strong> set up</p>
                <p style="margin:0 0 16px;font-size:16px;color:${IRON};border-left:3px solid ${COPPER};padding-left:10px;">${homeLabel}</p>
                <p style="margin:0;">Set a password to see your lease and keep everything about your home in one place.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;">
                <a href="${url}" style="display:inline-block;background-color:${IRON};color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 24px;border-radius:8px;">See your home</a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${STONE_FAINT};">
                <p style="margin:0 0 6px;">Button not working? Paste this link into your browser:<br/><a href="${url}" style="color:${IRON_DEEP};word-break:break-all;">${url}</a></p>
                <p style="margin:0;">This link works for ${input.expiresDays} days. If you weren&#39;t expecting it, you can ignore this email.</p>
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
