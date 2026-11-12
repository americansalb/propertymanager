import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { IconChevronRight, IconKeep, IconMail, IconProperty, IconWrench } from "@/components/icons";
import { PhoneTabs, SHADOW } from "./frames";

/**
 * The product, shown on the landing page. These are small copies of the
 * real screens, built from the same colors and the same words, so the page
 * shows what people actually get. Each frame is one picture to a screen
 * reader (role="img" with a sentence that says what it shows).
 */

function Dot({ needsYou = false }: { needsYou?: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${needsYou ? "bg-copper" : "bg-patina"}`}
    />
  );
}

function Chevron() {
  return <IconChevronRight className="h-3.5 w-3.5 shrink-0 text-stone-400" />;
}

const card = "rounded-xl border border-stone-200 bg-white";

/** The top bar of a signed-in screen. */
function AppBar({ who, tabs }: { who: string; tabs?: boolean }) {
  const places = [
    { label: "Home", icon: <IconKeep className="h-3.5 w-3.5" />, on: true },
    { label: "Properties", icon: <IconProperty className="h-3.5 w-3.5" /> },
    { label: "Repairs", icon: <IconWrench className="h-3.5 w-3.5" /> },
    { label: "Messages", icon: <IconMail className="h-3.5 w-3.5" /> },
  ];
  return (
    <div className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-11 max-w-xl items-center justify-between px-5">
        <span className="flex items-center gap-2">
          <LogoMark small className="h-6 w-6" />
          <Wordmark className="text-sm" />
        </span>
        <span className="text-xs text-stone-500">{who}</span>
      </div>
      {tabs && (
        <div className="mx-auto flex max-w-xl gap-1 px-3">
          {places.map((p) => (
            <span
              key={p.label}
              className={`inline-flex items-center gap-1.5 border-b-2 px-2.5 py-2 text-xs ${
                p.on
                  ? "border-copper font-semibold text-stone-900"
                  : "border-transparent font-medium text-stone-500"
              }`}
            >
              {p.icon}
              {p.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function NeedsRow({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <Dot needsYou />
          <span className="text-[13px] font-semibold text-stone-900">{title}</span>
        </span>
        <span className="mt-0.5 block pl-4 text-xs text-stone-600">{sub}</span>
      </span>
      <Chevron />
    </div>
  );
}

function StatBit({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <p className="text-[11px] text-stone-500">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums tracking-tight text-stone-900">
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-stone-500">{unit}</span>}
      </p>
    </div>
  );
}

function PlaceRow({
  name,
  where,
  standing,
  needsYou = false,
}: {
  name: string;
  where: string;
  standing: string;
  needsYou?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-stone-900">{name}</span>
        <span className="block truncate text-xs text-stone-600">{where}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs">
        <Dot needsYou={needsYou} />
        <span className={needsYou ? "font-medium text-copper-deep" : "text-stone-600"}>
          {standing}
        </span>
      </span>
      <Chevron />
    </div>
  );
}

/** The owner's home screen on a day when two things need them. */
export function OwnerHome({ compact = false }: { compact?: boolean }) {
  return (
    <div className="bg-[#f6f4ef]">
      <AppBar who="Dana" tabs={!compact} />
      <div className={`mx-auto max-w-xl ${compact ? "px-3.5 pb-5 pt-4" : "px-5 pb-8 pt-6"}`}>
        <p className="text-[11px] text-stone-500">Hello, Dana</p>
        <p
          className={`mt-0.5 font-semibold tracking-tight text-stone-900 ${compact ? "text-xl" : "text-2xl"}`}
        >
          2 things need you
        </p>

        <div className={`${card} mt-3 divide-y divide-stone-100 px-4 py-1`}>
          <NeedsRow title="Jordan Lee is 3 days late" sub="$1,400.00 owed, Unit B at Linden Court" />
          <NeedsRow
            title="Unit 2F at Oakdale Duplex is vacant"
            sub="Asking $1,925.00 a month"
          />
        </div>

        <div className={`${card} mt-3 grid gap-3 p-4 ${compact ? "grid-cols-2" : "grid-cols-3"}`}>
          <StatBit label="Rent each month" value="$9,650.00" />
          <StatBit label="Lived in" value="8 of 9" unit="units" />
          {!compact && <StatBit label="Open repairs" value="2" />}
        </div>

        <div className={`${card} mt-3 px-4 pb-1 pt-3`}>
          <p className="text-sm font-semibold tracking-tight text-stone-900">Your properties</p>
          <div className="mt-1 divide-y divide-stone-100">
            <PlaceRow name="Linden Court" where="Evanston, IL · 6 units" standing="All lived in" />
            {!compact && (
              <PlaceRow name="418 Maple St" where="Oak Park, IL" standing="Lived in" />
            )}
            <PlaceRow
              name="Oakdale Duplex"
              where="Chicago, IL · 2 units"
              standing="1 vacant"
              needsYou
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/** The top bar of the tenant's phone. */
export function TenantBar() {
  return (
    <div className="flex h-10 items-center justify-between border-b border-stone-200 bg-white px-3.5">
      <span className="flex items-center gap-1.5">
        <LogoMark small className="h-5 w-5" />
        <Wordmark className="text-xs" />
      </span>
      <span className="rounded-full bg-patina-tint px-2 py-0.5 text-[10px] font-medium text-patina">
        Tenant
      </span>
    </div>
  );
}

/** The tenant's home screen: what they owe, and the two things they can do. */
export function TenantHome() {
  return (
    <div className="bg-[#f6f4ef]">
      <TenantBar />
      <div className="px-3.5 pb-4 pt-3.5">
        <p className="text-[11px] text-stone-500">Your home</p>
        <p className="mt-0.5 text-lg font-semibold leading-6 tracking-tight text-stone-900">
          Unit 1F, 1247 W Oakdale Ave
        </p>

        <div className={`${card} mt-3 flex items-center gap-3 p-3.5`}>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] text-stone-500">You owe nothing right now</span>
            <span className="block text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
              $0.00
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-600">
              <Dot /> All paid up
            </span>
          </span>
          <Chevron />
        </div>

        <div className={`${card} mt-2.5 divide-y divide-stone-100 px-3.5`}>
          <div className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-stone-900">
                Report a problem
              </span>
              <span className="block text-xs text-stone-600">Say what is wrong.</span>
            </span>
            <Chevron />
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold text-stone-900">
                Message your landlord
              </span>
              <span className="block text-xs text-stone-600">Questions go straight to them.</span>
            </span>
            <Chevron />
          </div>
        </div>
      </div>
      <PhoneTabs on="Home" tenant />
    </div>
  );
}

/** Two states of the same screen: a day with work, and a day with none. */
export function NeedsYouShot() {
  return (
    <div
      role="img"
      aria-label="Two versions of the home screen. One lists two things that need the owner. The other says nothing needs you today."
      className="relative"
    >
      <div className={`${card} ${SHADOW} p-5`}>
        <p className="text-xs text-stone-500">A busy day</p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900">
          2 things need you
        </p>
        <div className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 px-4 py-1">
          <NeedsRow title="Jordan Lee is 3 days late" sub="$1,400.00 owed, Unit B at Linden Court" />
          <NeedsRow
            title="Unit 2F at Oakdale Duplex is vacant"
            sub="Asking $1,925.00 a month"
          />
        </div>
      </div>
      <div className={`${card} ${SHADOW} relative -mt-3 ml-8 p-5 sm:ml-14`}>
        <p className="text-xs text-stone-500">A good day</p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-stone-900">
          Nothing needs you today
        </p>
        <p className="mt-1 flex items-center gap-2 text-sm text-stone-600">
          <Dot /> No late rent and no vacant units.
        </p>
      </div>
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 py-2">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="text-[13px] font-medium text-stone-900">{value}</span>
    </div>
  );
}

/** One rental's page: who lives there, what they pay, and the lease. */
export function RentalShot() {
  return (
    <div
      role="img"
      aria-label="A rental's page. Tom Tenant lives here, pays $1,850.00 a month due on the 1st, and the lease ends December 31. Below are the lease details."
      className={`${card} ${SHADOW} overflow-hidden`}
    >
      <div className="border-b border-stone-100 p-5">
        <p className="text-xs text-stone-500">Unit 1F · Oakdale Duplex</p>
        <p className="mt-2 text-[11px] text-stone-500">Lives here</p>
        <p className="text-xl font-semibold tracking-tight text-stone-900">Tom Tenant</p>
        <div className="mt-3 grid grid-cols-3 gap-3 border-t border-stone-100 pt-3">
          <StatBit label="Rent" value="$1,850.00" unit="a month" />
          <StatBit label="Due" value="The 1st" />
          <div>
            <StatBit label="Lease ends" value="Dec 31" />
            <p className="text-[11px] font-medium text-copper-deep">In 49 days</p>
          </div>
        </div>
      </div>
      <div className="px-5 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight text-stone-900">Lease</p>
          <span className="rounded-full bg-patina-tint px-2 py-0.5 text-[11px] font-medium text-patina">
            Active
          </span>
        </div>
        <div className="mt-1 divide-y divide-stone-100">
          <FactRow label="Deposit" value="$1,850.00" />
          <FactRow label="Late fee" value="$75.00, after 5 days" />
          <FactRow label="Utilities included" value="Water, Trash" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-stone-100 pt-3">
          {["Pet deposit", "Parking"].map((c) => (
            <span
              key={c}
              className="inline-flex items-center rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700"
            >
              <span className="mr-1 font-semibold text-copper-deep">+</span>
              {c}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
