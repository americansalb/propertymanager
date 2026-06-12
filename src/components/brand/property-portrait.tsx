/**
 * Generative property portrait: VillageKeep draws every property in the
 * village style. The geometry is the DATA: the building form follows the
 * property TYPE truthfully (a 2-unit multifamily is a small building, never
 * a cottage; a condo is one lit unit inside a larger building), windows are
 * the actual units (occupied glows, vacant sits dark, notice burns amber),
 * bodies are Chicago brick with seeded variety, and every gable carries the
 * shimmer: light face left of the apex, deep face right. Zero curves.
 */
import {
  BODY_MIX,
  BRICK,
  BRICK_DEEP,
  COPPER,
  COPPER_DEEP,
  GLOW,
  IRON,
  IRON_DEEP,
  NOTICE,
  PATINA,
  ROOF_PAIRS,
} from "./palette";

export type PortraitUnit = { status: string };

export type PortraitVariant = "house" | "rowhouse" | "condo" | "building";

/** Type-truth, founder-locked: multifamily and commercial are ALWAYS buildings. */
export function pickVariant(type: string, unitCount: number): PortraitVariant {
  switch (type) {
    case "SINGLE_FAMILY":
      return "house";
    case "TOWNHOUSE":
      return "rowhouse";
    case "CONDO":
      return "condo";
    case "MULTIFAMILY":
    case "COMMERCIAL":
      return "building";
    default:
      return unitCount <= 2 ? "house" : "building";
  }
}

function hashSeed(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export function pickBody(seed: number): string {
  return BODY_MIX[(seed >> 2) % BODY_MIX.length]!;
}

/** Owner-chosen looks from the portrait studio; null/undefined = seeded. */
export type PortraitPrefs = {
  portraitSeed?: number | null;
  portraitBody?: string | null;
  portraitRoof?: string | null;
  portraitAccent?: string | null;
};

const BODY_BY_NAME: Record<string, string> = {
  BRICK,
  BRICK_DEEP,
  IRON,
};

const ROOF_INDEX: Record<string, number> = { PARAPET: 0, GABLE: 1, SHED: 2 };

export function resolvePortrait(seedKey: string, prefs?: PortraitPrefs | null) {
  const seed = prefs?.portraitSeed ?? hashSeed(seedKey);
  const body = (prefs?.portraitBody && BODY_BY_NAME[prefs.portraitBody]) || pickBody(seed);
  const roofPair =
    prefs?.portraitAccent === "COPPER"
      ? ROOF_PAIRS[0]!
      : prefs?.portraitAccent === "PATINA"
        ? ROOF_PAIRS[1]!
        : ROOF_PAIRS[seed % ROOF_PAIRS.length]!;
  const roofStyle =
    prefs?.portraitRoof != null ? (ROOF_INDEX[prefs.portraitRoof] ?? null) : null;
  return { seed, body, roofPair, roofStyle };
}

function paneFill(status: string): string {
  if (status === "OCCUPIED") return GLOW;
  if (status === "NOTICE") return NOTICE;
  return IRON_DEEP;
}

/** A gable split at its apex: the logo's shimmer on every roof. */
function FacetGable({
  leftX,
  apexX,
  rightX,
  eaveY,
  apexY,
  pair,
}: {
  leftX: number;
  apexX: number;
  rightX: number;
  eaveY: number;
  apexY: number;
  pair: readonly [string, string];
}) {
  return (
    <g>
      <polygon points={`${leftX},${eaveY} ${apexX},${apexY} ${apexX},${eaveY}`} fill={pair[0]} />
      <polygon points={`${apexX},${eaveY} ${apexX},${apexY} ${rightX},${eaveY}`} fill={pair[1]} />
    </g>
  );
}

export function PropertyPortrait({
  seedKey,
  type,
  units,
  className,
  prefs,
}: {
  seedKey: string;
  type: string;
  units: PortraitUnit[];
  className?: string;
  prefs?: PortraitPrefs | null;
}) {
  const { seed, body, roofPair, roofStyle } = resolvePortrait(seedKey, prefs);
  const variant = pickVariant(type, units.length);
  const accent2 = seed % 2 === 0 ? PATINA : COPPER_DEEP;

  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      {variant === "house" && (
        <House seed={seed} units={units} body={body} roofPair={roofPair} accent2={accent2} flat={false} />
      )}
      {variant === "rowhouse" && (
        <House seed={seed} units={units} body={body} roofPair={roofPair} accent2={accent2} flat />
      )}
      {variant === "condo" && <Condo seed={seed} units={units} body={body} />}
      {variant === "building" && (
        <Building
          seed={seed}
          type={type}
          units={units}
          body={body}
          roofPair={roofPair}
          accent2={accent2}
          roofStyle={roofStyle}
        />
      )}
    </svg>
  );
}

function House({
  seed,
  units,
  body,
  roofPair,
  accent2,
  flat,
}: {
  seed: number;
  units: PortraitUnit[];
  body: string;
  roofPair: readonly [string, string];
  accent2: string;
  flat: boolean;
}) {
  const chimney = !flat && seed % 2 === 0;
  const shown = units.slice(0, 2);
  const left = shown[0] ?? { status: "VACANT" };
  const right = shown[1] ?? left;

  return (
    <g>
      {flat ? (
        <g>
          <rect x="44" y="60" width="72" height="8" fill={roofPair[0]} />
          <rect x="80" y="60" width="36" height="8" fill={roofPair[1]} />
          <rect x="48" y="54" width="12" height="6" fill={roofPair[0]} />
          <rect x="100" y="54" width="12" height="6" fill={roofPair[1]} />
        </g>
      ) : (
        <g>
          {chimney && (
            <g>
              <rect x="98" y="44" width="9" height="18" fill={IRON} />
              <rect x="96" y="41" width="13" height="4" fill={IRON} />
            </g>
          )}
          <FacetGable leftX={42} apexX={80} rightX={118} eaveY={68} apexY={38} pair={roofPair} />
        </g>
      )}
      <rect x="48" y="68" width="64" height="44" fill={body} />
      <rect x="54" y="76" width="13" height="13" fill={paneFill(left.status)} />
      <rect x="93" y="76" width="13" height="13" fill={paneFill(right.status)} />
      <rect x="73" y="86" width="14" height="26" fill={accent2} />
      <rect x="42" y="112" width="76" height="3" fill={IRON} />
    </g>
  );
}

/** A condo is one home INSIDE a building: our window glows in its frame. */
function Condo({ seed, units, body }: { seed: number; units: PortraitUnit[]; body: string }) {
  const ours = seed % 9;
  const status = units[0]?.status ?? "VACANT";
  const bx = 44;
  const W = 72;
  const by = 28;

  return (
    <g>
      <rect x={bx - 4} y={by - 6} width={W + 8} height="6" fill={IRON} />
      <rect x={bx + 2} y={by - 11} width="9" height="5" fill={IRON} />
      <rect x={77} y={by - 11} width="9" height="5" fill={IRON} />
      <rect x={bx + W - 11} y={by - 11} width="9" height="5" fill={IRON} />
      <rect x={bx} y={by} width={W} height={112 - by} fill={body} />
      {Array.from({ length: 9 }).map((_, i) => {
        const c = i % 3;
        const r = Math.floor(i / 3);
        const x = bx + 11 + c * 18;
        const y = by + 9 + r * 17;
        if (i === ours) {
          return (
            <g key={i}>
              <rect x={x - 1.5} y={y - 1.5} width="13" height="13" fill={COPPER} />
              <rect x={x} y={y} width="10" height="10" fill={paneFill(status)} />
            </g>
          );
        }
        return <rect key={i} x={x} y={y} width="10" height="10" fill="#3F444C" />;
      })}
      <rect x="73" y="90" width="14" height="22" fill={COPPER_DEEP} />
      <rect x={bx - 6} y="112" width={W + 12} height="3" fill={IRON} />
    </g>
  );
}

function Building({
  seed,
  type,
  units,
  body,
  roofPair,
  accent2,
  roofStyle,
}: {
  seed: number;
  type: string;
  units: PortraitUnit[];
  body: string;
  roofPair: readonly [string, string];
  accent2: string;
  roofStyle: number | null;
}) {
  const shown = units.slice(0, 18);
  const cols = shown.length <= 4 ? 2 : shown.length <= 9 ? 3 : shown.length <= 16 ? 4 : 5;
  const rows = Math.max(1, Math.ceil(shown.length / cols));
  const W = cols * 16 + 24;
  const topPad = 10;
  const groundH = 28;
  const H = topPad + rows * 15 + groundH;
  const bx = 80 - W / 2;
  const by = 112 - H;
  const roof = roofStyle ?? seed % 3; // 0 parapet, 1 gable, 2 shed
  const pennant = seed % 4 === 0;
  const commercial = type === "COMMERCIAL";
  const roofTopY = roof === 1 ? by - Math.min(24, W * 0.26) : by - 11;

  return (
    <g>
      {roof === 0 && (
        <g>
          <rect x={bx - 4} y={by - 6} width={W + 8} height="6" fill={IRON} />
          <rect x={bx + 2} y={by - 11} width="9" height="5" fill={IRON} />
          <rect x={76} y={by - 11} width="9" height="5" fill={IRON} />
          <rect x={bx + W - 11} y={by - 11} width="9" height="5" fill={IRON} />
        </g>
      )}
      {roof === 1 && (
        <FacetGable
          leftX={bx - 2}
          apexX={80}
          rightX={bx + W + 2}
          eaveY={by}
          apexY={roofTopY}
          pair={roofPair}
        />
      )}
      {roof === 2 && (
        <polygon
          points={`${bx - 2},${by} ${bx + W + 2},${by} ${bx + W + 2},${by - 12}`}
          fill={roofPair[1]}
        />
      )}
      {pennant && (
        <g>
          <rect x="79.5" y={roofTopY - 16} width="1.6" height="16" fill={IRON} />
          <polygon
            points={`81,${roofTopY - 16} 93,${roofTopY - 12.5} 81,${roofTopY - 9}`}
            fill={COPPER}
          />
        </g>
      )}

      <rect x={bx} y={by} width={W} height={H} fill={body} />

      {/* unit windows: the occupancy IS the picture */}
      {shown.map((u, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return (
          <rect
            key={i}
            x={bx + 15 + c * 16}
            y={by + topPad + r * 15 + 2}
            width="10"
            height="10"
            fill={paneFill(u.status)}
          />
        );
      })}

      {commercial && (
        <g>
          <rect x={bx + 6} y={112 - groundH + 2} width={Math.max(24, 65 - bx)} height="5" fill={accent2} />
          <rect x={bx + 8} y={112 - groundH + 7} width="9" height="4" fill={accent2} />
          <rect x={bx + 24} y={112 - groundH + 7} width="9" height="4" fill={accent2} />
          <rect x={bx + 9} y="95" width={Math.max(18, 60 - bx)} height="12" fill={GLOW} />
        </g>
      )}
      <rect x="73" y="90" width="14" height="22" fill={commercial ? COPPER_DEEP : accent2} />
      <rect x={bx - 6} y="112" width={W + 12} height="3" fill={IRON} />
    </g>
  );
}
