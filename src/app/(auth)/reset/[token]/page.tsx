import Link from "next/link";
import { previewReset } from "@/lib/services/password-reset";
import { ResetForm } from "@/components/auth/password-reset-forms";
import { buttonCls } from "@/components/ui";

// A private link: never something a search engine should keep.
export const metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const preview = await previewReset(token);

  if (!preview.ok) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          This link no longer works
        </h1>
        <p className="mt-2 text-stone-600">
          Links work once, for one hour, and only the newest one counts.
        </p>
        <Link href="/forgot" className={`${buttonCls("primary")} mt-6 min-h-12 w-full`}>
          Email me a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
        Set a new password
      </h1>
      <p className="mb-5 mt-1 text-stone-600">Hi {preview.firstName}. Choose your new password.</p>
      <ResetForm token={token} />
    </>
  );
}
