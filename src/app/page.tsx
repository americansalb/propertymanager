import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { IconDoor, IconHome, IconTools } from "@/components/icons";
import { Reveal } from "@/components/landing/reveal";
import { RepairDemo } from "@/components/landing/repair-demo";
import { BrowserFrame, PhoneFrame, PhoneTabs } from "@/components/landing/frames";
import {
  NeedsYouShot,
  OwnerHome,
  RentalShot,
  TenantBar,
  TenantHome,
} from "@/components/landing/shots";

/**
 * The landing page shows the product instead of describing it: the real
 * home screen up top, a repair you can answer yourself, then two screens
 * with the reason each one exists. Everything pictured is built.
 */

const startBtn =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-keep-deep px-7 text-base font-semibold text-white transition hover:bg-patina active:translate-y-px";

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-patina" />
      <span>{children}</span>
    </li>
  );
}

const AUDIENCES = [
  {
    icon: <IconHome className="h-5 w-5" />,
    title: "If you own rentals",
    body: "Add an address, then your tenant. The lease, the rent and the repairs are kept for you from there.",
    link: { href: "/signup", label: "Start free" },
  },
  {
    icon: <IconDoor className="h-5 w-5" />,
    title: "If you rent your home",
    body: "Your landlord sends you a link. You see your lease and what you owe, and you report problems from your phone.",
    link: null,
  },
  {
    icon: <IconTools className="h-5 w-5" />,
    title: "If you fix things for a living",
    body: "Plumbers, electricians and handymen can get on the list for local repair jobs.",
    link: { href: "/signup", label: "Get on the list" },
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Without scripts, nothing waits to be revealed. */}
      <noscript>
        <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
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
        {/* ── Hero: the promise, then the product itself ── */}
        <section className="mx-auto max-w-3xl px-6 pt-12 text-center sm:pt-16">
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-7xl">
            Your rentals,
            <br />
            <span className="text-copper-deep">well kept.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-stone-600">
            Leases, rent and repairs for your rentals, in one calm place. Simple enough to use
            without a manual.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={`${startBtn} w-full sm:w-auto`}>
              Start free
            </Link>
            <a
              href="#try"
              className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-7 text-base font-semibold text-stone-700 transition hover:border-patina hover:text-stone-900 sm:w-auto"
            >
              Try it right here
            </a>
          </div>
        </section>

        <div className="relative mt-10 sm:mt-12">
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-[45%] bg-keep-night" />
          <div className="animate-rise relative mx-auto max-w-5xl px-4 sm:px-6">
            <div className="hidden sm:block lg:pr-40">
              <BrowserFrame
                url={brand.domain}
                label="The home screen. It says 2 things need you: a tenant who is 3 days late, and a vacant unit. Below are the rent each month, how many units are lived in, and your properties."
              >
                <OwnerHome />
              </BrowserFrame>
            </div>
            <PhoneFrame
              label="A tenant's phone. It shows their home, that they owe nothing right now, and buttons to report a problem or message their landlord."
              className="absolute -bottom-10 right-6 hidden lg:block"
            >
              <TenantHome />
            </PhoneFrame>
            <div className="flex justify-center sm:hidden">
              <PhoneFrame label="The home screen on a phone. It says 2 things need you: a tenant who is 3 days late, and a vacant unit.">
                <OwnerHome compact />
                <PhoneTabs on="Home" />
              </PhoneFrame>
            </div>
          </div>
          <div className="relative mx-auto hidden max-w-5xl justify-between px-6 pb-2 pt-14 text-sm text-stone-300 lg:flex">
            <span>What you see when you open it</span>
            <span className="w-[272px] text-center">What your tenant sees</span>
          </div>
        </div>

        {/* ── Try it: one repair, both sides ── */}
        <section id="try" className="scroll-mt-16 bg-keep-night px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              Try it. Answer a repair.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-stone-300">
              Your tenant reported a leak. Say where it stands and press send, then watch their
              phone. No more calls asking what is going on.
            </p>
          </Reveal>
          <Reveal className="mt-12" delay={120}>
            <RepairDemo tenantBar={<TenantBar />} />
          </Reveal>
        </section>

        {/* ── Two screens, and why each one exists ── */}
        <section className="bg-white px-6 py-20 sm:py-28">
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                Open it and know.
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                The first thing on the screen is what needs you today. On a good day it says nothing
                does, and you can close it and get on with your life.
              </p>
              <ul className="mt-6 space-y-3 text-lg text-stone-700">
                <Point>Late rent, with how much and how many days.</Point>
                <Point>Empty units, with what you are asking for them.</Point>
                <Point>Open repairs, one tap away.</Point>
              </ul>
            </Reveal>
            <Reveal delay={120}>
              <NeedsYouShot />
            </Reveal>
          </div>

          <div className="mx-auto mt-24 grid max-w-5xl items-center gap-12 sm:mt-32 lg:grid-cols-2 lg:gap-20">
            <Reveal className="lg:order-2">
              <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
                One page for each rental.
              </h2>
              <p className="mt-4 text-lg leading-8 text-stone-600">
                Who lives there, what they pay and when the lease ends, right at the top. The rest
                of the lease sits under it, and you change any line with a tap.
              </p>
              <ul className="mt-6 space-y-3 text-lg text-stone-700">
                <Point>Invite your tenant with only their email.</Point>
                <Point>Choose which parts of the lease they can see.</Point>
                <Point>Add details when you have them. Nothing sits empty.</Point>
              </ul>
            </Reveal>
            <Reveal className="lg:order-1" delay={120}>
              <RentalShot />
            </Reveal>
          </div>
        </section>

        {/* ── Who it is for ── */}
        <section className="px-6 py-20 sm:py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              One place for everyone at the address.
            </h2>
          </Reveal>
          <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-3">
            {AUDIENCES.map((a, i) => (
              <Reveal key={a.title} delay={i * 90} className="h-full">
                <div className="flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-patina-tint text-patina">
                    {a.icon}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold tracking-tight text-stone-900">
                    {a.title}
                  </h3>
                  <p className="mt-2 flex-1 leading-6 text-stone-600">{a.body}</p>
                  {a.link && (
                    <Link
                      href={a.link.href}
                      className="mt-4 inline-flex min-h-9 items-center font-semibold text-patina underline"
                    >
                      {a.link.label}
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── The last word ── */}
        <section className="bg-keep-night px-6 py-20 text-center sm:py-24">
          <Reveal className="mx-auto max-w-2xl">
            <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Start with one address.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg leading-8 text-stone-300">
              Adding your first rental takes about a minute.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-8 text-base font-semibold text-iron-deep transition hover:bg-copper-bright active:translate-y-px"
            >
              Start free
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-keep-night">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-7 text-sm text-stone-300">
          <span>
            © {new Date().getFullYear()} {brand.name} · {brand.tagline}
          </span>
          <span className="font-medium tracking-wide">{brand.domain}</span>
        </div>
      </footer>
    </div>
  );
}
