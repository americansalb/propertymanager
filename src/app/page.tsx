import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";
import { IconChevronRight } from "@/components/icons";
import { Reveal } from "@/components/landing/reveal";
import { RepairDemo } from "@/components/landing/repair-demo";
import { HeroStory } from "@/components/landing/hero-story";
import { BrowserFrame, PhoneFrame } from "@/components/landing/frames";
import { OwnerBar, OwnerHome, TenantBar, TenantHome } from "@/components/landing/shots";

/**
 * The landing page answers two questions, in this order: why VillageKeep is
 * different (a repair gets priced by your own people before you lift a
 * finger), and what it costs (nothing). Flat color, strong contrast, no
 * textures or glows. The fun is in things that move and things you can
 * touch. Everything pictured is built.
 */

const startBtn =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-keep-deep px-7 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-patina active:translate-y-0";

/** A leak at night, told twice. The times are the story. */
const USUAL = [
  { at: "10:02 PM", text: "Your tenant texts you a photo of a puddle." },
  { at: "10:15 PM", text: "You call your plumber. Voicemail." },
  { at: "Next day", text: "You call two more. One calls back." },
  { at: "Day 2", text: "You get one price over the phone. Is it fair? No idea." },
  { at: "Day 3", text: "Your tenant asks for an update. Again." },
];
const OURS = [
  { at: "10:02 PM", text: "Your tenant reports the leak, with what a plumber needs to know." },
  { at: "10:02 PM", text: "Your plumbers get a link asking for a price. No app, no account." },
  { at: "10:40 PM", text: "Both prices are in, side by side, the lowest marked." },
  { at: "7:15 AM", text: "You tap yes over coffee. Your tenant sees who is coming." },
];

const WHY = [
  {
    title: "Your people first",
    body: "The plumber, locksmith and handyman you already trust are asked before anyone else.",
  },
  {
    title: "Your limits",
    body: "Set an amount for each person. A price under it is approved without you. Over it, you decide.",
  },
  {
    title: "Your money",
    body: "You pay them the way you always have. VillageKeep never holds your money.",
  },
];

/** Everything here is built and costs nothing. */
const FREE = [
  "Every property and unit you own",
  "Leases with rent, dates, deposits and fees",
  "A home page for each tenant",
  "Repair requests from your tenants' phones",
  "Your own repair people, asked for prices by themselves",
  "Prices side by side, and limits that say yes for you",
  "Messages with your tenants",
  "What is due, and who is late",
];

const AUDIENCES = [
  {
    title: "You own rentals",
    body: "Add an address, then your tenant. The lease, the rent and the repairs are kept for you from there.",
    href: "/signup",
    action: "Start free",
  },
  {
    title: "You rent your home",
    body: "Your landlord sends you a link. You see your lease and what you owe, and you report problems from your phone.",
    href: "/login",
    action: "Sign in",
  },
  {
    title: "You fix things for a living",
    body: "Plumbers, electricians and handymen can get on the list for local repair jobs.",
    href: "/signup",
    action: "Get on the list",
  },
];

function Tick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden="true">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Without scripts, nothing waits to be revealed. */}
      <noscript>
        <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-10 w-10 shrink-0 sm:h-11 sm:w-11" />
            <Wordmark className="text-xl sm:text-2xl" />
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
        {/* ── Hero: the difference in one sentence, then watch it happen ── */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 overflow-x-clip px-6 pb-16 pt-12 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16 lg:pb-24">
          <div className="animate-rise text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full bg-patina-tint px-3.5 py-1.5 text-sm font-semibold text-patina">
              <Tick className="h-3.5 w-3.5" />
              Free for landlords
            </p>
            <h1 className="font-brand mt-5 text-[44px] font-semibold leading-[1.02] tracking-tight text-stone-900 [text-wrap:balance] sm:text-6xl lg:text-[68px]">
              Your tenant reports it.{" "}
              <span className="block sm:inline">Your plumber prices it.</span>{" "}
              <span className="block text-copper-deep">You tap yes.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-stone-600 lg:mx-0">
              VillageKeep keeps your leases, rent and repairs in one place. When something breaks,
              the repair people you already trust are asked for a price right away, and you pick
              one.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/signup" className={`${startBtn} w-full sm:w-auto`}>
                Start free
              </Link>
              <a
                href="#try"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border-2 border-stone-300 px-7 text-base font-semibold text-stone-800 transition hover:border-patina hover:text-stone-900 sm:w-auto"
              >
                Try it right here
              </a>
            </div>
            <p className="mt-4 text-sm text-stone-500">
              No card needed. Your plumber needs no app.
            </p>
          </div>

          <div className="relative mx-auto">
            <div
              aria-hidden="true"
              className="absolute -inset-x-10 bottom-8 top-14 rounded-[3rem] bg-patina-tint sm:-inset-x-16"
            />
            <div
              aria-hidden="true"
              className="absolute -right-4 top-6 h-20 w-20 rounded-full bg-copper sm:-right-10"
            />
            <div className="relative">
              <HeroStory bar={<OwnerBar />} />
            </div>
          </div>
        </section>

        {/* ── Why it is different: the same leak, two ways ── */}
        <section className="bg-patina-tint px-6 py-20 sm:py-28">
          <div className="mx-auto max-w-5xl">
            <Reveal className="max-w-2xl">
              <h2 className="font-brand text-4xl font-semibold leading-[1.05] tracking-tight text-stone-900 [text-wrap:balance] sm:text-5xl">
                A leak at 10 at night, two ways.
              </h2>
            </Reveal>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Reveal>
                <div className="h-full rounded-3xl bg-white p-6 sm:p-8">
                  <p className="text-lg font-semibold text-stone-500">The usual way</p>
                  <ol className="mt-5 space-y-4">
                    {USUAL.map((s, i) => (
                      <li key={i} className="grid grid-cols-[5.5rem_1fr] gap-3">
                        <span className="font-brand pt-0.5 text-[15px] font-semibold text-stone-400">
                          {s.at}
                        </span>
                        <span className="text-[17px] leading-6 text-stone-700">{s.text}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="font-brand mt-7 border-t border-stone-200 pt-5 text-2xl font-semibold tracking-tight text-stone-500">
                    Three days. One price. No idea if it was fair.
                  </p>
                </div>
              </Reveal>
              <Reveal delay={120}>
                <div className="h-full rounded-3xl bg-keep-night p-6 text-white sm:p-8">
                  <p className="text-lg font-semibold text-copper-bright">With VillageKeep</p>
                  <ol className="mt-5 space-y-4">
                    {OURS.map((s, i) => (
                      <li key={i} className="grid grid-cols-[5.5rem_1fr] gap-3">
                        <span className="font-brand pt-0.5 text-[15px] font-semibold text-patina-bright">
                          {s.at}
                        </span>
                        <span className="text-[17px] leading-6 text-white">{s.text}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="font-brand mt-7 border-t border-white/15 pt-5 text-2xl font-semibold tracking-tight text-white">
                    One night. Two prices. <span className="text-copper-bright">You chose.</span>
                  </p>
                </div>
              </Reveal>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-3">
              {WHY.map((w, i) => (
                <Reveal key={w.title} delay={i * 90}>
                  <h3 className="font-brand text-2xl font-semibold tracking-tight text-stone-900">
                    {w.title}
                  </h3>
                  <p className="mt-2 text-[17px] leading-7 text-stone-700">{w.body}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── Try it: one repair, both sides ── */}
        <section id="try" className="scroll-mt-16 bg-keep-night px-4 pb-24 pt-20 sm:px-6 sm:pt-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-brand text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Your turn. Answer a repair.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-stone-300">
              Your tenant reported a leak. Say where it stands and press send, then watch their
              phone.
            </p>
          </Reveal>
          <Reveal className="mt-12" delay={120}>
            <RepairDemo tenantBar={<TenantBar />} />
          </Reveal>
        </section>

        {/* ── What it costs: nothing, and here is everything that includes ── */}
        <section className="bg-copper px-6 py-20 text-[#10261f] sm:py-28">
          <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
            <Reveal className="relative">
              <h2 className="font-brand text-7xl font-bold leading-[0.95] tracking-tight sm:text-8xl">
                Free.
              </h2>
              <p className="mt-5 max-w-sm text-xl leading-8">
                Everything on this list costs you nothing. No card, no trial clock.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#10261f] px-7 text-base font-semibold text-white transition hover:-translate-y-0.5 hover:bg-keep-deep active:translate-y-0"
              >
                Start free
              </Link>
              <span
                aria-hidden="true"
                className="sticker font-brand absolute -top-6 right-0 flex h-28 w-28 -rotate-[8deg] flex-col items-center justify-center rounded-full bg-white text-[#10261f] shadow-[0_10px_24px_-12px_rgba(16,38,31,0.6)] sm:right-6 lg:-right-2"
              >
                <span className="text-4xl font-bold leading-none">$0</span>
                <span className="mt-1 text-sm font-semibold">a month</span>
              </span>
            </Reveal>
            <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {FREE.map((f, i) => (
                <Reveal key={f} delay={i * 60}>
                  <li className="flex items-start gap-3 text-lg font-medium leading-7">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#10261f] text-white">
                      <Tick className="h-3.5 w-3.5" />
                    </span>
                    {f}
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* ── The rest of the office ── */}
        <section className="bg-white px-6 pt-20 sm:pt-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-brand text-4xl font-semibold tracking-tight text-stone-900 [text-wrap:balance] sm:text-5xl">
              And the rest of your rentals, kept.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-stone-600">
              Open it and the first thing you see is what needs you today. On a good day, it says
              nothing does.
            </p>
          </Reveal>
          <div className="relative mt-12">
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 top-[55%] bg-patina-tint" />
            <Reveal className="relative mx-auto max-w-5xl pb-16">
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
                className="absolute bottom-6 right-6 hidden lg:block"
              >
                <TenantHome />
              </PhoneFrame>
              <div className="flex justify-center sm:hidden">
                <PhoneFrame label="A tenant's phone. It shows their home, that they owe nothing right now, and buttons to report a problem or message their landlord.">
                  <TenantHome />
                </PhoneFrame>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Who it is for: three plain statements, each a way in ── */}
        <section className="bg-patina-tint px-6 pb-20 pt-8 sm:pb-28">
          <div className="mx-auto max-w-5xl">
            <div className="border-t border-stone-300">
              {AUDIENCES.map((a, i) => (
                <Reveal key={a.title} delay={i * 90}>
                  <Link
                    href={a.href}
                    className="group grid gap-x-10 gap-y-3 border-b border-stone-300 py-8 transition hover:bg-white/60 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] sm:px-5 sm:py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_11rem] lg:items-baseline"
                  >
                    <h3 className="font-brand text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
                      {a.title}
                    </h3>
                    <p className="text-lg leading-8 text-stone-700">{a.body}</p>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap text-lg font-semibold text-patina sm:col-start-2 lg:col-start-3 lg:justify-end">
                      {a.action}
                      <IconChevronRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── The last word: the keep, standing on the ground line ── */}
        <section className="overflow-hidden bg-keep-night px-6">
          <div className="mx-auto grid max-w-5xl items-end gap-x-10 lg:grid-cols-2">
            <Reveal className="pb-12 pt-20 text-center sm:pt-28 lg:pb-28 lg:text-left">
              <h2 className="font-brand text-5xl font-semibold tracking-tight text-white sm:text-6xl sm:leading-[1.02]">
                Start with one address.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-stone-300 lg:mx-0">
                Adding your first rental takes about a minute. Adding your plumber takes less.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-copper px-8 text-base font-semibold text-iron-deep transition hover:-translate-y-0.5 hover:bg-copper-bright active:translate-y-0"
              >
                Start free
              </Link>
            </Reveal>
            {/* The drawing leaves a sliver under the keep; the shift down puts its
                foot exactly on the line where the footer begins. */}
            <Reveal className="flex justify-center lg:justify-end" delay={120}>
              <LogoMark
                tone="dark"
                className="h-64 w-64 translate-y-[6.2%] sm:h-80 sm:w-80 lg:h-[27rem] lg:w-[27rem]"
              />
            </Reveal>
          </div>
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
