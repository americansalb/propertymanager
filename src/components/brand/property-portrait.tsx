/**
 * Generative property portrait: VillageKeep draws every property in the
 * village style. The geometry is the DATA: the building form comes from the
 * property type, windows are the actual units, occupied units glow warm,
 * vacant ones sit dark, notice burns amber. Seeded by the property id so
 * each portrait is unique and stable. Zero curves, flat fills.
 */

const IRON = "#34383F";
const IRON_DEEP = "#1d2024";
const COPPER = "#D08A45";
const COPPER_DEEP = "#9E5B23";
const PATINA = "#3E7C66";
const GLOW = "#F6E7D7";
const NOTICE = "#D9A441";

export type PortraitUnit = { status: string };

function hashSeed(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

function paneFill(status: string): string {
  if (status === "OCCUPIED") return GLOW;
  if (status === "NOTICE") return NOTICE;
  return IRON_DEEP;
}

const ACCENTS = [COPPER, PATINA, COPPER_DEEP];

export function PropertyPortrait({
  seedKey,
  type,
  units,
  className,
}: {
  seedKey: string;
  type: string;
  units: PortraitUnit[];
  className?: string;
}) {
  const seed = hashSeed(seedKey);
  const accent = ACCENTS[seed % 3]!;
  const accent2 = ACCENTS[(seed + 1) % 3]!;
  const isHouse =
    type === "SINGLE_FAMILY" || type === "CONDO" || type === "TOWNHOUSE" || units.length <= 2;

  return (
    <svg
      viewBox="0 0 160 120"
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
    >
      {isHouse ? (
        <House seed={seed} type={type} units={units} accent={accent} accent2={accent2} />
      ) : (
        <Building seed={seed} type={type} units={units} accent={accent} accent2={accent2} />
      )}
    </svg>
  );
}

function House({
  seed,
  type,
  units,
  accent,
  accent2,
}: {
  seed: number;
  type: string;
  units: PortraitUnit[];
  accent: string;
  accent2: string;
}) {
  const flatTop = type === "TOWNHOUSE";
  const chimney = !flatTop && seed % 2 === 0;
  const shown = units.slice(0, 2);
  // One window per unit for a duplex; both windows follow the single unit.
  const left = shown[0] ?? { status: "VACANT" };
  const right = shown[1] ?? left;

  return (
    <g>
      {flatTop ? (
        <g>
          <rect x="44" y="60" width="72" height="8" fill={accent} />
          <rect x="48" y="54" width="12" height="6" fill={accent} />
          <rect x="100" y="54" width="12" height="6" fill={accent} />
        </g>
      ) : (
        <g>
          {chimney && (
            <g>
              <rect x="98" y="44" width="9" height="18" fill={IRON} />
              <rect x="96" y="41" width="13" height="4" fill={IRON} />
            </g>
          )}
          <polygon points="42,68 80,38 118,68" fill={accent} />
        </g>
      )}
      <rect x="48" y="68" width="64" height="44" fill={IRON} />
      <rect x="54" y="76" width="13" height="13" fill={paneFill(left.status)} />
      <rect x="93" y="76" width="13" height="13" fill={paneFill(right.status)} />
      <rect x="73" y="86" width="14" height="26" fill={accent2} />
      <rect x="42" y="112" width="76" height="3" fill={IRON} />
    </g>
  );
}

function Building({
  seed,
  type,
  units,
  accent,
  accent2,
}: {
  seed: number;
  type: string;
  units: PortraitUnit[];
  accent: string;
  accent2: string;
}) {
  const shown = units.slice(0, 18);
  const cols = shown.length <= 4 ? 2 : shown.length <= 9 ? 3 : shown.length <= 16 ? 4 : 5;
  const rows = Math.ceil(shown.length / cols);
  const W = cols * 16 + 24;
  const topPad = 10;
  const groundH = 28;
  const H = topPad + rows * 15 + groundH;
  const bx = 80 - W / 2;
  const by = 112 - H;
  const roof = seed % 3; // 0 parapet, 1 gable, 2 shed
  const pennant = seed % 4 === 0;
  const commercial = type === "COMMERCIAL";
  const roofTopY = roof === 1 ? by - Math.min(24, W * 0.26) : by - 11;

  return (
    <g>
      {/* roof */}
      {roof === 0 && (
        <g>
          <rect x={bx - 4} y={by - 6} width={W + 8} height="6" fill={IRON} />
          <rect x={bx + 2} y={by - 11} width="9" height="5" fill={IRON} />
          <rect x={76} y={by - 11} width="9" height="5" fill={IRON} />
          <rect x={bx + W - 11} y={by - 11} width="9" height="5" fill={IRON} />
        </g>
      )}
      {roof === 1 && (
        <polygon
          points={`${bx - 2},${by} 80,${roofTopY} ${bx + W + 2},${by}`}
          fill={accent}
        />
      )}
      {roof === 2 && (
        <polygon
          points={`${bx - 2},${by} ${bx + W + 2},${by} ${bx + W + 2},${by - 12}`}
          fill={accent}
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

      {/* body */}
      <rect x={bx} y={by} width={W} height={H} fill={IRON} />

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

      {/* ground floor: storefront left of the door for commercial */}
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
