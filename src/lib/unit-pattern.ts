/**
 * Unit quick-fill: turn "1F, 2F" or "101-112" or "A-D" into unit numbers.
 * The landlord types one short pattern instead of clicking Add 12 times.
 *
 * Supported, comma-separated:
 *  - literals:        "1F, 2F, Garden"
 *  - numeric ranges:  "101-112", "1-4" (leading zeros preserved: "01-04")
 *  - letter ranges:   "A-D"
 * Anything unparseable passes through as a literal. Results are trimmed,
 * deduped (case-insensitive), capped to 200, each up to 24 chars.
 */

const MAX_UNITS = 200;
const MAX_LEN = 24;

function expandNumeric(prefix: string, a: string, b: string): string[] {
  const start = parseInt(a, 10);
  const end = parseInt(b, 10);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  if (end - start + 1 > MAX_UNITS) return [];
  const width = a.startsWith("0") ? a.length : 0;
  const out: string[] = [];
  for (let n = start; n <= end; n++) {
    const num = width > 0 ? String(n).padStart(width, "0") : String(n);
    out.push(`${prefix}${num}`);
  }
  return out;
}

function expandLetters(a: string, b: string): string[] {
  const start = a.toUpperCase().charCodeAt(0);
  const end = b.toUpperCase().charCodeAt(0);
  if (end < start) return [];
  const out: string[] = [];
  for (let c = start; c <= end; c++) out.push(String.fromCharCode(c));
  return out;
}

export function parseUnitPattern(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const part of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    let expanded: string[] = [];

    const numeric = part.match(/^(.*?)(\d+)\s*-\s*(.*?)(\d+)$/);
    const letters = part.match(/^([A-Za-z])\s*-\s*([A-Za-z])$/);

    if (numeric && (numeric[3] === "" || numeric[3] === numeric[1])) {
      expanded = expandNumeric(numeric[1]!, numeric[2]!, numeric[4]!);
    } else if (letters) {
      expanded = expandLetters(letters[1]!, letters[2]!);
    }
    if (expanded.length === 0) expanded = [part];

    for (const unit of expanded) {
      const key = unit.toLowerCase();
      if (unit.length > MAX_LEN || seen.has(key)) continue;
      seen.add(key);
      out.push(unit);
      if (out.length >= MAX_UNITS) return out;
    }
  }
  return out;
}
