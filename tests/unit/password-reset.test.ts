import { describe, expect, it } from "vitest";
import { passwordResetEmail } from "@/lib/email/templates/password-reset";
import { buildResetLink } from "@/lib/services/password-reset";
import { forgotSchema, resetSchema } from "@/lib/validation/auth";

describe("password reset", () => {
  it("builds the link on the app's own address", () => {
    expect(buildResetLink("https://example.com", "abc")).toBe("https://example.com/reset/abc");
  });

  it("emails the link, says how long it works, and never lets a name become markup", () => {
    const mail = passwordResetEmail({
      brandName: "VillageKeep",
      firstName: "Dana <b>",
      link: "https://example.com/reset/abc",
      minutes: 60,
    });
    expect(mail.text).toContain("https://example.com/reset/abc");
    expect(mail.text).toContain("60 minutes");
    expect(mail.html).toContain("Dana &lt;b&gt;");
    expect(mail.html).not.toContain("Dana <b>");
  });

  it("normalizes the email and holds the new password to the usual rules", () => {
    expect(forgotSchema.parse({ email: "  Dana@Example.com " }).email).toBe("dana@example.com");
    expect(resetSchema.safeParse({ token: "x".repeat(43), password: "short1" }).success).toBe(false);
    expect(resetSchema.safeParse({ token: "x".repeat(43), password: "longenough" }).success).toBe(false);
    expect(resetSchema.safeParse({ token: "x".repeat(43), password: "longenough1" }).success).toBe(true);
  });
});
