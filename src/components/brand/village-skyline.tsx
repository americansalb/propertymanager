/**
 * The village: a hand-built geometric skyline in the forge language.
 * Chicago-mix brick bodies (the keep alone stays iron), lit copper-tint
 * windows, and the shimmer on every gable: light face left of the apex,
 * deep face right, exactly like the mark. Zero curves.
 */
import {
  BRICK,
  BRICK_DEEP,
  COPPER,
  COPPER_DEEP,
  GLOW,
  IRON,
  PATINA,
  PATINA_DEEP,
} from "./palette";

export function VillageSkyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 150"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* back row, faded for depth */}
      <g fill={IRON} opacity="0.14">
        <rect x="60" y="52" width="76" height="98" />
        <polygon points="60,52 98,30 136,52" />
        <rect x="225" y="68" width="64" height="82" />
        <rect x="392" y="44" width="78" height="106" />
        <polygon points="392,44 431,22 470,44" />
        <rect x="700" y="58" width="72" height="92" />
        <polygon points="700,58 736,38 772,58" />
        <rect x="880" y="40" width="66" height="110" />
        <rect x="1056" y="62" width="80" height="88" />
        <polygon points="1056,62 1096,40 1136,62" />
      </g>

      {/* ── front row ── */}
      {/* A: corner row-house, stepped parapet (iron anchor) */}
      <g>
        <rect x="0" y="88" width="95" height="62" fill={IRON} />
        <rect x="0" y="80" width="22" height="8" fill={IRON} />
        <rect x="38" y="80" width="22" height="8" fill={IRON} />
        <rect x="74" y="80" width="21" height="8" fill={IRON} />
        <rect x="14" y="100" width="9" height="11" fill={GLOW} />
        <rect x="32" y="100" width="9" height="11" fill={GLOW} />
        <rect x="50" y="100" width="9" height="11" fill={GLOW} />
        <rect x="70" y="122" width="14" height="28" fill={COPPER} />
      </g>

      {/* B: gabled brick house, copper shimmer roof */}
      <g>
        <polygon points="105,72 145,40 145,72" fill={COPPER} />
        <polygon points="145,72 145,40 185,72" fill={COPPER_DEEP} />
        <rect x="105" y="72" width="80" height="78" fill={BRICK} />
        <rect x="120" y="84" width="10" height="12" fill={GLOW} />
        <rect x="140" y="84" width="10" height="12" fill={GLOW} />
        <rect x="160" y="84" width="10" height="12" fill={GLOW} />
        <rect x="120" y="108" width="10" height="12" fill={GLOW} />
        <rect x="160" y="108" width="10" height="12" fill={GLOW} />
        <rect x="136" y="120" width="16" height="30" fill={PATINA} />
      </g>

      {/* C: deep-brick shop with crenellated patina awning */}
      <g>
        <rect x="195" y="82" width="80" height="68" fill={BRICK_DEEP} />
        <rect x="195" y="95" width="80" height="6" fill={PATINA} />
        <rect x="195" y="101" width="14" height="7" fill={PATINA} />
        <rect x="221" y="101" width="14" height="7" fill={PATINA} />
        <rect x="247" y="101" width="14" height="7" fill={PATINA} />
        <rect x="207" y="116" width="34" height="18" fill={GLOW} />
        <rect x="252" y="118" width="13" height="32" fill={COPPER_DEEP} />
      </g>

      {/* D: tall narrow brick townhouse, patina shimmer gable */}
      <g>
        <polygon points="285,55 315,30 315,55" fill={PATINA} />
        <polygon points="315,55 315,30 345,55" fill={PATINA_DEEP} />
        <rect x="285" y="55" width="60" height="95" fill={BRICK} />
        <rect x="305" y="66" width="10" height="12" fill={GLOW} />
        <rect x="305" y="90" width="10" height="12" fill={GLOW} />
        <rect x="305" y="114" width="10" height="12" fill={GLOW} />
      </g>

      {/* E: low brick cottage, copper shimmer gable */}
      <g>
        <polygon points="355,100 392,72 392,100" fill={COPPER} />
        <polygon points="392,100 392,72 430,100" fill={COPPER_DEEP} />
        <rect x="355" y="100" width="75" height="50" fill={BRICK} />
        <rect x="367" y="112" width="10" height="12" fill={GLOW} />
        <rect x="407" y="112" width="10" height="12" fill={GLOW} />
        <rect x="386" y="120" width="14" height="30" fill={PATINA} />
      </g>

      {/* F: iron mid block, stepped center parapet */}
      <g>
        <rect x="440" y="70" width="100" height="80" fill={IRON} />
        <rect x="478" y="60" width="24" height="10" fill={IRON} />
        <rect x="452" y="82" width="10" height="12" fill={GLOW} />
        <rect x="472" y="82" width="10" height="12" fill={GLOW} />
        <rect x="492" y="82" width="10" height="12" fill={GLOW} />
        <rect x="512" y="82" width="10" height="12" fill={GLOW} />
        <rect x="452" y="106" width="10" height="12" fill={GLOW} />
        <rect x="512" y="106" width="10" height="12" fill={GLOW} />
        <rect x="482" y="118" width="16" height="32" fill={COPPER_DEEP} />
      </g>

      {/* KEEP: the center tower, iron forever; its raised home carries the mark's shimmer */}
      <g>
        <rect x="555" y="42" width="90" height="108" fill={IRON} />
        <rect x="555" y="24" width="18" height="18" fill={IRON} />
        <rect x="591" y="24" width="18" height="18" fill={IRON} />
        <rect x="627" y="24" width="18" height="18" fill={IRON} />
        {/* the home raised in the keep: split exactly like the logo */}
        <polygon points="584,96 600,78 600,96" fill={COPPER} />
        <polygon points="600,96 600,78 616,96" fill={COPPER_DEEP} />
        <rect x="588" y="96" width="12" height="12" fill={COPPER} />
        <rect x="600" y="96" width="12" height="12" fill={COPPER_DEEP} />
        {/* patina door */}
        <rect x="588" y="116" width="24" height="34" fill={PATINA} />
        {/* pennant */}
        <rect x="599" y="4" width="2" height="20" fill={IRON} />
        <polygon points="601,4 619,9 601,14" fill={COPPER} />
        <rect x="566" y="56" width="8" height="10" fill={GLOW} />
        <rect x="626" y="56" width="8" height="10" fill={GLOW} />
      </g>

      {/* G: brick mansard house, patina shimmer */}
      <g>
        <polygon points="655,78 672,54 700,54 700,78" fill={PATINA} />
        <polygon points="700,78 700,54 728,54 745,78" fill={PATINA_DEEP} />
        <rect x="655" y="78" width="90" height="72" fill={BRICK} />
        <rect x="668" y="90" width="10" height="12" fill={GLOW} />
        <rect x="690" y="90" width="10" height="12" fill={GLOW} />
        <rect x="712" y="90" width="10" height="12" fill={GLOW} />
        <rect x="730" y="90" width="10" height="12" fill={GLOW} />
        <rect x="692" y="118" width="16" height="32" fill={COPPER} />
      </g>

      {/* H: deep-brick small shop, copper awning */}
      <g>
        <rect x="755" y="92" width="68" height="58" fill={BRICK_DEEP} />
        <rect x="755" y="104" width="68" height="6" fill={COPPER} />
        <rect x="755" y="110" width="12" height="7" fill={COPPER} />
        <rect x="778" y="110" width="12" height="7" fill={COPPER} />
        <rect x="801" y="110" width="12" height="7" fill={COPPER} />
        <rect x="765" y="124" width="28" height="16" fill={GLOW} />
        <rect x="802" y="122" width="13" height="28" fill={PATINA} />
      </g>

      {/* I: brick flat-top block */}
      <g>
        <rect x="833" y="60" width="84" height="90" fill={BRICK} />
        <rect x="833" y="52" width="20" height="8" fill={IRON} />
        <rect x="897" y="52" width="20" height="8" fill={IRON} />
        <rect x="845" y="72" width="9" height="11" fill={GLOW} />
        <rect x="863" y="72" width="9" height="11" fill={GLOW} />
        <rect x="881" y="72" width="9" height="11" fill={GLOW} />
        <rect x="899" y="72" width="9" height="11" fill={GLOW} />
        <rect x="845" y="94" width="9" height="11" fill={GLOW} />
        <rect x="899" y="94" width="9" height="11" fill={GLOW} />
        <rect x="866" y="118" width="15" height="32" fill={COPPER_DEEP} />
      </g>

      {/* J: gabled brick house, copper shimmer */}
      <g>
        <polygon points="927,68 967,38 967,68" fill={COPPER} />
        <polygon points="967,68 967,38 1007,68" fill={COPPER_DEEP} />
        <rect x="927" y="68" width="80" height="82" fill={BRICK} />
        <rect x="941" y="80" width="10" height="12" fill={GLOW} />
        <rect x="963" y="80" width="10" height="12" fill={GLOW} />
        <rect x="985" y="80" width="10" height="12" fill={GLOW} />
        <rect x="958" y="118" width="16" height="32" fill={PATINA} />
      </g>

      {/* K: low deep-brick house, patina shimmer roof */}
      <g>
        <polygon points="1017,104 1052,78 1052,104" fill={PATINA} />
        <polygon points="1052,104 1052,78 1087,104" fill={PATINA_DEEP} />
        <rect x="1017" y="104" width="70" height="46" fill={BRICK_DEEP} />
        <rect x="1029" y="114" width="10" height="12" fill={GLOW} />
        <rect x="1063" y="114" width="10" height="12" fill={GLOW} />
      </g>

      {/* L: iron edge block */}
      <g>
        <rect x="1097" y="80" width="103" height="70" fill={IRON} />
        <rect x="1097" y="72" width="24" height="8" fill={IRON} />
        <rect x="1138" y="72" width="24" height="8" fill={IRON} />
        <rect x="1110" y="92" width="10" height="12" fill={GLOW} />
        <rect x="1132" y="92" width="10" height="12" fill={GLOW} />
        <rect x="1154" y="92" width="10" height="12" fill={GLOW} />
        <rect x="1124" y="118" width="15" height="32" fill={COPPER} />
      </g>
    </svg>
  );
}
