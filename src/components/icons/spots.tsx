/**
 * Spot illustrations: display-scale (48-grid) mini-scenes for feature cards
 * and empty states. Same forge rules as icons and the skyline (zero curves,
 * flat fills) but full palette and richer detail; meant for 40px and up,
 * never for nav.
 */

const IRON = "#34383F";
const COPPER = "#D08A45";
const COPPER_DEEP = "#9E5B23";
const PATINA = "#3E7C66";
const PATINA_DEEP = "#2F6350";
const GLOW = "#F6E7D7";

type SpotProps = { className?: string };

/** A copper coin with the home struck into it, arriving on its own. */
export function SpotRent({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      {/* trailing arrival diamonds */}
      <path d="M6 21 L9 24 L6 27 L3 24 Z" fill={PATINA} />
      <path d="M10.5 32.5 L12.5 34.5 L10.5 36.5 L8.5 34.5 Z" fill={COPPER_DEEP} />
      {/* coin: deep rim + copper face */}
      <path d="M22.4 8 H35.6 L45 17.4 V30.6 L35.6 40 H22.4 L13 30.6 V17.4 Z" fill={COPPER_DEEP} />
      <path
        d="M23.7 11.2 H34.3 L41.8 18.7 V29.3 L34.3 36.8 H23.7 L16.2 29.3 V18.7 Z"
        fill={COPPER}
      />
      {/* the home, embossed in iron with a lit door */}
      <path d="M29 15.5 L38.5 24 L36.7 25.9 L36 25.3 V33 H22 V25.3 L21.3 25.9 L19.5 24 Z" fill={IRON} />
      <rect x="26.6" y="26.5" width="4.8" height="6.5" fill={GLOW} />
    </svg>
  );
}

/** A wrench gripping a patina nut, sparks off the work. */
export function SpotTools({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(45 24 24)">
        {/* the nut, held in the jaw */}
        <path
          d="M2.7 24 L4.45 20.9 H7.95 L9.7 24 L7.95 27.1 H4.45 Z"
          fill={PATINA}
        />
        {/* wrench: open jaw + handle with diamond tip */}
        <path
          d="M7.6 15.6 H14.4 L19.4 20.6 V27.4 L14.4 32.4 H7.6 L2.6 27.4 V26.3 H10.6 V21.7 H2.6 V20.6 Z"
          fill={IRON}
        />
        <path d="M19.4 21.7 H41 L43.4 24 L41 26.3 H19.4 Z" fill={IRON} />
      </g>
      {/* sparks off the work */}
      <path d="M37.5 5.5 L40.7 8.7 L37.5 11.9 L34.3 8.7 Z" fill={COPPER} />
      <path d="M43 14 L45 16 L43 18 L41 16 Z" fill={COPPER_DEEP} />
    </svg>
  );
}

/** The home held inside the shield, with the coin kept beside it. */
export function SpotEscrow({ className }: SpotProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" focusable="false">
      {/* shield: deep rim + patina face */}
      <path d="M24 3 L42 9.5 V24.5 L24 45 L6 24.5 V9.5 Z" fill={PATINA_DEEP} />
      <path d="M24 6.6 L38.8 12 V23.4 L24 40.2 L9.2 23.4 V12 Z" fill={PATINA} />
      {/* the home, lit */}
      <path d="M24 12.5 L33.5 21 L31.7 22.9 L31 22.3 V30 H17 V22.3 L16.3 22.9 L14.5 21 Z" fill={GLOW} />
      <rect x="21.6" y="23.6" width="4.8" height="6.4" fill={COPPER} />
      {/* the coin, kept */}
      <path d="M29.4 28.4 H35.6 L40 32.8 V39 L35.6 43.4 H29.4 L25 39 V32.8 Z" fill={COPPER_DEEP} />
      <path d="M30.4 30.6 H34.6 L37.8 33.8 V38 L34.6 41.2 H30.4 L27.2 38 V33.8 Z" fill={COPPER} />
      <path d="M32.5 33.2 L35.3 35.9 L32.5 38.6 L29.7 35.9 Z" fill={GLOW} />
    </svg>
  );
}
