import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { VillageSkyline } from "@/components/brand/village-skyline";
import { SpotEscrow, SpotRent, SpotTools } from "@/components/icons/spots";

const FEATURES = [
  {
    icon: <SpotRent className="h-14 w-14" />,
    title: "Rent that arrives itself",
    body: "Tenants pay online, rent lands on the 1st, and the ledger writes itself. Late fees follow your rules, not your patience.",
  },
  {
    icon: <SpotTools className="h-14 w-14" />,
    title: "Maintenance off your plate",
    body: "Tenants report with photos. Vetted local pros bid with up-front prices. You approve from your phone.",
  },
  {
    icon: <SpotEscrow className="h-14 w-14" />,
    title: "Money that can't get lost",
    body: "Payment for every job sits in escrow until you approve the finished work. No deposits vanishing, no chasing refunds.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-iron">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#faf8f4]">
              <LogoMark className="h-7 w-7" />
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-white">
              {brand.name}
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-stone-300 transition hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="cut-sm facet-soft inline-flex items-center bg-copper px-4 py-2 text-sm font-semibold text-iron-deep transition hover:bg-[#dd9a55] active:translate-y-px"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <div className="crenel" />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center sm:pt-28">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-copper-deep">
            Property management &amp; trusted local pros
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-7xl">
            Your rentals,
            <br />
            well kept.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-stone-600">
            Collect rent, handle maintenance, and hire verified local pros, with every
            payment held safely until the work passes your inspection.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="cut facet inline-flex items-center bg-iron px-7 py-3 text-base font-semibold text-white transition hover:bg-iron-deep active:translate-y-px"
            >
              Start free
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border border-stone-300 px-7 py-3 text-base font-semibold text-stone-700 transition hover:border-patina hover:text-stone-900"
            >
              I&apos;m a service pro
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-stone-200 bg-white p-6">
              {f.icon}
              <h2 className="mt-5 font-display text-lg font-semibold text-stone-900">{f.title}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <div className="mt-auto">
        <VillageSkyline className="block w-full" />
        <footer className="bg-iron">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-7 text-xs text-stone-400">
            <span>
              © {new Date().getFullYear()} {brand.name} · {brand.tagline}
            </span>
            <span className="font-medium tracking-wide text-stone-500">{brand.domain}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
