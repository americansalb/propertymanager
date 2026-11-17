import Link from "next/link";
import { confirmEmailToken } from "@/lib/services/email-verify";
import { buttonCls } from "@/components/ui";

export const metadata = { title: "Confirm your email", robots: { index: false } };

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await confirmEmailToken(token);

  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        {result.ok ? "Your email is confirmed" : "This link no longer works"}
      </h1>
      <p className="mt-2 text-stone-600">
        {result.ok
          ? `Thanks, ${result.firstName}. That step is done.`
          : "Links work for 24 hours, and only the newest one counts. Sign in to send a new one."}
      </p>
      <Link href="/login" className={`${buttonCls("primary")} mt-6 min-h-12 w-full`}>
        {result.ok ? "Continue" : "Sign in"}
      </Link>
    </div>
  );
}
