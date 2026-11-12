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
      <h1 className="mb-5 text-2xl font-semibold tracking-tight text-stone-900">Sign in</h1>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-stone-600">
        New here?{" "}
        <Link href="/signup" className="font-medium text-patina underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
