import { describe, expect, it } from "vitest";
import {
  buildInviteLink,
  INVITE_TTL_DAYS,
  inviteDaysLeft,
  inviteExpiresAt,
  isInviteExpired,
} from "@/lib/invites";
import { tenantInviteEmail } from "@/lib/email/templates/tenant-invite";

describe("invite links", () => {
  it("builds the public link off the app origin", () => {
    expect(buildInviteLink("https://villagekeep.com", "tok_abc")).toBe(
      "https://villagekeep.com/invite/tok_abc",
    );
  });

  it("expires after the TTL, counts days down, floors at zero", () => {
    const now = new Date("2026-06-13T00:00:00Z");
    const expires = inviteExpiresAt(now);
    expect(inviteDaysLeft(expires, now)).toBe(INVITE_TTL_DAYS);
    expect(isInviteExpired(expires, now)).toBe(false);
    const after = new Date(expires.getTime() + 1000);
    expect(isInviteExpired(expires, after)).toBe(true);
    expect(inviteDaysLeft(expires, after)).toBe(0);
  });
});

describe("tenantInviteEmail", () => {
  const input = {
    brandName: "VillageKeep",
    orgName: "Demo Properties LLC",
    homeLabel: "Unit 2F, 1247 W Oakdale Ave",
    inviteUrl: "https://villagekeep.com/invite/tok_abc",
    expiresDays: 7,
  };

  it("addresses the home, carries the link in html and text, names the org in the subject", () => {
    const { subject, html, text } = tenantInviteEmail(input);
    expect(subject).toBe("Demo Properties LLC invited you to your home on VillageKeep");
    expect(html).toContain(input.inviteUrl);
    expect(html).toContain("Unit 2F, 1247 W Oakdale Ave");
    expect(text).toContain(input.inviteUrl);
    expect(text).toContain("7 days");
  });

  it("escapes html in landlord-controlled strings", () => {
    const { html } = tenantInviteEmail({ ...input, orgName: `<script>alert(1)</script>` });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("contains no em dashes anywhere", () => {
    const { subject, html, text } = tenantInviteEmail(input);
    expect(`${subject}${html}${text}`).not.toMatch(/—/);
  });
});
