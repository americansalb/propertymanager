import Link from "next/link";
import { brand } from "@/lib/brand";
import { LogoMark } from "@/components/brand/logo-mark";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mx-auto max-w-2xl text-center">
        <LogoMark className="mx-auto mb-6 h-24 w-24" />
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-copper-deep">
          {brand.domain}
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
          {brand.name}
        </h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">{brand.tagline}</p>
        <p className="mt-2 text-stone-500">
          Collect rent, handle maintenance, and hire verified local pros - with payment
          held safely until the job is done.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-iron px-5 py-2.5 text-sm font-semibold text-white hover:bg-iron-deep"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-stone-400"
          >
            Sign in
          </Link>
        </div>
      </div>
      <footer className="absolute bottom-6 text-xs text-stone-400">
        © {new Date().getFullYear()} {brand.name}
      </footer>
    </main>
  );
}
