import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/authz";
import { defaultPortal } from "@/lib/authz/roles";
import { SignupForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect(defaultPortal(session.roles, session.activeRole));

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-stone-900">Create your account</h1>
      <p className="mb-6 text-sm text-stone-500">
        Tenants join via an invitation from their landlord.
      </p>
      <SignupForm />
      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-emerald-700 hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
