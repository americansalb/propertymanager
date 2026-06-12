import * as React from "react";
(globalThis as Record<string, unknown>).React = React;
const { renderToStaticMarkup } = await import("react-dom/server");
const { PropertyPortrait } = await import("./src/components/brand/property-portrait");
const { writeFileSync } = await import("node:fs");
const h = React.createElement;

const occ = { status: "OCCUPIED" }, vac = { status: "VACANT" }, not = { status: "NOTICE" };
const cases = [
  ["single occupied", "sf-1", "SINGLE_FAMILY", [occ]],
  ["townhouse vacant", "th-9", "TOWNHOUSE", [vac]],
  ["duplex 1/2", "dx-4", "MULTIFAMILY", [occ, vac]],
  ["12u mixed", "apt-12", "MULTIFAMILY", [occ,occ,vac,occ,not,occ,vac,vac,occ,vac,vac,vac]],
  ["commercial 6u", "com-3", "COMMERCIAL", [occ,occ,vac,occ,occ,vac]],
  ["18u pennant", "big-8", "MULTIFAMILY", Array.from({length:18},(_,i)=> i%3? occ: vac)],
] as const;

const cells = cases.map(([label, key, type, units], i) => {
  const svg = renderToStaticMarkup(h(PropertyPortrait, { seedKey: key, type, units: [...units] as {status:string}[] }));
  const inner = svg.replace(/<svg[^>]*>/, "").replace("</svg>", "");
  const x = 30 + (i % 3) * 260, y = 20 + Math.floor(i / 3) * 220;
  return `<rect x="${x-10}" y="${y-10}" width="240" height="180" fill="#FFFFFF" stroke="#E7E2DA"/>
<g transform="translate(${x},${y}) scale(1.4)">${inner}</g>
<text x="${x}" y="${y+190}" font-family="sans-serif" font-size="13" fill="#34383F">${label}</text>`;
}).join("\n");
writeFileSync("/tmp/portraits.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 460" width="820" height="460"><rect width="820" height="460" fill="#FAF8F4"/>${cells}</svg>`);
console.log("ok");
