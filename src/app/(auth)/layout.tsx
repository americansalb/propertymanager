import Link from "next/link";
import { brand } from "@/lib/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <Link href="/" className="mb-8 text-2xl font-semibold tracking-tight text-stone-900">
        {brand.name}
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        {children}
      </div>
      <p className="mt-6 text-xs text-stone-400">{brand.tagline}</p>
    </main>
  );
}
