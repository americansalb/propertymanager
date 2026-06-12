import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/authz";

export const metadata = { title: "Pro dashboard" };

export default async function ProDashboard() {
  const session = await requireRole("PRO", "/pro/dashboard");
  const profile = await prisma.proProfile.findUnique({
    where: { userId: session.userId },
    select: { businessName: true, status: true },
  });

  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-2xl font-semibold text-stone-900">{profile?.businessName}</h1>
      <p className="mt-2 text-sm text-stone-500">
        Your pro account is saved. Verification, the lead feed, and bidding open with the
        marketplace launch - we&apos;ll email you the moment onboarding is available.
      </p>
      <span className="mt-6 inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
        Profile status: {profile?.status ?? "DRAFT"}
      </span>
    </div>
  );
}
