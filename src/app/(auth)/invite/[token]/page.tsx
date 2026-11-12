import Link from "next/link";
import { getSession } from "@/lib/authz";
import { previewInvitation } from "@/lib/services/invite";
import { brand } from "@/lib/brand";
import { formatCents } from "@/lib/money";
import { formatLeaseDate } from "@/lib/leases";
import { unitTitle } from "@/lib/units";
import { Button } from "@/components/ui";
import { AcceptInviteForm, SignOutToSwitch } from "@/components/auth/accept-invite-form";

export const metadata = { title: "Your invite" };

function Plain({ headline, sub, cta }: { headline: string; sub: string; cta?: React.ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{headline}</h1>
      <p className="mt-2 text-stone-600">{sub}</p>
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
        headline="This link does not work"
        sub="It may have been replaced by a newer one. Ask your landlord to send you a new link."
      />
    );
  }
  if (preview.state === "accepted") {
    return (
      <Plain
        headline="This invite was already used"
        sub="Sign in to see your home."
        cta={<Button href="/login" className="min-h-12 w-full">Sign in</Button>}
      />
    );
  }
  if (preview.state === "expired") {
    return (
      <Plain
        headline="This link has run out"
        sub={`Invite links work for 7 days. Ask ${preview.orgName} to send you a new one.`}
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
      <div className="text-center">
        <p className="text-sm text-stone-500">{preview.orgName} invited you to</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900">{home}</h1>
        <p className="mt-1 text-stone-600">
          {p.city}, {p.state} {p.zipCode}
        </p>
        {preview.preview && (
          <p className="mt-3 text-stone-700">
            {[
              preview.preview.monthlyRentCents != null
                ? `${formatCents(preview.preview.monthlyRentCents)} a month`
                : null,
              preview.preview.startDate != null
                ? `starts ${formatLeaseDate(preview.preview.startDate)}`
                : null,
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        )}
      </div>

      <div className="mt-6">
        {session && sessionMatches ? (
          <AcceptInviteForm token={token} mode="session" />
        ) : session ? (
          <div className="space-y-3 text-center">
            <p className="text-stone-700">
              You are signed in as <span className="font-semibold">{session.email}</span>, but this
              invite is for <span className="font-semibold">{preview.email}</span>.
            </p>
            <SignOutToSwitch />
          </div>
        ) : preview.accountExists ? (
          <div className="space-y-3 text-center">
            <p className="text-stone-700">
              <span className="font-semibold">{preview.email}</span> already has a {brand.name}{" "}
              account.
            </p>
            <Button href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} className="min-h-12 w-full">
              Sign in to accept
            </Button>
          </div>
        ) : (
          <>
            <AcceptInviteForm token={token} mode="new" />
            <p className="mt-4 text-center text-sm text-stone-500">
              This creates your {brand.name} account for {preview.email}.
            </p>
          </>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-stone-500">
        Not you? You can{" "}
        <Link href="/" className="font-medium text-patina underline">
          ignore this invite
        </Link>
        .
      </p>
    </div>
  );
}
