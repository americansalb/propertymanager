import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex flex-col items-center gap-3">
        <LogoMark className="h-14 w-14" />
        <Wordmark className="text-2xl" />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8">
        {children}
      </div>
    </main>
  );
}
