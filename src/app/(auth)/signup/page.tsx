import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/authz";
import { defaultPortal } from "@/lib/authz/roles";
import { brand } from "@/lib/brand";
import { SignupWizard } from "@/components/auth/signup-wizard";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect(defaultPortal(session.roles, session.activeRole));

  return (
    <>
      <SignupWizard brandName={brand.name} brandDomain={brand.domain} />
      <p className="mt-6 text-center text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-copper-deep hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
