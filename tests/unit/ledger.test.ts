import { describe, expect, it } from "vitest";
import { accountKey, computeRunningBalances, reversalPosting, type LedgerPosting } from "@/lib/ledger";

const rent = (amountCents: number, accountId = "org1"): LedgerPosting => ({
  accountType: "LANDLORD_ORG",
  accountId,
  type: "RENT_PAYMENT",
  amountCents,
  description: "Rent",
});

describe("accountKey", () => {
  it("joins type and id so different accounts never collide", () => {
    expect(accountKey("LANDLORD_ORG", "org1")).toBe("LANDLORD_ORG:org1");
    expect(accountKey("PRO", "org1")).not.toBe(accountKey("LANDLORD_ORG", "org1"));
  });
});

describe("computeRunningBalances", () => {
  it("compounds postings to the same account in order", () => {
    const rows = computeRunningBalances(new Map(), [rent(185_000), rent(50_000), rent(-20_000)]);
    expect(rows.map((r) => r.runningBalanceCents)).toEqual([185_000, 235_000, 215_000]);
  });

  it("starts from the account's prior balance", () => {
    const rows = computeRunningBalances(new Map([["LANDLORD_ORG:org1", 100_000]]), [rent(85_000)]);
    expect(rows[0].runningBalanceCents).toBe(185_000);
  });

  it("threads distinct accounts independently", () => {
    const rows = computeRunningBalances(new Map(), [
      rent(185_000, "orgA"),
      rent(90_000, "orgB"),
      rent(15_000, "orgA"),
    ]);
    expect(rows.map((r) => r.runningBalanceCents)).toEqual([185_000, 90_000, 200_000]);
  });

  it("defaults currency to usd and preserves an explicit one", () => {
    const [a, b] = computeRunningBalances(new Map(), [
      rent(100),
      { ...rent(100), currency: "cad" },
    ]);
    expect(a.currency).toBe("usd");
    expect(b.currency).toBe("cad");
  });

  it("rejects a non-integer amount (no fractional cents in the ledger)", () => {
    expect(() => computeRunningBalances(new Map(), [rent(10.5)])).toThrow();
  });
});

describe("reversalPosting", () => {
  it("negates the amount, marks REVERSAL, and links the source entry", () => {
    const p = reversalPosting(
      {
        id: "led_1",
        accountType: "PRO",
        accountId: "pro1",
        amountCents: 124_000,
        currency: "usd",
        jobId: "job1",
        stripeRef: "tr_123",
      },
      "Reversed: payout clawback",
    );
    expect(p.amountCents).toBe(-124_000);
    expect(p.type).toBe("REVERSAL");
    expect(p.reversalOfId).toBe("led_1");
    expect(p.accountType).toBe("PRO");
    expect(p.jobId).toBe("job1");
    expect(p.stripeRef).toBe("tr_123");
  });

  it("a reversal of a reversal nets the account back to its original balance", () => {
    const original = reversalPosting(
      { id: "led_1", accountType: "PRO", accountId: "pro1", amountCents: 5_000, currency: "usd" },
      "reverse",
    );
    const rows = computeRunningBalances(new Map([["PRO:pro1", 5_000]]), [original]);
    expect(rows[0].runningBalanceCents).toBe(0);
  });
});
