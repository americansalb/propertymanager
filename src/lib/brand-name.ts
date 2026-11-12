/**
 * Split a brand name into the two words the wordmark colors separately.
 * The name comes from env (BRAND_NAME), so nothing here may assume it:
 * "VillageKeep" -> ["Village", "Keep"], "Village Keep" -> ["Village ", "Keep"],
 * a single word -> [name, ""].
 */
export function splitBrandName(name: string): [string, string] {
  const trimmed = name.trim();
  for (let i = trimmed.length - 1; i > 0; i--) {
    const prev = trimmed[i - 1];
    const ch = trimmed[i];
    if (/\s/.test(ch)) continue;
    const afterSpace = /\s/.test(prev);
    const camelHump = /[A-Z]/.test(ch) && /[a-z0-9]/.test(prev);
    if (afterSpace || camelHump) return [trimmed.slice(0, i), trimmed.slice(i)];
  }
  return [trimmed, ""];
}
