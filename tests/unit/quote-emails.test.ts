import { describe, expect, it } from "vitest";
import {
  quoteApprovedEmail,
  quoteNotChosenEmail,
  quoteRequestEmail,
} from "@/lib/email/templates/quote";

describe("quote emails", () => {
  const base = {
    brandName: "VillageKeep",
    ownerName: "Dana Landlord",
    contractorName: "Mike's Plumbing",
    title: "Kitchen sink <leaks>",
  };

  it("asks for a price with the private link, and never lets text become markup", () => {
    const mail = quoteRequestEmail({
      ...base,
      description: "Water pools under the sink.",
      where: "Unit 1F, 1247 W Oakdale Ave, Chicago",
      urgent: true,
      link: "https://example.com/quote/abc",
    });
    expect(mail.subject).toBe("Urgent: Dana Landlord needs a price: Kitchen sink <leaks>");
    expect(mail.text).toContain("https://example.com/quote/abc");
    expect(mail.html).toContain("https://example.com/quote/abc");
    expect(mail.html).toContain("Kitchen sink &lt;leaks&gt;");
    expect(mail.html).not.toContain("<leaks>");
    expect(mail.html).toContain("Mike&#39;s Plumbing");
  });

  it("gives the door details only to the person who got the job", () => {
    const won = quoteApprovedEmail({
      ...base,
      ownerEmail: "dana@example.com",
      where: "Unit 1F, 1247 W Oakdale Ave, Chicago",
      price: "$180.00",
      availability: "Tomorrow morning",
      entry: "Only when the tenant is home",
      bestTimes: "Evenings",
      accessNotes: "Gate code 2290",
      tenantFirstName: "Tom",
    });
    expect(won.subject).toBe("You got the job: Kitchen sink <leaks>");
    expect(won.text).toContain("Getting in: Gate code 2290");
    expect(won.text).toContain("dana@example.com");

    const lost = quoteNotChosenEmail(base);
    expect(lost.text).not.toContain("Gate code");
    expect(lost.text).toContain("went with someone else");
  });
});
