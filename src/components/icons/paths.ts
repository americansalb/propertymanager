/**
 * VillageKeep proprietary icon language. Original work, no third-party icon
 * code or traced glyphs.
 *
 * Construction rules (derived from the keep mark):
 *  - 24x24 grid, ~2.5px safe margin, solid fills only (no strokes).
 *  - ZERO curves: every path is M/L/H/V/Z. Circles become octagons or
 *    diamonds, rounded corners become 45-degree chamfers ("cut metal").
 *  - Negative space (knockouts via evenodd) is at least ~1.2px wide.
 *  - Two-tone: the default rendering is monochrome currentColor; `duo`
 *    rendering fills accent paths with copper/patina from the brand palette.
 */

export const ICON_ACCENTS = {
  copper: "#D08A45",
  copperDeep: "#9E5B23",
  patina: "#3E7C66",
} as const;

export type AccentName = keyof typeof ICON_ACCENTS;

export type IconPath = {
  d: string;
  /** Filled with this brand color in duo mode; currentColor in mono. */
  accent?: AccentName;
  transform?: string;
};

export type IconDef = {
  /** kebab-case identifier, also the export suffix. */
  name: string;
  /** Human label + intended use, shown on the design sheet. */
  label: string;
  paths: IconPath[];
};

export const ICONS: IconDef[] = [
  {
    name: "keep",
    label: "Keep: dashboard / portfolio",
    paths: [
      {
        d: "M3.5 21.5 V4 H7.5 V7.5 H10 V4 H14 V7.5 H16.5 V4 H20.5 V21.5 Z M9.5 21.5 V15 L10.5 14 H13.5 L14.5 15 V21.5 Z",
      },
      { d: "M10.7 21.5 V15.9 L11.2 15.4 H12.8 L13.3 15.9 V21.5 Z", accent: "patina" },
    ],
  },
  {
    name: "property",
    label: "Property: building",
    paths: [
      {
        d: "M5 21.5 V4.7 L6.2 3.5 H17.8 L19 4.7 V21.5 Z M7.3 6.3 H9.7 V8.7 H7.3 Z M10.8 6.3 H13.2 V8.7 H10.8 Z M14.3 6.3 H16.7 V8.7 H14.3 Z M7.3 10.3 H9.7 V12.7 H7.3 Z M10.8 10.3 H13.2 V12.7 H10.8 Z M14.3 10.3 H16.7 V12.7 H14.3 Z M10.3 21.5 V16.8 L11.1 16 H12.9 L13.7 16.8 V21.5 Z",
      },
      { d: "M11.3 21.5 V17.4 L11.6 17.1 H12.4 L12.7 17.4 V21.5 Z", accent: "copper" },
    ],
  },
  {
    name: "home",
    label: "Home: single-family / the logo house",
    paths: [
      {
        d: "M12 3 L21.2 11.2 L19.6 12.9 L18.5 11.9 V21.5 H5.5 V11.9 L4.4 12.9 L2.8 11.2 Z M9.8 21.5 V15.4 L10.8 14.4 H13.2 L14.2 15.4 V21.5 Z",
      },
      { d: "M12 5.6 L6.9 10.2 H12 Z", accent: "copper" },
      { d: "M12 5.6 L17.1 10.2 H12 Z", accent: "copperDeep" },
    ],
  },
  {
    name: "door",
    label: "Door: unit",
    paths: [
      {
        d: "M7 19 V4.7 L8.2 3.5 H15.8 L17 4.7 V19 Z M13.1 10.8 H14.9 V12.6 H13.1 Z",
      },
      { d: "M5 22 V20.5 H19 V22 Z" },
      { d: "M13.5 11.2 H14.5 V12.2 H13.5 Z", accent: "copper" },
    ],
  },
  {
    name: "tenants",
    label: "Tenants: people",
    paths: [
      { d: "M9.5 3.4 L12.7 6.6 L9.5 9.8 L6.3 6.6 Z" },
      { d: "M4.5 21.5 V17 L8 12.8 H11 L14.5 17 V21.5 Z" },
      { d: "M17 5.6 L19.6 8.2 L17 10.8 L14.4 8.2 Z", accent: "patina" },
      { d: "M15.9 21.5 V17.2 L17.6 15.1 H19.6 L21.3 17.2 V21.5 Z", accent: "patina" },
    ],
  },
  {
    name: "lease",
    label: "Lease: sealed document",
    paths: [
      {
        d: "M5.5 21.5 V2.5 H14.3 L18.5 6.7 V21.5 Z M14.9 3.7 L17.5 6.3 H14.9 Z M8 10 H16 V11.6 H8 Z M8 12.8 H16 V14.4 H8 Z M8 16 H12.5 V17.6 H8 Z M15.6 14.7 L18.3 17.4 L15.6 20.1 L12.9 17.4 Z",
      },
      { d: "M15.6 15.8 L17.2 17.4 L15.6 19 L14 17.4 Z", accent: "patina" },
    ],
  },
  {
    name: "rent",
    label: "Rent: coin with the home in it",
    paths: [
      {
        d: "M8.1 2.5 H15.9 L21.5 8.1 V15.9 L15.9 21.5 H8.1 L2.5 15.9 V8.1 Z M12 6.4 L17.1 11 H15.5 V17.6 H8.5 V11 H6.9 Z",
      },
      { d: "M12 8 L15.7 11.3 H14.4 V16.5 H9.6 V11.3 H8.3 Z", accent: "copper" },
    ],
  },
  {
    name: "wrench",
    label: "Wrench: maintenance",
    paths: [
      {
        d: "M3.98 7.6 H7.62 L10.2 10.18 V13.82 L7.62 16.4 H3.98 L1.4 13.82 V13.35 H5.8 V10.65 H1.4 V10.18 Z M10.2 10.6 H20.2 L21.6 12 L20.2 13.4 H10.2 Z",
        transform: "rotate(45 12 12)",
      },
    ],
  },
  {
    name: "market",
    label: "Market: jobs / marketplace storefront",
    paths: [
      { d: "M3 6 H21 V11 H16.6 V8.2 H14.2 V11 H9.8 V8.2 H7.4 V11 H3 Z", accent: "copper" },
      {
        d: "M4.5 12.8 H19.5 V21.5 H4.5 Z M7 21.5 V15.5 H10.8 V21.5 Z M13.2 15.5 H17 V18.6 H13.2 Z",
      },
    ],
  },
  {
    name: "hardhat",
    label: "Hard hat: pros",
    paths: [
      {
        d: "M4.6 14.8 L6.2 7.6 L9.8 4.4 H14.2 L17.8 7.6 L19.4 14.8 Z M10.9 4.4 H13.1 V10.2 H10.9 Z",
        accent: "copper",
      },
      { d: "M3.7 16.3 H20.3 L21.5 17.5 L20.3 18.7 H3.7 L2.5 17.5 Z" },
    ],
  },
  {
    name: "escrow",
    label: "Escrow: the home held safe",
    paths: [
      {
        d: "M12 2.3 L20.7 5.5 V12.2 L12 21.7 L3.3 12.2 V5.5 Z M12 7 L16.6 11.1 H15.3 V15.9 H8.7 V11.1 H7.4 Z",
      },
      { d: "M12 8.6 L15.5 11.7 H14.2 V14.7 H9.8 V11.7 H8.5 Z", accent: "patina" },
    ],
  },
  {
    name: "verified",
    label: "Verified: credential seal",
    paths: [
      {
        d: "M12 2 L15.6 5.6 H18.4 V8.4 L22 12 L18.4 15.6 V18.4 H15.6 L12 22 L8.4 18.4 H5.6 V15.6 L2 12 L5.6 8.4 V5.6 H8.4 Z M7.4 12.1 L10.7 15.4 L16.8 9.3 L14.9 7.4 L10.7 11.6 L9.3 10.2 Z",
        accent: "patina",
      },
    ],
  },
  {
    name: "gear",
    label: "Gear: settings",
    paths: [
      {
        d: "M8.8 4.2 H9.7 V1.6 H14.3 V4.2 H15.2 L19.8 8.8 V9.7 H22.4 V14.3 H19.8 V15.2 L15.2 19.8 H14.3 V22.4 H9.7 V19.8 H8.8 L4.2 15.2 V14.3 H1.6 V9.7 H4.2 V8.8 Z M12 8.4 L15.6 12 L12 15.6 L8.4 12 Z",
      },
    ],
  },
  {
    name: "bell",
    label: "Bell: notifications",
    paths: [
      {
        d: "M10.9 2.2 H13.1 V3.7 L16.3 6.5 L17.3 13.8 L19.6 16.9 V18.3 H4.4 V16.9 L6.7 13.8 L7.7 6.5 L10.9 3.7 Z",
      },
      { d: "M12 19.3 L13.5 20.8 L12 22.3 L10.5 20.8 Z", accent: "copper" },
    ],
  },
  {
    name: "plus",
    label: "Plus: add",
    paths: [
      { d: "M10.3 3.5 H13.7 V10.3 H20.5 V13.7 H13.7 V20.5 H10.3 V13.7 H3.5 V10.3 H10.3 Z" },
    ],
  },
  {
    name: "search",
    label: "Search",
    paths: [
      {
        d: "M7.7 3.5 H13.5 L17.7 7.7 V13.5 L13.5 17.7 H7.7 L3.5 13.5 V7.7 Z M8.8 6.1 H12.4 L15.1 8.8 V12.4 L12.4 15.1 H8.8 L6.1 12.4 V8.8 Z",
      },
      { d: "M15.3 17.2 L17.2 15.3 L21.8 19.9 L19.9 21.8 Z" },
    ],
  },
  {
    name: "logout",
    label: "Logout: sign out",
    paths: [
      { d: "M4.5 3 H13.5 V6 H7.5 V18 H13.5 V21 H4.5 Z" },
      { d: "M11 10.6 H16.2 V8.2 L21.4 12 L16.2 15.8 V13.4 H11 Z" },
    ],
  },
  {
    name: "mail",
    label: "Mail: invitations",
    paths: [
      {
        d: "M3.5 5 H20.5 L21.5 6 V18 L20.5 19 H3.5 L2.5 18 V6 Z M4.6 7.1 L12 13 L19.4 7.1 L20.6 8.6 L12 15.5 L3.4 8.6 Z",
      },
    ],
  },
  {
    name: "calendar",
    label: "Calendar: rent day / scheduling",
    paths: [
      { d: "M6.9 2.5 H8.9 V6 H6.9 Z M15.1 2.5 H17.1 V6 H15.1 Z" },
      { d: "M4.5 7.2 H19.5 L20.5 8.2 V11 H3.5 V8.2 Z" },
      {
        d: "M3.5 12.4 H20.5 V20.5 L19.5 21.5 H4.5 L3.5 20.5 Z M6.4 14.4 H8.6 V16.6 H6.4 Z M10.9 14.4 H13.1 V16.6 H10.9 Z M15.4 14.4 H17.6 V16.6 H15.4 Z",
      },
      { d: "M15.8 14.8 H17.2 V16.2 H15.8 Z", accent: "copper" },
    ],
  },
  {
    name: "chevron-left",
    label: "Chevron left: back",
    paths: [{ d: "M15.1 4.2 L7.3 12 L15.1 19.8 L17.3 17.6 L11.7 12 L17.3 6.4 Z" }],
  },
  {
    name: "chevron-right",
    label: "Chevron right: forward",
    paths: [{ d: "M8.9 4.2 L16.7 12 L8.9 19.8 L6.7 17.6 L12.3 12 L6.7 6.4 Z" }],
  },
  {
    name: "tools",
    label: "Tools: service pro (crossed wrench + hammer)",
    paths: [
      {
        d: "M15.4 9.4 H20 L21.1 10.5 V13.5 L20 14.6 H15.4 Z M4.3 10.9 H15.4 V13.1 H4.3 L3.2 12 Z",
        transform: "rotate(-45 12 12)",
        accent: "copper",
      },
      {
        d: "M4.9 8.4 H7.9 L10 10.5 V13.5 L7.9 15.6 H4.9 L2.8 13.5 V13.1 H6.4 V10.9 H2.8 V10.5 Z M10 10.9 H19.6 L20.7 12 L19.6 13.1 H10 Z",
        transform: "rotate(45 12 12)",
      },
    ],
  },
  {
    name: "alert",
    label: "Alert: urgency / emergency",
    paths: [
      {
        d: "M12 2.3 L21.7 12 L12 21.7 L2.3 12 Z M10.9 7.2 H13.1 V13.6 H10.9 Z M10.9 15.4 H13.1 V17.6 H10.9 Z",
        accent: "copper",
      },
    ],
  },
  {
    name: "check",
    label: "Check: done / success",
    paths: [{ d: "M4.2 12.9 L9.6 18.3 L19.8 8.1 L17.4 5.7 L9.6 13.5 L6.6 10.5 Z" }],
  },
  {
    name: "close",
    label: "Close: dismiss / remove",
    paths: [
      {
        d: "M12 9.7 L17.5 4.2 L19.8 6.5 L14.3 12 L19.8 17.5 L17.5 19.8 L12 14.3 L6.5 19.8 L4.2 17.5 L9.7 12 L4.2 6.5 L6.5 4.2 Z",
      },
    ],
  },
];

export function iconByName(name: string): IconDef {
  const def = ICONS.find((i) => i.name === name);
  if (!def) throw new Error(`Unknown icon: ${name}`);
  return def;
}
