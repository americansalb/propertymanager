import { brand } from "@/lib/brand";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="mx-auto max-w-2xl text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-emerald-700">
          {brand.domain}
        </p>
        <h1 className="text-5xl font-semibold tracking-tight text-stone-900 sm:text-6xl">
          {brand.name}
        </h1>
        <p className="mt-6 text-lg leading-8 text-stone-600">{brand.tagline}</p>
        <p className="mt-2 text-stone-500">
          Collect rent, handle maintenance, and hire verified local pros — with payment
          held safely until the job is done.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <span className="rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white opacity-60">
            Launching soon
          </span>
        </div>
      </div>
      <footer className="absolute bottom-6 text-xs text-stone-400">
        © {new Date().getFullYear()} {brand.name}
      </footer>
    </main>
  );
}
