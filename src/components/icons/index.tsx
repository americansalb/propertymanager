import { ICON_ACCENTS, iconByName, type IconDef } from "./paths";

export type IconProps = {
  className?: string;
  /** Two-tone: accent paths render in copper/patina instead of currentColor. */
  duo?: boolean;
  /** Accessible name; omitted = decorative (aria-hidden). */
  title?: string;
};

function createIcon(def: IconDef) {
  function Icon({ className, duo = false, title }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        role={title ? "img" : undefined}
        aria-hidden={title ? undefined : true}
        focusable="false"
      >
        {title && <title>{title}</title>}
        {def.paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fillRule="evenodd"
            transform={p.transform}
            fill={duo && p.accent ? ICON_ACCENTS[p.accent] : undefined}
          />
        ))}
      </svg>
    );
  }
  Icon.displayName = `Icon(${def.name})`;
  return Icon;
}

export const IconKeep = createIcon(iconByName("keep"));
export const IconProperty = createIcon(iconByName("property"));
export const IconHome = createIcon(iconByName("home"));
export const IconDoor = createIcon(iconByName("door"));
export const IconTenants = createIcon(iconByName("tenants"));
export const IconLease = createIcon(iconByName("lease"));
export const IconRent = createIcon(iconByName("rent"));
export const IconWrench = createIcon(iconByName("wrench"));
export const IconMarket = createIcon(iconByName("market"));
export const IconHardHat = createIcon(iconByName("hardhat"));
export const IconEscrow = createIcon(iconByName("escrow"));
export const IconVerified = createIcon(iconByName("verified"));
export const IconGear = createIcon(iconByName("gear"));
export const IconBell = createIcon(iconByName("bell"));
export const IconPlus = createIcon(iconByName("plus"));
export const IconSearch = createIcon(iconByName("search"));
export const IconLogout = createIcon(iconByName("logout"));
export const IconMail = createIcon(iconByName("mail"));
export const IconCalendar = createIcon(iconByName("calendar"));
export const IconChevronLeft = createIcon(iconByName("chevron-left"));
export const IconChevronRight = createIcon(iconByName("chevron-right"));
export const IconTools = createIcon(iconByName("tools"));
export const IconAlert = createIcon(iconByName("alert"));
export const IconCheck = createIcon(iconByName("check"));
export const IconPencil = createIcon(iconByName("pencil"));
export const IconClose = createIcon(iconByName("close"));
