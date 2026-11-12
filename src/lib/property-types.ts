/** One name for each kind of property, used everywhere it is shown. */
export const PROPERTY_TYPE_LABEL: Record<string, string> = {
  SINGLE_FAMILY: "Single-family home",
  MULTIFAMILY: "Building with units",
  CONDO: "Condo",
  TOWNHOUSE: "Townhouse",
  COMMERCIAL: "Commercial",
  OTHER: "Other",
};

/** "1247 W Oakdale Ave, Chicago, IL 60657" */
export function addressLine(p: {
  address1: string;
  address2: string | null;
  city: string;
  state: string;
  zipCode: string;
}): string {
  return `${p.address1}${p.address2 ? `, ${p.address2}` : ""}, ${p.city}, ${p.state} ${p.zipCode}`;
}
