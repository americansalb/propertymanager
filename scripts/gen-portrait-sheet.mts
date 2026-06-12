/**
 * Renders the property-portrait matrix (type x size x occupancy x seeds) to
 * docs/design/portraits-sheet.svg for visual QA. Same pattern as the icon
 * sheet: the components are the single source of truth.
 * Usage: pnpm design:portraits  (PNG via sharp-cli if you want one)
 */
import * as React from "react";
// tsx compiles the component's JSX with the classic transform; provide the global.
(globalThis as Record<string, unknown>).React = React;
const { renderToStaticMarkup } = await import("react-dom/server");
const { PropertyPortrait } = await import("../src/components/brand/property-portrait");
import { mkdirSync, writeFileSync } from "node:fs";
import type { PortraitUnit } from "../src/components/brand/property-portrait";

const h = React.createElement;

const occ: PortraitUnit = { status: "OCCUPIED" };
const vac: PortraitUnit = { status: "VACANT" };
const not: PortraitUnit = { status: "NOTICE" };

const mix = (n: number): PortraitUnit[] =>
  Array.from({ length: n }, (_, i) => (i === 4 ? not : i % 3 === 2 ? vac : occ));

const CASES: Array<[string, string, string, PortraitUnit[]]> = [
  ["single occupied", "sf-a", "SINGLE_FAMILY", [occ]],
  ["single vacant", "sf-b", "SINGLE_FAMILY", [vac]],
  ["townhouse", "th-c", "TOWNHOUSE", [occ]],
  ["condo occupied", "cd-d", "CONDO", [occ]],
  ["condo vacant", "cd-e", "CONDO", [vac]],
  ["duplex 2u (founder bug)", "mf-f", "MULTIFAMILY", [occ, vac]],
  ["3-flat", "mf-g", "MULTIFAMILY", mix(3)],
  ["6-flat", "mf-h", "MULTIFAMILY", mix(6)],
  ["12u", "mf-i", "MULTIFAMILY", mix(12)],
  ["18u", "mf-j", "MULTIFAMILY", mix(18)],
  ["commercial 1u", "co-k", "COMMERCIAL", [occ]],
  ["commercial 6u", "co-l", "COMMERCIAL", mix(6)],
  ["other 2u", "ot-m", "OTHER", [occ, vac]],
  ["seed variety 1", "var-1", "MULTIFAMILY", mix(6)],
  ["seed variety 2", "var-22", "MULTIFAMILY", mix(6)],
  ["seed variety 3", "var-333", "MULTIFAMILY", mix(6)],
];

const COLS = 4;
const CW = 230;
const CH = 200;
const rows = Math.ceil(CASES.length / COLS);
const W = COLS * CW + 30;
const H = rows * CH + 60;

const cells = CASES.map(([label, key, type, units], i) => {
  const svg = renderToStaticMarkup(h(PropertyPortrait, { seedKey: key, type, units }));
  const inner = svg.replace(/<svg[^>]*>/, "").replace("</svg>", "");
  const x = 20 + (i % COLS) * CW;
  const y = 40 + Math.floor(i / COLS) * CH;
  return `<rect x="${x - 6}" y="${y - 6}" width="${CW - 18}" height="${CH - 40}" fill="#FFFFFF" stroke="#E7E2DA"/>
<g transform="translate(${x + 12},${y + 8}) scale(1.15)">${inner}</g>
<text x="${x}" y="${y + CH - 26}" font-family="sans-serif" font-size="12" fill="#34383F">${label}</text>`;
}).join("\n");

mkdirSync("docs/design", { recursive: true });
writeFileSync(
  "docs/design/portraits-sheet.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#FAF8F4"/>
<text x="20" y="26" font-family="sans-serif" font-size="16" font-weight="700" fill="#34383F">Property portraits: type-truth, brick mix, the shimmer</text>
${cells}
</svg>`,
);
console.log(`Wrote docs/design/portraits-sheet.svg (${CASES.length} cases)`);
