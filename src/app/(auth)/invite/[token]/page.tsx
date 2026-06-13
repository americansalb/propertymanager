import Link from "next/link";
import { getSession } from "@/lib/authz";
import { previewInvitation } from "@/lib/services/invite";
import { brand } from "@/lib/brand";
import { formatCents } from "@/lib/money";
import { formatLeaseDate } from "@/lib/leases";
import { unitTitle } from "@/lib/units";
import { PropertyPortrait } from "@/components/brand/property-portrait";
import { Button } from "@/components/ui";
import { AcceptInviteForm, SignOutToSwitch } from "@/components/auth/accept-invite-form";

export const metadata = { title: "Your invite" };

function Plain({ headline, sub, cta }: { headline: string; sub: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold text-stone-900">{headline}</h1>
      <p className="mt-2 text-sm text-stone-500">{sub}</p>
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [preview, session] = await Promise.all([previewInvitation(token), getSession()]);

  if (preview.state === "invalid") {
    return (
      <Plain
        headline="This invite link isn't valid"
        sub="It may have been replaced with a newer one. Ask your landlord to send a fresh link."
      />
    );
  }
  if (preview.state === "accepted") {
    return (
      <Plain
        headline="This invite was already used"
        sub="Your home is waiting behind your login."
        cta={<Button href="/login" className="w-full py-2.5">Sign in</Button>}
      />
    );
  }
  if (preview.state === "expired") {
    return (
      <Plain
        headline="This invite has expired"
        sub={`Invite links last 7 days. Ask ${preview.orgName} to send a fresh one.`}
      />
    );
  }

  const p = preview.property;
  const home =
    preview.unitNumber.toLowerCase() === "main"
      ? p.address1
      : `${unitTitle(preview.unitNumber)}, ${p.address1}`;
  const sessionMatches = session?.email === preview.email;

  return (
    <div>
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
        className="mx-auto h-28 w-auto"
      />
      <div className="mt-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-copper-deep">
          {preview.orgName} invited you to
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-stone-900">
          {home}
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          {p.city}, {p.state} {p.zipCode}
        </p>
        {preview.preview && (
          <p className="mt-3 text-sm text-stone-600">
            {formatCents(preview.preview.monthlyRentCents)}/mo · starts{" "}
            {formatLeaseDate(preview.preview.startDate)}
          </p>
        )}
      </div>

      <div className="mt-6">
        {session && sessionMatches ? (
          <AcceptInviteForm token={token} mode="session" />
        ) : session ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-stone-600">
              You&apos;re signed in as <span className="font-medium">{session.email}</span>, but
              this invite is for <span className="font-medium">{preview.email}</span>.
            </p>
            <SignOutToSwitch />
          </div>
        ) : preview.accountExists ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-stone-600">
              <span className="font-medium">{preview.email}</span> already has a {brand.name}{" "}
              account.
            </p>
            <Button href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="w-full py-2.5">
              Sign in to accept
            </Button>
          </div>
        ) : (
          <>
            <AcceptInviteForm token={token} mode="new" />
            <p className="mt-4 text-center text-xs text-stone-400">
              This creates your {brand.name} account for {preview.email}.
            </p>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-stone-500">
        Not you?{" "}
        <Link href="/" className="font-medium text-copper-deep hover:underline">
          Ignore this invite
        </Link>
      </p>
    </div>
  );
}
