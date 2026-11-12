import { brand } from "@/lib/brand";
import { splitBrandName } from "@/lib/brand-name";

/**
 * The brand name set as the wordmark: first word in the keep's green,
 * last word in copper, mirroring the mark. Size comes from className.
 *
 * tone "light" for parchment and white grounds, "dark" for iron.
 */
export function Wordmark({
  className,
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const [first, last] = splitBrandName(brand.name);
  const firstColor = tone === "dark" ? "text-patina-bright" : "text-keep";
  const lastColor = tone === "dark" ? "text-copper-bright" : "text-copper-deep";
  return (
    <span className={`font-sans font-semibold tracking-tight ${className ?? ""}`}>
      <span className={firstColor}>{first}</span>
      {last ? <span className={lastColor}>{last}</span> : null}
    </span>
  );
}
