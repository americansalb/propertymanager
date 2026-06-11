import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/authz";
import { defaultPortal } from "@/lib/authz/roles";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  const { next } = await searchParams;
  if (session) redirect(next || defaultPortal(session.roles, session.activeRole));

  return (
    <>
      <h1 className="mb-1 text-xl font-semibold text-stone-900">Welcome back</h1>
      <p className="mb-6 text-sm text-stone-500">Sign in to your account.</p>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-stone-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-emerald-700 hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
