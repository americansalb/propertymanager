import { requireRole } from "@/lib/authz";
import { getTenantHome } from "@/lib/services/tenant";
import { brand } from "@/lib/brand";
import { Card, Money } from "@/components/ui";
import { PropertyPortrait } from "@/components/brand/property-portrait";
import { unitTitle } from "@/lib/units";
import { IconRent, IconWrench } from "@/components/icons";

export const metadata = { title: "Home" };

export default async function TenantDashboard() {
  const session = await requireRole("TENANT", "/tenant/dashboard");
  const home = await getTenantHome(session.userId);

  if (!home) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-stone-900">
          Welcome, {session.firstName}
        </h1>
        <Card className="mt-5 p-5">
          <p className="text-sm font-semibold text-stone-900">Your home isn&apos;t connected yet.</p>
          <p className="mt-1 text-sm text-stone-500">
            Ask your landlord for an invite link; everything about your place appears here the
            moment you accept it.
          </p>
        </Card>
      </div>
    );
  }

  const p = home.property;
  const homeTitle =
    home.unitNumber.toLowerCase() === "main"
      ? p.address1
      : `${unitTitle(home.unitNumber)}, ${p.address1}`;
  const specs = [
    home.unit.bedrooms != null ? `${home.unit.bedrooms} bd` : null,
    home.unit.bathrooms != null ? `${home.unit.bathrooms} ba` : null,
    home.unit.squareFeet != null ? `${home.unit.squareFeet.toLocaleString()} sqft` : null,
  ].filter(Boolean);
  const ended = home.leaseStatus === "ENDED" || home.leaseStatus === "TERMINATED";
  const included: Array<[string, string]> = home.terms
    ? ([
        ["Deposit held", home.terms.depositLabel],
        ["Pets", home.terms.petLabel],
        ["Parking", home.terms.parkingLabel],
        [
          "Utilities included",
          home.terms.utilities.length > 0 ? home.terms.utilities.join(", ") : null,
        ],
      ].filter(([, v]) => v != null) as Array<[string, string]>)
    : [];

  return (
    <div className="mx-auto max-w-xl">
      <Card className="overflow-hidden">
        <div className="flex items-end gap-5 bg-stone-50 px-6 pt-5">
          <PropertyPortrait
            seedKey={p.id}
            type={p.type}
            units={p.unitStatuses.map((status) => ({ status }))}
            prefs={{
              portraitSeed: p.portraitSeed,
              portraitBody: p.portraitBody,
              portraitRoof: p.portraitRoof,
              portraitAccent: p.portraitAccent,
            }}
            className="h-24 w-auto shrink-0"
          />
          <div className="min-w-0 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-copper-deep">
              Your home
            </p>
            <h1 className="mt-0.5 truncate font-display text-xl font-semibold tracking-tight text-stone-900">
              {homeTitle}
            </h1>
            <p className="text-sm text-stone-500">
              {p.city}, {p.state} {p.zipCode}
            </p>
          </div>
        </div>
        {specs.length > 0 && (
          <div className="border-t border-stone-100 px-6 py-2.5 text-sm text-stone-500">
            {specs.join(" · ")}
          </div>
        )}
      </Card>

      {ended ? (
        <Card className="mt-4 p-5 text-sm text-stone-500">Your lease here has ended.</Card>
      ) : home.terms ? (
        <Card className="mt-4 p-5">
          {home.terms.rentCents != null && (
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Money
                cents={home.terms.rentCents}
                className="font-display text-3xl font-semibold text-stone-900"
              />
              <span className="text-sm text-stone-500">
                /mo{home.terms.rentDueLabel ? ` · ${home.terms.rentDueLabel.toLowerCase()}` : ""}
              </span>
            </div>
          )}
          {home.terms.termLabel && (
            <p
              className={
                home.terms.rentCents != null
                  ? "mt-1 text-sm text-stone-500"
                  : "text-sm text-stone-700"
              }
            >
              {home.terms.termLabel}
            </p>
          )}
          {included.length > 0 && (
            <dl
              className={`space-y-1.5 ${
                home.terms.rentCents != null || home.terms.termLabel
                  ? "mt-4 border-t border-stone-100 pt-4"
                  : ""
              }`}
            >
              {included.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 text-sm">
                  <dt className="text-stone-500">{label}</dt>
                  <dd className="text-right text-stone-800">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      ) : (
        <Card className="mt-4 p-5 text-sm text-stone-500">
          Your landlord hasn&apos;t shared lease details here yet.
        </Card>
      )}

      <Card className="mt-4 flex items-center gap-4 p-4">
        <IconRent className="h-6 w-6 shrink-0 text-copper-deep" duo />
        <div>
          <p className="text-sm font-semibold text-stone-900">
            Rent payments are coming to {brand.name}
          </p>
          <p className="text-sm text-stone-500">
            Until then, keep paying {home.orgName} the way you do today.
          </p>
        </div>
      </Card>
      <Card className="mt-3 flex items-center gap-4 p-4">
        <IconWrench className="h-6 w-6 shrink-0 text-stone-400" />
        <div>
          <p className="text-sm font-semibold text-stone-900">Report a problem</p>
          <p className="text-sm text-stone-500">
            Photos, a time that works, no phone tag. Coming soon.
          </p>
        </div>
      </Card>

      <p className="mt-5 text-center text-xs text-stone-400">
        {homeTitle} is managed by {home.orgName} on {brand.name}.
      </p>
    </div>
  );
}
