import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/authz";
import { brand } from "@/lib/brand";
import { formatCents } from "@/lib/money";
import { priceLine } from "@/lib/pro-catalog";
import { TRADE_LABEL, type Trade } from "@/lib/quotes";
import { getPublicPro } from "@/lib/services/pro";
import { PublicHeader } from "@/components/public-header";
import { AddProButton } from "@/components/pro/add-pro-button";
import { buttonCls } from "@/components/ui";
import { ToastProvider } from "@/components/ui-feedback";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const pro = await getPublicPro((await params).slug);
  if (!pro) return { title: "Page not found" };
  const what = pro.trades.map((t) => TRADE_LABEL[t as Trade] ?? t).join(", ");
  return { title: pro.businessName, description: `${what}. Prices and where they work, on ${brand.name}.` };
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-1 h-4 w-4 shrink-0 text-patina" aria-hidden="true">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A repair pro's public page. Every fact says exactly what it is: what the
 * pro wrote, or what the system itself knows. Nothing says "verified".
 */
export default async function PublicProPage({ params }: Props) {
  const { slug } = await params;
  const [pro, session] = await Promise.all([getPublicPro(slug), getSession()]);
  if (!pro) notFound();

  const isOwner = Boolean(session?.roles.includes("LANDLORD") && session.activeOrgId);
  const what = pro.trades.map((t) => TRADE_LABEL[t as Trade] ?? t).join(" · ");
  const zipLine =
    pro.zips.length <= 6
      ? pro.zips.join(", ")
      : `${pro.zips.slice(0, 6).join(", ")} and ${pro.zips.length - 6} more`;

  const facts: string[] = ["Email confirmed"];
  if (pro.listedBy > 0) {
    facts.push(
      pro.listedBy === 1
        ? "On 1 owner's repair list"
        : `On ${pro.listedBy} owners' repair lists`,
    );
  }
  if (pro.jobsApproved > 0) {
    facts.push(
      pro.jobsApproved === 1
        ? `1 job approved through ${brand.name}`
        : `${pro.jobsApproved} jobs approved through ${brand.name}`,
    );
  }
  facts.push(`On ${brand.name} since ${MONTH.format(pro.memberSince)}`);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-10">
        <p className="text-sm font-medium text-patina">{what}</p>
        <h1 className="font-brand mt-1 text-4xl font-semibold leading-[1.05] tracking-tight text-stone-900 [text-wrap:balance] sm:text-5xl">
          {pro.businessName}
        </h1>
        {pro.zips.length > 0 && <p className="mt-2 text-stone-600">Works in {zipLine}</p>}
        {pro.bio && <p className="mt-5 max-w-2xl whitespace-pre-wrap text-lg leading-8 text-stone-800">{pro.bio}</p>}

        <section className="mt-8 rounded-2xl border border-stone-200 p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">Prices</h2>
          <p className="mt-0.5 text-sm text-stone-500">
            Starting prices set by {pro.businessName}. The final price depends on the job.
          </p>
          <ul className="mt-3 divide-y divide-stone-100">
            {pro.hourlyRateCents != null && (
              <li className="flex min-h-12 items-center justify-between gap-4 py-2.5">
                <span className="text-stone-800">Hourly rate</span>
                <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                  {formatCents(pro.hourlyRateCents)} an hour
                </span>
              </li>
            )}
            {pro.tripChargeCents != null && (
              <li className="flex min-h-12 items-center justify-between gap-4 py-2.5">
                <span className="text-stone-800">Trip charge</span>
                <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                  {pro.tripChargeCents === 0 ? "None" : formatCents(pro.tripChargeCents)}
                </span>
              </li>
            )}
            {pro.prices.map((p) => (
              <li key={p.taskKey} className="flex min-h-12 items-center justify-between gap-4 py-2.5">
                <span className="text-stone-800">{p.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-stone-900">
                  {priceLine(p.fromCents, p.unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-2xl bg-patina-tint p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900">What we know</h2>
          <ul className="mt-3 space-y-2">
            {facts.map((f) => (
              <li key={f} className="flex gap-2.5 text-stone-800">
                <Check />
                {f}
              </li>
            ))}
            {pro.licenseNumber && (
              <li className="flex gap-2.5 text-stone-800">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-stone-400" />
                <span>
                  License {pro.licenseNumber}
                  {pro.licenseState ? ` (${pro.licenseState})` : ""}, as given by {pro.businessName}.
                  Check it with the state before hiring.
                </span>
              </li>
            )}
          </ul>
        </section>

        <section className="mt-5 rounded-2xl border border-stone-200 p-5 sm:p-6">
          <ToastProvider>
            {isOwner ? (
              <AddProButton slug={pro.slug} name={pro.businessName} />
            ) : (
              <div>
                <p className="font-semibold text-stone-900">Own rentals?</p>
                <p className="mt-1 text-stone-600">
                  Add {pro.businessName} to your repair people for free. When a tenant reports a
                  problem they fix, they are asked for a price right away.
                </p>
                <Link href="/signup" className={`${buttonCls("accent")} mt-4`}>
                  Start free
                </Link>
              </div>
            )}
          </ToastProvider>
        </section>
      </main>
    </div>
  );
}
