import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/authz";
import { StepMark } from "@/components/ui";

export const metadata = { title: "Home" };

export default async function ProDashboard() {
  const session = await requireRole("PRO", "/pro/dashboard");
  const profile = await prisma.proProfile.findUnique({
    where: { userId: session.userId },
    select: { businessName: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm text-stone-500">Hello, {session.firstName}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">
        {profile?.businessName ?? "Your business"}
      </h1>

      <section className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
        <ol className="space-y-4">
          <li className="flex gap-3">
            <StepMark done />
            <div>
              <p className="font-medium text-stone-900">Your account is saved</p>
              <p className="text-sm text-stone-500">There is nothing else to do right now.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <StepMark />
            <div>
              <p className="font-medium text-stone-900">Repair jobs open</p>
              <p className="text-sm text-stone-500">
                We email {session.email} the day you can set up your page and start getting
                requests.
              </p>
            </div>
          </li>
        </ol>
      </section>
    </div>
  );
}
