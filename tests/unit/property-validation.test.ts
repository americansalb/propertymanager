import { describe, expect, it } from "vitest";
import { propertyCreateSchema, toUnitData, unitInputSchema } from "@/lib/validation/property";

const base = {
  name: "Oakdale Duplex",
  type: "MULTIFAMILY",
  address1: "1247 W Oakdale Ave",
  city: "Chicago",
  state: "il",
  zipCode: "60657",
};

describe("propertyCreateSchema", () => {
  it("accepts a valid property and uppercases the state", () => {
    const parsed = propertyCreateSchema.parse(base);
    expect(parsed.state).toBe("IL");
    expect(parsed.units).toEqual([]);
  });
  it("rejects bad ZIP codes", () => {
    expect(propertyCreateSchema.safeParse({ ...base, zipCode: "6065" }).success).toBe(false);
    expect(propertyCreateSchema.safeParse({ ...base, zipCode: "60657-1234" }).success).toBe(true);
  });
  it("rejects non-2-letter states", () => {
    expect(propertyCreateSchema.safeParse({ ...base, state: "Illinois" }).success).toBe(false);
  });
});

describe("unitInputSchema + toUnitData", () => {
  it("coerces form strings and converts dollars to integer cents", () => {
    const parsed = unitInputSchema.parse({
      unitNumber: "2F",
      bedrooms: "2",
      bathrooms: "1.5",
      squareFeet: "850",
      marketRentDollars: "1925.50",
    });
    expect(toUnitData(parsed)).toMatchObject({
      unitNumber: "2F",
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 850,
      marketRentCents: 192_550,
    });
  });
  it("treats omitted numbers as nulls (terms included)", () => {
    const parsed = unitInputSchema.parse({ unitNumber: "Main" });
    expect(toUnitData(parsed)).toMatchObject({
      unitNumber: "Main",
      bedrooms: null,
      bathrooms: null,
      squareFeet: null,
      marketRentCents: null,
      securityDepositCents: null,
      petDepositCents: null,
      petRentCents: null,
      parkingRentCents: null,
      parkingSpot: null,
      utilitiesIncluded: [],
    });
  });
  it("rejects quarter bathrooms", () => {
    expect(unitInputSchema.safeParse({ unitNumber: "1", bathrooms: "1.25" }).success).toBe(false);
  });
});
