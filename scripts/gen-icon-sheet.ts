/**
 * Generates the icon review sheet (docs/design/icons-sheet.svg) from the
 * single source of truth in src/components/icons/paths.ts.
 * Usage: pnpm tsx scripts/gen-icon-sheet.ts
 * PNG render (for review threads): sharp-cli or any SVG renderer.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { ICON_ACCENTS, ICONS, type IconPath } from "../src/components/icons/paths";

const IRON = "#34383F";
const PARCHMENT = "#FAF8F4";
const STONE = "#8A857C";

function pathsToSvg(paths: IconPath[], duo: boolean, color: string): string {
  return paths
    .map((p) => {
      const fill = duo && p.accent ? ICON_ACCENTS[p.accent] : color;
      const tf = p.transform ? ` transform="${p.transform}"` : "";
      return `<path d="${p.d}" fill="${fill}" fill-rule="evenodd"${tf}/>`;
    })
    .join("");
}

function cell(x: number, y: number, icon: (typeof ICONS)[number]): string {
  const variants: string[] = [];
  // 64px duo on parchment
  variants.push(
    `<g transform="translate(${x + 12},${y + 14}) scale(${64 / 24})">${pathsToSvg(icon.paths, true, IRON)}</g>`,
  );
  // 36px mono
  variants.push(
    `<g transform="translate(${x + 92},${y + 28}) scale(${36 / 24})">${pathsToSvg(icon.paths, false, IRON)}</g>`,
  );
  // 36px reversed on iron chip
  variants.push(
    `<rect x="${x + 140}" y="${y + 24}" width="44" height="44" rx="6" fill="${IRON}"/>`,
    `<g transform="translate(${x + 144},${y + 28}) scale(${36 / 24})">${pathsToSvg(icon.paths, true, PARCHMENT)}</g>`,
  );
  // 16px mono (nav size legibility check)
  variants.push(
    `<g transform="translate(${x + 102},${y + 74}) scale(${16 / 24})">${pathsToSvg(icon.paths, false, IRON)}</g>`,
  );
  const label = `<text x="${x + 12}" y="${y + 102}" font-family="system-ui, sans-serif" font-size="11" fill="${IRON}" font-weight="600">${icon.name}</text>
<text x="${x + 12}" y="${y + 116}" font-family="system-ui, sans-serif" font-size="9.5" fill="${STONE}">${icon.label.replace(/&/g, "&amp;")}</text>`;
  return variants.join("\n") + "\n" + label;
}

const COLS = 5;
const CELL_W = 200;
const CELL_H = 136;
const HEADER = 96;
const rows = Math.ceil(ICONS.length / COLS);
const W = COLS * CELL_W + 40;
const H = HEADER + rows * CELL_H + 28;

const cells = ICONS.map((icon, i) => {
  const x = 20 + (i % COLS) * CELL_W;
  const y = HEADER + Math.floor(i / COLS) * CELL_H;
  return cell(x, y, icon);
}).join("\n");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="${PARCHMENT}"/>
<text x="20" y="38" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="${IRON}">VillageKeep icon set v1 (proprietary)</text>
<text x="20" y="60" font-family="system-ui, sans-serif" font-size="12" fill="${STONE}">Forged language: solid fills, zero curves, 45-degree chamfers. Octagons instead of circles, diamonds instead of dots.</text>
<text x="20" y="76" font-family="system-ui, sans-serif" font-size="12" fill="${STONE}">Per icon: 64px two-tone (copper/patina accents), 36px mono, 36px reversed on iron, 16px nav size.</text>
${cells}
</svg>
`;

mkdirSync("docs/design", { recursive: true });
writeFileSync("docs/design/icons-sheet.svg", svg);
console.log(`Wrote docs/design/icons-sheet.svg (${ICONS.length} icons)`);
