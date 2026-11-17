import Link from "next/link";
import { LogoMark } from "@/components/brand/logo-mark";
import { Wordmark } from "@/components/brand/wordmark";

/** The header on public pages that are not the home page. */
export function PublicHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark className="h-9 w-9 shrink-0" />
          <Wordmark className="text-lg sm:text-xl" />
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-[15px] font-medium text-stone-700 hover:text-stone-900"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-11 items-center rounded-xl bg-keep-deep px-4 text-[15px] font-semibold text-white transition hover:bg-patina"
          >
            Get started
          </Link>
        </nav>
      </div>
    </header>
  );
}
