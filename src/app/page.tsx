import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";

const FEATURES = [
  {
    title: "Know what needs you",
    body: "Open it and the first thing you see is what needs you today. If nothing does, it says so.",
  },
  {
    title: "Every rental on one page",
    body: "The lease, the tenant, the rent and when it is due. Nothing to dig for, nothing to remember.",
  },
  {
    title: "Repairs without phone tag",
    body: "Tenants report a problem in a minute. You answer in one tap, and everyone can see where it stands.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark small className="h-9 w-9 shrink-0" />
            <Wordmark className="text-lg sm:text-xl" />
          </Link>
          <nav className="flex shrink-0 items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 text-[15px] font-medium text-stone-700 transition hover:text-stone-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl bg-keep-deep px-4 text-[15px] font-semibold text-white transition hover:bg-patina active:translate-y-px"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-14 text-center sm:pt-28">
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-7xl">
            Your rentals,
            <br />
            well kept.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-stone-600">
            Leases, rent and repairs for your rentals, in one calm place. Simple enough to use
            without a manual.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-keep-deep px-7 text-base font-semibold text-white transition hover:bg-patina active:translate-y-px sm:w-auto"
            >
              Start free
            </Link>
          </div>
          <p className="mt-5 text-sm text-stone-500">
            Renting your home? Your landlord sends you a link. Doing repairs for a living?{" "}
            <Link href="/signup" className="font-medium text-patina underline">
              Get on the list
            </Link>
            .
          </p>
        </section>

        <section className="mx-auto grid max-w-5xl gap-4 px-6 pb-24 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-stone-200 bg-white p-6">
              <h2 className="text-lg font-semibold tracking-tight text-stone-900">{f.title}</h2>
              <p className="mt-2 leading-6 text-stone-600">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <div className="mt-auto">
        <footer className="bg-keep-night">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-7 text-sm text-stone-300">
            <span>
              © {new Date().getFullYear()} {brand.name} · {brand.tagline}
            </span>
            <span className="font-medium tracking-wide text-stone-300">{brand.domain}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
