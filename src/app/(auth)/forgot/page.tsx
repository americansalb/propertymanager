import Link from "next/link";
import { ForgotForm } from "@/components/auth/password-reset-forms";

export const metadata = { title: "Forgot your password" };

export default async function ForgotPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Forgot your password?</h1>
      <p className="mb-5 mt-1 text-stone-600">We will email you a link to set a new one.</p>
      <ForgotForm initialEmail={email} />
      <p className="mt-6 text-center text-stone-600">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-patina underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
