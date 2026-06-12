import { describe, expect, it } from "vitest";

process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
process.env.SESSION_SECRET ??= "test-secret-test-secret-test-secret-1234";

const { encryptSecret, decryptSecret, isEncrypted } = await import("@/lib/crypto");
const { isSameAddress, parseTags, propertyCreateSchema, propertyDetailsSchema } = await import(
  "@/lib/validation/property"
);

describe("isSameAddress (full-line duplicate detection)", () => {
  it("treats line 2 as significant: two condos at one street address differ", () => {
    expect(
      isSameAddress(
        { address1: "4130 N Ashland Ave", address2: "Apartment 1" },
        { address1: "4130 N Ashland Ave", address2: "Apartment 2" },
      ),
    ).toBe(false);
  });
  it("matches case- and whitespace-insensitively", () => {
    expect(
      isSameAddress(
        { address1: "4130  N Ashland Ave", address2: null },
        { address1: "4130 n ashland ave", address2: "" },
      ),
    ).toBe(true);
  });
});

describe("crypto: secrets at rest", () => {
  it("round-trips and never stores plaintext", () => {
    const stored = encryptSecret("Lockbox 4417; gate #2290");
    expect(stored.startsWith("enc1:")).toBe(true);
    expect(stored).not.toContain("4417");
    expect(isEncrypted(stored)).toBe(true);
    expect(decryptSecret(stored)).toBe("Lockbox 4417; gate #2290");
  });

  it("uses a fresh IV per encryption", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects tampered ciphertext", () => {
    const stored = encryptSecret("secret");
    const tampered = stored.slice(0, -2) + (stored.endsWith("aa") ? "bb" : "aa");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("state validation", () => {
  const base = {
    name: "X",
    type: "SINGLE_FAMILY",
    address1: "1 Main St",
    city: "Chicago",
    zipCode: "60613",
  };
  it("accepts real codes case-insensitively", () => {
    expect(propertyCreateSchema.parse({ ...base, state: "il" }).state).toBe("IL");
  });
  it("rejects two letters that are not a state", () => {
    expect(propertyCreateSchema.safeParse({ ...base, state: "XX" }).success).toBe(false);
  });
});

describe("parseTags", () => {
  it("trims, dedupes case-insensitively, drops empties, caps at 12", () => {
    expect(parseTags([" Lakeview ", "lakeview", "", "LLC-A"])).toEqual(["Lakeview", "LLC-A"]);
    expect(parseTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(12);
  });
});

describe("propertyDetailsSchema", () => {
  it("turns empty strings into nulls (clearable fields)", () => {
    const parsed = propertyDetailsSchema.parse({ yearBuilt: "", accessCodes: "" });
    expect(parsed.yearBuilt).toBeNull();
    expect(parsed.accessCodes).toBeNull();
  });
  it("bounds yearBuilt to plausible years", () => {
    expect(propertyDetailsSchema.safeParse({ yearBuilt: "1492" }).success).toBe(false);
    expect(propertyDetailsSchema.parse({ yearBuilt: "1924" }).yearBuilt).toBe(1924);
  });
  it("maps pets select values", () => {
    expect(propertyDetailsSchema.parse({ petsAllowed: "yes" }).petsAllowed).toBe(true);
    expect(propertyDetailsSchema.parse({ petsAllowed: "unset" }).petsAllowed).toBeNull();
  });
});

describe("unit partial updates (the not-vacant fix)", () => {
  it("accepts a status-only patch without touching other fields", async () => {
    const { unitUpdateSchema, toUnitUpdateData } = await import("@/lib/validation/property");
    const parsed = unitUpdateSchema.parse({ status: "OCCUPIED" });
    expect(toUnitUpdateData(parsed)).toEqual({ status: "OCCUPIED" });
  });
  it("clears a field only on explicit null", async () => {
    const { unitUpdateSchema, toUnitUpdateData } = await import("@/lib/validation/property");
    const parsed = unitUpdateSchema.parse({ bedrooms: null, marketRentDollars: "1850" });
    expect(toUnitUpdateData(parsed)).toEqual({ bedrooms: null, marketRentCents: 185_000 });
  });
  it("rejects an invalid status", async () => {
    const { unitUpdateSchema } = await import("@/lib/validation/property");
    expect(unitUpdateSchema.safeParse({ status: "PARTY" }).success).toBe(false);
  });
});

describe("unit standing terms (property record v2)", () => {
  it("strips commas and dollar signs from money fields", async () => {
    const { unitUpdateSchema, toUnitUpdateData } = await import("@/lib/validation/property");
    const parsed = unitUpdateSchema.parse({ securityDepositDollars: "$1,850" });
    expect(toUnitUpdateData(parsed)).toEqual({ securityDepositCents: 185_000 });
  });
  it("clears each money term on explicit null", async () => {
    const { unitUpdateSchema, toUnitUpdateData } = await import("@/lib/validation/property");
    const parsed = unitUpdateSchema.parse({
      petDepositDollars: null,
      petRentDollars: null,
      parkingRentDollars: null,
    });
    expect(toUnitUpdateData(parsed)).toEqual({
      petDepositCents: null,
      petRentCents: null,
      parkingRentCents: null,
    });
  });
  it("treats empty parkingSpot as a clear", async () => {
    const { unitUpdateSchema, toUnitUpdateData } = await import("@/lib/validation/property");
    expect(toUnitUpdateData(unitUpdateSchema.parse({ parkingSpot: "" }))).toEqual({
      parkingSpot: null,
    });
  });
  it("normalizes utilities chips and clears on empty array", async () => {
    const { unitUpdateSchema, toUnitUpdateData } = await import("@/lib/validation/property");
    const parsed = unitUpdateSchema.parse({ utilitiesIncluded: [" Water ", "water", "Trash", ""] });
    expect(toUnitUpdateData(parsed)).toEqual({ utilitiesIncluded: ["Water", "Trash"] });
    expect(toUnitUpdateData(unitUpdateSchema.parse({ utilitiesIncluded: [] }))).toEqual({
      utilitiesIncluded: [],
    });
  });
  it("keeps parking rent zero distinct from unset (0 = included)", async () => {
    const { unitUpdateSchema, toUnitUpdateData } = await import("@/lib/validation/property");
    expect(toUnitUpdateData(unitUpdateSchema.parse({ parkingRentDollars: "0" }))).toEqual({
      parkingRentCents: 0,
    });
  });
  it("toUnitData carries terms on create with [] utilities default", async () => {
    const { unitInputSchema, toUnitData } = await import("@/lib/validation/property");
    const parsed = unitInputSchema.parse({ unitNumber: "1F", petRentDollars: "50" });
    const data = toUnitData(parsed);
    expect(data.petRentCents).toBe(5_000);
    expect(data.utilitiesIncluded).toEqual([]);
  });
  it("parseChips caps and parseTags keeps its old behavior", async () => {
    const { parseChips, parseTags } = await import("@/lib/validation/property");
    expect(parseChips(["a", "A", "b"], 2)).toEqual(["a", "b"]);
    expect(parseTags([" Lakeview ", "lakeview", "LLC-A"])).toEqual(["Lakeview", "LLC-A"]);
  });
});
