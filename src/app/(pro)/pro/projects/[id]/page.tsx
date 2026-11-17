import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/authz/api";
import { getProjectForPro } from "@/lib/services/project";
import { formatQuotePrice, TRADE_LABEL, type Trade } from "@/lib/quotes";
import { BackLink, Badge, InfoRow, Section, buttonCls } from "@/components/ui";
import { BidForm } from "@/components/projects/bid-form";

export const metadata = { title: "Project", robots: { index: false } };

export default async function ProProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole("PRO", "/pro/projects");
  const { id } = await params;
  const profile = await prisma.proProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) notFound();
  let p: Awaited<ReturnType<typeof getProjectForPro>>;
  try {
    p = await getProjectForPro({ userId: session.userId, proProfileId: profile.id }, id);
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
  const my = p.myBid;

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/pro/projects">Projects</BackLink>
      <div className="mt-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h1 className="min-w-0 text-3xl font-semibold tracking-tight text-stone-900">{p.title}</h1>
        <span className="mt-2 shrink-0">
          {p.won ? <Badge tone="patina">You got it</Badge> : p.status === "OPEN_FOR_BIDS" ? <Badge tone="copper">{p.closes}</Badge> : <Badge tone="stone">Closed</Badge>}
        </span>
      </div>
      <p className="mt-1 text-stone-600">
        {TRADE_LABEL[p.trade as Trade] ?? p.trade} · {p.area} · {p.bids === 0 ? "No bids yet" : p.bids === 1 ? "1 bid so far" : `${p.bids} bids so far`}
      </p>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <p className="whitespace-pre-wrap text-lg leading-7 text-stone-900">{p.description}</p>
        {!p.won && <p className="mt-3 text-sm text-stone-500">The street address goes to the pro the owner picks.</p>}
      </section>

      {p.won && (
        <Section title="The job is yours">
          <dl>
            <InfoRow label="Where">{p.won.where}</InfoRow>
            <InfoRow label="Your price">{formatQuotePrice(my!.amountCents, my!.amountHighCents)}</InfoRow>
            {my?.availability && <InfoRow label="You said">{my.availability}</InfoRow>}
            <InfoRow label="Going in">{p.won.entry}</InfoRow>
            {p.won.accessNotes && <InfoRow label="Getting in">{p.won.accessNotes}</InfoRow>}
            {p.won.ownerName && <InfoRow label="Owner">{p.won.ownerName}</InfoRow>}
          </dl>
          {p.won.ownerEmail && (
            <a href={`mailto:${p.won.ownerEmail}`} className={`${buttonCls("primary")} mt-4`}>
              Email {p.won.ownerName?.split(" ")[0] ?? "the owner"} to set the time
            </a>
          )}
        </Section>
      )}

      {!p.won && (
        <Section title={my && my.status === "PENDING" ? "Your bid" : "Bid on it"}>
          {my && my.status === "PENDING" && (
            <p className="mb-4 rounded-xl bg-patina-tint/60 p-3 text-stone-800">
              The owner has your bid: {formatQuotePrice(my.amountCents, my.amountHighCents)}. You can change it until they pick.
            </p>
          )}
          {my && (my.status === "DECLINED" || my.status === "EXPIRED") ? (
            <p className="text-stone-600">
              {my.status === "DECLINED" ? "The owner went with someone else this time. Thank you for bidding." : "The owner took this project down."}
            </p>
          ) : p.canChangeBid || !p.blocker ? (
            <BidForm
              projectId={p.id}
              initial={
                my && my.status === "PENDING"
                  ? {
                      price: (my.amountCents / 100).toString(),
                      high: my.amountHighCents ? (my.amountHighCents / 100).toString() : "",
                      availability: my.availability ?? "",
                      note: my.message ?? "",
                    }
                  : null
              }
            />
          ) : (
            <div>
              <p className="text-stone-700">{p.blocker}</p>
              {p.blocker.startsWith("Make your page public") && (
                <Link href="/pro/dashboard" className={`${buttonCls("secondary")} mt-4`}>Finish your page</Link>
              )}
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
