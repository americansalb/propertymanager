import { describe, expect, it } from "vitest";
import { notificationEmail, shouldRetryEmail } from "@/lib/notifications";

describe("notificationEmail", () => {
  it("uses the title as subject and carries the body into html and text", () => {
    const e = notificationEmail({ title: "Rent received", body: "We received $1,850.00." });
    expect(e.subject).toBe("Rent received");
    expect(e.html).toContain("Rent received");
    expect(e.html).toContain("We received $1,850.00.");
    expect(e.text).toContain("We received $1,850.00.");
  });

  it("adds an Open link only when a url is present", () => {
    expect(notificationEmail({ title: "t", body: "b" }).html).not.toContain("href");
    const e = notificationEmail({ title: "t", body: "b", linkUrl: "https://x.test/y" });
    expect(e.html).toContain('href="https://x.test/y"');
    expect(e.text).toContain("https://x.test/y");
  });

  it("escapes html so a title or body cannot inject markup", () => {
    const e = notificationEmail({ title: "<script>", body: 'a & b "c"' });
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("a &amp; b");
    expect(e.html).not.toContain("<script>");
  });
});

describe("shouldRetryEmail", () => {
  it("retries only transient send failures", () => {
    expect(shouldRetryEmail({ sent: true })).toBe(false);
    expect(shouldRetryEmail({ sent: false, reason: "not_configured" })).toBe(false);
    expect(shouldRetryEmail({ sent: false, reason: "send_failed" })).toBe(true);
  });
});
