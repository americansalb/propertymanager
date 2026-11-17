import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { prisma } from "@/lib/db";
import { listProjectsForPro, type ProProjectRow } from "@/lib/services/project";
import { formatQuotePrice, TRADE_LABEL, type Trade } from "@/lib/quotes";
import { buttonCls } from "@/components/ui";
import { IconChevronRight } from "@/components/icons";

export const metadata = { title: "Projects" };

const MINE: Record<string, { text: string; needsYou: boolean }> = {
  PENDING: { text: "Your bid is in", needsYou: false },
  ACCEPTED: { text: "You got it", needsYou: true },
  DECLINED: { text: "Went to someone else", needsYou: false },
  WITHDRAWN: { text: "You took your bid back", needsYou: false },
  EXPIRED: { text: "Taken down", needsYou: false },
};

function Row({ r }: { r: ProProjectRow }) {
  const mine = r.myBid ? MINE[r.myBid.status] : null;
  return (
    <Link href={`/pro/projects/${r.id}`} className="group -mx-3 flex min-h-16 items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-stone-50">
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-stone-900">{r.title}</span>
        <span className="mt-0.5 block break-words text-sm text-stone-600">
          {TRADE_LABEL[r.trade as Trade] ?? r.trade} · {r.area}
          {!r.myBid ? ` · ${r.closes}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right text-sm">
        {mine ? (
          <>
            <span className={`block ${mine.needsYou ? "font-semibold text-copper-deep" : "text-stone-600"}`}>{mine.text}</span>
            <span className="block tabular-nums text-stone-500">{formatQuotePrice(r.myBid!.amountCents, r.myBid!.amountHighCents)}</span>
          </>
        ) : (
          <span className="text-stone-600">{r.bids === 0 ? "No bids yet" : r.bids === 1 ? "1 bid" : `${r.bids} bids`}</span>
        )}
      </span>
      <IconChevronRight className="h-4 w-4 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-patina" />
    </Link>
  );
}

export default async function ProProjectsPage() {
  const session = await requireRole("PRO", "/pro/projects");
  const profile = await prisma.proProfile.findUnique({ where: { userId: session.userId }, select: { id: true } });
  if (!profile) return null;
  const { near, mine, published, zips, trades } = await listProjectsForPro({ userId: session.userId, proProfileId: profile.id });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
        {near.length === 0 ? "No new projects near you" : near.length === 1 ? "1 project near you" : `${near.length} projects near you`}
      </h1>
      <p className="mt-1 text-stone-600">
        {trades.length > 0 && zips.length > 0
          ? `Owners in ${zips.slice(0, 4).join(", ")}${zips.length > 4 ? ` and ${zips.length - 4} more` : ""} who need work you do. We email you when a new one is posted.`
          : "Pick what you do and the ZIP codes you work in, and projects show up here."}
      </p>

      {!published && (
        <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-copper/40 bg-copper-tint p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <p className="min-w-0 text-stone-800">
            Make your page public to bid. Owners look at your prices before they say yes.
          </p>
          <Link href="/pro/dashboard" className={`${buttonCls("secondary")} shrink-0 bg-white`}>
            Finish your page
          </Link>
        </section>
      )}

      {near.length > 0 && (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-2 sm:px-6">
          <ul className="divide-y divide-stone-100">
            {near.map((r) => (
              <li key={r.id}>
                <Row r={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {mine.length > 0 && (
        <section className="mt-5 rounded-2xl border border-stone-200 bg-white px-5 py-2 sm:px-6">
          <p className="pt-3 text-sm text-stone-500">Your bids</p>
          <ul className="divide-y divide-stone-100">
            {mine.map((r) => (
              <li key={r.id}>
                <Row r={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
